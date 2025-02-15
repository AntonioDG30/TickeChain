import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Button, Alert, Form, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { ticketManagerContract, paymentManagerContract, eventFactoryContract, provider } from "../utils/contracts";
import "../custom.css";

const EventVerification = () => {
  const [scannedData, setScannedData] = useState(null);
  const [isValid, setIsValid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrFile, setQrFile] = useState(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });

    scanner.render(
      (decodedText) => handleScan(decodedText),
      (errorMessage) => console.warn("Errore scanner:", errorMessage)
    );

    return () => scanner.clear();
  }, []);

  const handleFileChange = async (event) => {
    if (event.target.files.length === 0) return;
  
    const imageFile = event.target.files[0];
  
    const allowedFormats = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedFormats.includes(imageFile.type)) {
      toast.error("❌ Formato file non supportato! Usa PNG o JPG.");
      return;
    }
  
    setQrFile(imageFile);
  
    try {
      let qrReaderElement = document.getElementById("qr-reader-file");
      if (!qrReaderElement) {
        qrReaderElement = document.createElement("div");
        qrReaderElement.id = "qr-reader-file";
        document.body.appendChild(qrReaderElement);
      }
  
      const html5QrCode = new Html5Qrcode("qr-reader-file");
  
      console.log("📂 File selezionato:", imageFile.name);
      console.log("🔍 Tentativo di lettura QR Code dall'immagine...");
  
      const result = await html5QrCode.scanFile(imageFile, false);
      console.log("✅ QR Code letto con successo:", result);
      handleScan(result);
    } catch (error) {
      console.error("❌ Errore nella scansione dell'immagine:", error);
      toast.error("❌ Impossibile leggere il QR Code dall'immagine! Assicurati che il QR sia ben visibile.");
    }
  };
  
  const handleScan = async (result) => {
    if (!result) return;
  
    try {
      const { ticketId, message, signature } = JSON.parse(result);
      const signerAddress = ethers.verifyMessage(message, signature);
  
      setScannedData({ ticketId, signerAddress });
  
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress(); // Otteniamo l'account che sta verificando
      const ticketManagerWithSigner = ticketManagerContract.connect(signer);
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);
  
      // ✅ Recuperiamo l'ID dell'evento associato al biglietto
      const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);
      console.log("🎟️ Evento associato al biglietto:", eventId.toString());
  
      // ✅ Recuperiamo il creatore dell'evento
      const eventDetails = await eventFactoryWithSigner.events(eventId);
      const eventCreator = eventDetails.creator;
      console.log("👤 Creatore dell'evento:", eventCreator);
  
      // ✅ Verifica se l'account dell'utente è il creatore dell'evento
      if (userAddress.toLowerCase() !== eventCreator.toLowerCase()) {
        console.error("❌ Non sei il creatore di questo evento!");
        toast.error("❌ Solo il creatore dell'evento può verificare i biglietti!");
        setIsValid(false);
        return;
      }
  
      // ✅ Controlla se il biglietto è già stato verificato
      const isAlreadyVerified = await ticketManagerWithSigner.isTicketVerified(ticketId);
      if (isAlreadyVerified) {
        console.warn("⚠️ Questo biglietto è già stato verificato!");
        toast.warn("⚠️ Questo biglietto è già stato verificato! Non può essere riutilizzato.");
        setIsValid(false);
        return;
      }
  
      toast.success(`✅ Biglietto #${ticketId} verificato con successo!`);
      setIsValid(true);
  
      await releaseFunds(ticketId);
    } catch (error) {
      console.error("❌ Errore nella verifica della firma:", error);
      toast.error("❌ Firma non valida! Il biglietto potrebbe essere falso.");
      setIsValid(false);
    }
  };
  
  
  

  const releaseFunds = async (ticketId) => {
    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const paymentManagerWithSigner = paymentManagerContract.connect(signer);
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);
      const ticketManagerWithSigner = ticketManagerContract.connect(signer);
  
      const isAlreadyVerified = await ticketManagerWithSigner.isTicketVerified(ticketId);
      if (isAlreadyVerified) {
        console.error("❌ Questo biglietto è già stato verificato!");
        toast.error("❌ Questo biglietto è già stato verificato!");
        return;
      }
  
      const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);
      console.log("🎟️ Evento associato al biglietto:", eventId.toString());
  
      const eventDetails = await eventFactoryWithSigner.events(eventId);
      const creatorAddress = eventDetails.creator;
      console.log("👤 Creatore evento:", creatorAddress);
  
      if (creatorAddress === ethers.ZeroAddress) {
        toast.error("❌ Creatore dell'evento non trovato!");
        return;
      }
  
      const releaseAmount = eventDetails.price ? ethers.formatEther(eventDetails.price) : "0";
      console.log("💰 Importo da rilasciare:", releaseAmount);
  
      const contractBalance = await provider.getBalance(paymentManagerContract.target);
      console.log("💰 Saldo PaymentManager:", ethers.formatEther(contractBalance));
  
      if (BigInt(ethers.parseEther(releaseAmount)) > BigInt(contractBalance)) {
        toast.error("❌ Fondi insufficienti nel contratto per il pagamento!");
        return;
      }
  
      console.log("✅ Marcatura del biglietto come verificato...");
      const markTx = await ticketManagerWithSigner.markTicketAsVerified(ticketId);
      await markTx.wait();
  
      console.log("📤 Trasferimento fondi...");
      const tx = await paymentManagerWithSigner.releaseFundsToCreator(
        creatorAddress,
        ethers.parseEther(releaseAmount),
        { gasLimit: 500000 }
      );
  
      await tx.wait();
      console.log("✅ Fondi trasferiti con successo!");
      toast.success("✅ Pagamento effettuato al creatore dell'evento!");
  
    } catch (error) {
      console.error("❌ Errore nel rilascio dei fondi:", error);
      toast.error("❌ Errore nel trasferimento dei fondi!");
    } finally {
      setLoading(false);
    }
  };
  
  

  return (
    <div className="verification-container text-center">
      <h2 className="title-shadow">🔍 Scansiona il QR Code</h2>

      <div className="neu-card p-4 mt-3">
        <div id="qr-reader" className="qr-box"></div>  
        <div id="qr-reader-file" style={{ display: "none" }}></div>
        <Form.Group controlId="formFile" className="mt-3">
          <Form.Label>📂 Carica immagine con QR Code:</Form.Label>
          <Form.Control type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
        </Form.Group>
      </div>
      {loading && <Spinner animation="border" className="d-block mx-auto my-3" />}
      {scannedData && (
        <Alert variant={isValid ? "success" : "danger"} className="mt-3">
          {isValid ? `✅ Biglietto #${scannedData.ticketId} verificato!` : "❌ Firma non valida!"}
        </Alert>
      )}
    </div>
  );
};

export default EventVerification;
