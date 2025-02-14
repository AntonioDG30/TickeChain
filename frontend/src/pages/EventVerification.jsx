import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Button, Alert, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { eventFactoryContract, paymentManagerContract, provider } from "../utils/contracts";

const EventVerification = () => {
  const [scannedData, setScannedData] = useState(null);
  const [isValid, setIsValid] = useState(null);
  const [qrFile, setQrFile] = useState(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });

    scanner.render(
      (decodedText) => handleScan(decodedText),
      (errorMessage) => console.warn("Errore scanner:", errorMessage)
    );

    return () => scanner.clear();
  }, []);

  // 🔹 Funzione per gestire la scansione live
  const handleScan = async (result) => {
    if (result) {
      try {
        const { ticketId, message, signature } = JSON.parse(result);
        const signerAddress = ethers.verifyMessage(message, signature);

        setScannedData({ ticketId, signerAddress });

        toast.success(`✅ Biglietto #${ticketId} verificato con successo!`);
        setIsValid(true);

        // 🔹 Chiama la funzione per rilasciare i fondi al creatore dell'evento
        await releaseFunds(ticketId);
      } catch (error) {
        console.error("❌ Errore nella verifica:", error);
        toast.error("❌ Firma non valida! Il biglietto potrebbe essere falso.");
        setIsValid(false);
      }
    }
  };

  // 🔹 Funzione per caricare un'immagine contenente il QR Code
  const handleFileChange = async (event) => {
    if (event.target.files.length === 0) return;

    const imageFile = event.target.files[0];
    setQrFile(imageFile);

    try {
      const html5QrCode = new Html5Qrcode("qr-reader-file");
      const result = await html5QrCode.scanFile(imageFile, false);
      
      handleScan(result);
    } catch (error) {
      console.error("❌ Errore nella scansione dell'immagine:", error);
      toast.error("❌ Impossibile leggere il QR Code dall'immagine!");
    }
  };

  // 🔹 Funzione per rilasciare i fondi al creatore dell'evento dopo la verifica
  const releaseFunds = async (ticketId) => {
    try {
      toast.info("💰 Rilascio fondi al creatore in corso...");
  
      const signer = await provider.getSigner();
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);
      const paymentManagerWithSigner = paymentManagerContract.connect(signer);
  
      console.log("📡 Recupero dettagli evento...");
      const eventId = ticketId;
  
      // ✅ Recuperiamo i dettagli dell'evento in modo più sicuro
      let eventDetails;
      try {
        eventDetails = await eventFactoryWithSigner.events(eventId);
      } catch (error) {
        console.error("❌ Errore nel recupero dell'evento:", error);
        toast.error("❌ Errore nel recupero dell'evento!");
        return;
      }
  
      if (!eventDetails || eventDetails.creator === ethers.ZeroAddress) {
        console.error("❌ Errore: Evento non trovato o indirizzo creatore non valido!");
        toast.error("❌ Evento inesistente o dati mancanti!");
        return;
      }
  
      const eventCreator = eventDetails.creator;
      const ticketPrice = eventDetails.price;
  
      console.log("👤 Creatore evento:", eventCreator);
      console.log("💰 Importo da rilasciare:", ticketPrice.toString());
  
      if (BigInt(ticketPrice) === BigInt(0)) {
        console.error("❌ Importo del biglietto non valido!");
        toast.error("❌ Il prezzo del biglietto è 0, impossibile rilasciare fondi!");
        return;
      }
  
      // ✅ Controllo se il contratto ha fondi sufficienti
      const contractBalance = await provider.getBalance(paymentManagerContract.target);
      console.log("💰 Saldo PaymentManager:", ethers.formatEther(contractBalance));
  
      if (BigInt(ticketPrice) > BigInt(contractBalance)) {
        console.error("❌ Fondi insufficienti nel contratto!");
        toast.error("❌ Il contratto non ha abbastanza ETH per pagare!");
        return;
      }
  
      // ✅ Chiamata sicura alla funzione
      console.log("📤 Trasferimento fondi...");
      const tx = await paymentManagerWithSigner.releaseFundsToCreator(eventCreator, ticketPrice);
      await tx.wait();
  
      toast.success("✅ Fondi rilasciati con successo!");
    } catch (error) {
      console.error("❌ Errore nel rilascio dei fondi:", error);
      toast.error("❌ Errore durante il trasferimento dei fondi!");
    }
  };
  

  return (
    <div className="container mt-4">
      <h2 className="text-center">🔍 Verifica il Biglietto</h2>

      {/* Scanner Live QR Code */}
      <div id="qr-reader" className="mt-3"></div>

      {/* Carica un'immagine per la verifica */}
      <Form.Group className="mt-4">
        <Form.Label>📂 Oppure carica un'immagine con QR Code</Form.Label>
        <Form.Control type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
      </Form.Group>

      {/* Risultato della verifica */}
      {scannedData && (
        <Alert variant={isValid ? "success" : "danger"} className="mt-3">
          {isValid
            ? `✅ Biglietto #${scannedData.ticketId} verificato con successo!`
            : "❌ Firma non valida! Il biglietto potrebbe essere falso."}
        </Alert>
      )}
    </div>
  );
};

export default EventVerification;
