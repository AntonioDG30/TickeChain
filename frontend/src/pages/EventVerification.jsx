// Importazione delle librerie principali di React e degli strumenti per interagire con Ethereum
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

// Importazione dei componenti di Bootstrap per il layout e l'interfaccia utente
import { Button, Alert, Form, Spinner } from "react-bootstrap";

// Importazione della libreria di notifiche per mostrare messaggi utente
import { toast } from "react-toastify";

// Importazione delle librerie per la scansione e decodifica di QR Code
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";

// Importazione degli smart contract per interagire con la blockchain
import { ticketManagerContract, paymentManagerContract, eventFactoryContract, provider } from "../utils/contracts";

// Importazione del file CSS personalizzato per la stilizzazione della UI
import "../custom.css";

/**
 * @function EventVerification
 * @description Componente per la verifica dei biglietti tramite scansione di QR Code.
 * @returns {JSX.Element} Interfaccia utente per la verifica degli eventi tramite QR Code.
 */
const EventVerification = () => {
  // Stato per memorizzare i dati del QR Code scansionato
  const [scannedData, setScannedData] = useState(null);

  // Stato per indicare se il biglietto è valido o meno
  const [isValid, setIsValid] = useState(null);

  // Stato per gestire il caricamento durante la verifica del biglietto
  const [loading, setLoading] = useState(false);

  // Stato per memorizzare il file QR caricato manualmente
  const [qrFile, setQrFile] = useState(null);

  /**
   * @function useEffect
   * @description Inizializza lo scanner per la lettura di QR Code quando il componente viene montato.
   */
  useEffect(() => {
    // Inizializza lo scanner del QR Code con una frequenza di 10 FPS e una dimensione di 250px per il riquadro
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });

    // Avvia il processo di scansione e chiama `handleScan` quando un QR Code viene rilevato
    scanner.render(
      (decodedText) => handleScan(decodedText),
      (errorMessage) => console.warn("Errore scanner:", errorMessage)
    );

    // Cleanup: rimuove lo scanner quando il componente viene smontato
    return () => scanner.clear();
  }, []);

  /**
   * @function handleFileChange
   * @description Gestisce il caricamento di un'immagine contenente un QR Code e tenta di decodificarlo.
   * @param {Event} event - Evento del file input.
   */
  const handleFileChange = async (event) => {
    if (event.target.files.length === 0) return;

    const imageFile = event.target.files[0];

    // Formati di immagine supportati
    const allowedFormats = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedFormats.includes(imageFile.type)) {
      toast.error("❌ Formato file non supportato! Usa PNG o JPG.");
      return;
    }

    setQrFile(imageFile);

    try {
      // Crea un elemento HTML per la scansione del QR Code da file
      let qrReaderElement = document.getElementById("qr-reader-file");
      if (!qrReaderElement) {
        qrReaderElement = document.createElement("div");
        qrReaderElement.id = "qr-reader-file";
        document.body.appendChild(qrReaderElement);
      }

      // Inizializza l'oggetto `Html5Qrcode` per la scansione del file
      const html5QrCode = new Html5Qrcode("qr-reader-file");

      // Scansiona il file immagine e ottiene il valore del QR Code
      const result = await html5QrCode.scanFile(imageFile, false);

      // Processa il testo ottenuto dal QR Code
      handleScan(result);
    } catch (error) {
      console.error("❌ Errore nella scansione dell'immagine:", error);
      toast.error("❌ Impossibile leggere il QR Code dall'immagine! Assicurati che il QR sia ben visibile.");
    }
  };
  
  /**
   * @function handleScan
   * @description Gestisce la scansione e verifica dell'autenticità di un biglietto tramite firma crittografica.
   * @param {string} result - Stringa JSON contenente le informazioni del biglietto scansionato.
   */
  const handleScan = async (result) => {
    if (!result) return; // Se il risultato è vuoto, esce dalla funzione

    try {
        // Estrae le informazioni dal QR Code scansionato
        const { ticketId, message, signature } = JSON.parse(result);

        // Verifica la firma del messaggio per ottenere l'indirizzo del proprietario del biglietto
        const signerAddress = ethers.verifyMessage(message, signature);

        // Salva i dati scansionati nello stato
        setScannedData({ ticketId, signerAddress });

        // Ottiene il signer dell'utente per eseguire operazioni firmate sulla blockchain
        const signer = await provider.getSigner();

        // Recupera l'indirizzo dell'utente connesso
        const userAddress = await signer.getAddress();

        // Connettiamo i contratti con il signer per effettuare transazioni
        const ticketManagerWithSigner = ticketManagerContract.connect(signer);
        const eventFactoryWithSigner = eventFactoryContract.connect(signer);

        // Recupera l'ID dell'evento associato al biglietto scansionato
        const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);

        // Recupera i dettagli dell'evento dalla blockchain
        const eventDetails = await eventFactoryWithSigner.events(eventId);
        const eventCreator = eventDetails.creator;

        // Controlla che l'utente connesso sia il creatore dell'evento
        if (userAddress.toLowerCase() !== eventCreator.toLowerCase()) {
            console.error("❌ Non sei il creatore di questo evento!");
            toast.error("❌ Solo il creatore dell'evento può verificare i biglietti!");
            setIsValid(false);
            return;
        }

        // Controlla se il biglietto è già stato verificato
        const isAlreadyVerified = await ticketManagerWithSigner.isTicketVerified(ticketId);
        if (isAlreadyVerified) {
            console.warn("⚠️ Questo biglietto è già stato verificato!");
            toast.warn("⚠️ Questo biglietto è già stato verificato! Non può essere riutilizzato.");
            setIsValid(false);
            return;
        }

        // Mostra un messaggio di successo nella UI
        toast.success(`✅ Biglietto #${ticketId} verificato con successo!`);
        setIsValid(true);

        // Rilascia i fondi all'organizzatore dell'evento dopo la verifica
        await releaseFunds(ticketId);
    } catch (error) {
        console.error("❌ Errore nella verifica della firma:", error);
        toast.error("❌ Firma non valida! Il biglietto potrebbe essere falso.");
        setIsValid(false);
    }
  };

  /**
   * @function releaseFunds
   * @description Rilascia i fondi al creatore dell'evento dopo che un biglietto è stato verificato.
   * @param {number} ticketId - ID del biglietto verificato.
   */
  const releaseFunds = async (ticketId) => {
    setLoading(true); // Attiva lo stato di caricamento

    try {
        // Ottiene il signer dell'utente per eseguire operazioni firmate sulla blockchain
        const signer = await provider.getSigner();

        // Connettiamo i contratti con il signer per effettuare transazioni
        const paymentManagerWithSigner = paymentManagerContract.connect(signer);
        const eventFactoryWithSigner = eventFactoryContract.connect(signer);
        const ticketManagerWithSigner = ticketManagerContract.connect(signer);

        // Controlla se il biglietto è già stato verificato
        const isAlreadyVerified = await ticketManagerWithSigner.isTicketVerified(ticketId);
        if (isAlreadyVerified) {
            console.error("❌ Questo biglietto è già stato verificato!");
            toast.error("❌ Questo biglietto è già stato verificato!");
            return;
        }

        // Recupera l'ID dell'evento associato al biglietto
        const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);

        // Recupera i dettagli dell'evento dalla blockchain
        const eventDetails = await eventFactoryWithSigner.events(eventId);
        const creatorAddress = eventDetails.creator;

        // Verifica che il creatore dell'evento sia valido
        if (creatorAddress === ethers.ZeroAddress) {
            toast.error("❌ Creatore dell'evento non trovato!");
            return;
        }

        // Recupera il prezzo del biglietto in ETH e converte il valore
        const releaseAmount = eventDetails.price ? ethers.formatEther(eventDetails.price) : "0";

        // Controlla il saldo del contratto `PaymentManager`
        const contractBalance = await provider.getBalance(paymentManagerContract.target);

        // Verifica se il contratto ha fondi sufficienti per il pagamento
        if (BigInt(ethers.parseEther(releaseAmount)) > BigInt(contractBalance)) {
            toast.error("❌ Fondi insufficienti nel contratto per il pagamento!");
            return;
        }

        // Segna il biglietto come verificato prima di rilasciare i fondi
        const markTx = await ticketManagerWithSigner.markTicketAsVerified(ticketId);
        await markTx.wait(); // Attende la conferma della transazione

        // Esegue il trasferimento dei fondi al creatore dell'evento
        const tx = await paymentManagerWithSigner.releaseFundsToCreator(
            creatorAddress,
            ethers.parseEther(releaseAmount),
            { gasLimit: 500000 } // Imposta un limite di gas per la transazione
        );

        await tx.wait(); // Attende la conferma della transazione

    } catch (error) {
        console.error("❌ Errore nel rilascio dei fondi:", error);
    } finally {
        setLoading(false); // Disattiva lo stato di caricamento
    }
  };  

  return (
    <div className="verification-container text-center">
        {/* Titolo della sezione */}
        <h2 className="title-shadow">🔍 Scansiona il QR Code</h2>

        {/* Contenitore dello scanner QR */}
        <div className="neu-card p-4 mt-3">
            {/* Scanner per il QR Code in tempo reale */}
            <div id="qr-reader" className="qr-box"></div>

            {/* Elemento nascosto per la scansione di file immagine contenenti QR Code */}
            <div id="qr-reader-file" style={{ display: "none" }}></div>

            {/* Input per il caricamento di un'immagine con QR Code */}
            <Form.Group controlId="formFile" className="mt-3">
                <Form.Label>📂 Carica immagine con QR Code:</Form.Label>
                <Form.Control type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
            </Form.Group>
        </div>

        {/* Mostra lo spinner durante l'elaborazione della verifica */}
        {loading && <Spinner animation="border" className="d-block mx-auto my-3" />}

        {/* Mostra il risultato della verifica del biglietto */}
        {scannedData && (
            <Alert variant={isValid ? "success" : "danger"} className="mt-3">
                {isValid ? `✅ Biglietto #${scannedData.ticketId} verificato!` : "❌ Firma non valida!"}
            </Alert>
        )}
    </div>
  );
};

export default EventVerification;

