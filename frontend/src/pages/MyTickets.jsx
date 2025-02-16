// Importazione delle librerie principali di React
import React, { useEffect, useState, useRef } from "react";

// Importazione degli smart contract per interagire con la blockchain
import { ticketManagerContract, paymentManagerContract, eventFactoryContract, provider } from "../utils/contracts";

// Importazione dei componenti Bootstrap per il layout e l'interfaccia utente
import { Card, Button, Spinner, Alert } from "react-bootstrap";

// Importazione di Ethers.js per eseguire operazioni sulla blockchain Ethereum
import { ethers } from "ethers";

// Importazione della libreria di notifiche per mostrare messaggi all'utente
import { toast } from "react-toastify";

// Importazione della libreria QR Code per generare codici QR
import QRCode from "react-qr-code";

// Importazione della libreria html2canvas per generare screenshot dei QR Code
import html2canvas from "html2canvas";

// Importazione del file CSS personalizzato per lo stile della UI
import "../custom.css";

/**
 * @function MyTickets
 * @description Componente per visualizzare, scaricare QR e rimborsare i biglietti dell'utente.
 * @param {Object} props
 * @param {string|null} props.account - Indirizzo dell'account Ethereum connesso.
 * @returns {JSX.Element} Interfaccia utente per la gestione dei biglietti acquistati.
 */
const MyTickets = ({ account }) => {
  // Stato per memorizzare la lista dei biglietti dell'utente
  const [tickets, setTickets] = useState([]);

  // Stato per gestire il caricamento durante il recupero dei biglietti
  const [loading, setLoading] = useState(false);

  // Stato per memorizzare messaggi informativi o errori
  const [message, setMessage] = useState(null);

  // Stato per memorizzare i dati del QR Code generato per ogni biglietto
  const [qrData, setQrData] = useState({});

  // Riferimento per l'elemento del QR Code da scaricare come immagine
  const qrRef = useRef(null);

  // Riferimento per lo scrolling automatico nella lista dei biglietti
  const scrollRef = useRef(null);

  /**
   * @function useEffect
   * @description Recupera tutti i biglietti NFT posseduti dall'utente quando cambia l'account connesso.
   */
  useEffect(() => {

    /**
     * @function fetchUserTickets
     * @description Recupera dalla blockchain tutti i biglietti NFT di proprietà dell'utente.
     */
    const fetchUserTickets = async () => {
      try {
        setLoading(true); // Attiva lo stato di caricamento

        // Ottiene il signer dell'utente per eseguire operazioni firmate sulla blockchain
        const signer = await provider.getSigner();

        // Recupera l'indirizzo dell'utente connesso
        const userAddress = await signer.getAddress();

        // Recupera il numero totale di biglietti NFT mintati
        const maxTicketId = await ticketManagerContract.getTotalMintedTickets();

        // Array per memorizzare i biglietti dell'utente
        let userTickets = [];

        // Itera su tutti i biglietti esistenti per identificare quelli di proprietà dell'utente
        for (let i = 1; i <= maxTicketId; i++) {
          try {
            // Controlla se il biglietto è ancora attivo (non rimborsato o bruciato)
            const isActive = await ticketManagerContract.isTicketActive(i);
            if (!isActive) {
              console.warn(`⚠️ Il biglietto con ID ${i} è stato rimborsato o bruciato.`);
              continue; // Salta il biglietto e passa al prossimo
            }

            // Recupera l'indirizzo del proprietario del biglietto
            const owner = await ticketManagerContract.ownerOf(i);

            // Se l'utente connesso è il proprietario del biglietto, lo aggiunge alla lista
            if (owner.toLowerCase() === userAddress.toLowerCase()) {
              const tokenURI = await ticketManagerContract.tokenURI(i);
              userTickets.push({ id: i.toString(), uri: tokenURI }); // Aggiunge il biglietto alla lista
            }
          } catch (error) {
            console.warn(`⚠️ Il biglietto con ID ${i} non esiste.`); // Il biglietto potrebbe essere stato bruciato
          }
        }

        // Aggiorna lo stato con i biglietti dell'utente
        setTickets(userTickets);
      } catch (error) {
        console.error("❌ Errore nel recupero dei biglietti:", error);
        toast.error("❌ Errore nel recupero dei biglietti!");
        setMessage({ type: "danger", text: "Errore nel recupero dei biglietti." });
      } finally {
        setLoading(false); // Disattiva lo stato di caricamento
      }
    };

    fetchUserTickets(); // Esegue il recupero dei biglietti all'avvio e quando cambia l'account
  }, [account]); // Il recupero avviene ogni volta che cambia l'account utente

  /**
   * @function signTicketValidation
   * @description Genera una firma crittografica per convalidare un biglietto NFT e salva i dati firmati per la generazione di un QR Code.
   * @param {number} ticketId - ID del biglietto da firmare.
   */
  const signTicketValidation = async (ticketId) => {
    try {
        // Ottiene il signer dell'utente per eseguire operazioni firmate sulla blockchain
        const signer = await provider.getSigner();

        // Connettiamo i contratti con il signer per effettuare transazioni
        const ticketManagerWithSigner = ticketManagerContract.connect(signer);
        const eventFactoryWithSigner = eventFactoryContract.connect(signer);

        // Recupera l'ID dell'evento associato al biglietto
        const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);

        // Controlla se l'evento è stato annullato, impedendo la generazione del QR Code
        const isCancelled = await eventFactoryWithSigner.isEventCancelled(eventId);
        if (isCancelled) {
            console.error("❌ Questo evento è stato annullato. QR Code non generabile.");
            toast.error("❌ Questo evento è stato annullato! Non puoi generare un QR Code.");
            return;
        }

        // Messaggio da firmare (contiene l'ID del biglietto per garantire autenticità)
        const message = `Sto validando il mio biglietto #${ticketId}`;

        // L'utente firma il messaggio con la propria chiave privata per generare una prova crittografica
        const signature = await signer.signMessage(message);

        // Crea un oggetto JSON contenente il ticket ID, il messaggio e la firma crittografica
        const signedData = JSON.stringify({ ticketId, message, signature });

        // Aggiorna lo stato con i dati del QR Code generato per questo biglietto
        setQrData((prevQrData) => ({
            ...prevQrData,
            [ticketId]: signedData,
        }));

        // Mostra un messaggio di successo all'utente
        toast.success("✅ Firma generata con successo! Scansiona il QR Code per verificare.");
    } catch (error) {
        console.error("❌ Errore durante la firma:", error);
        toast.error("❌ Errore durante la firma del biglietto!");
    }
  };


  /**
   * @function downloadQRCode
   * @description Genera un'immagine PNG del QR Code associato a un biglietto e permette all'utente di scaricarla.
   * @param {number} ticketId - ID del biglietto di cui scaricare il QR Code.
   */
  const downloadQRCode = async (ticketId) => {
    // Trova l'elemento HTML che contiene il QR Code per questo biglietto
    const qrElement = document.getElementById(`qr-${ticketId}`);

    if (!qrElement) {
        console.error("❌ Errore: QR Code non trovato per il biglietto", ticketId);
        toast.error("❌ Errore: QR Code non trovato!");
        return;
    }

    // Trova l'elemento SVG all'interno del div del QR Code
    const svg = qrElement.querySelector("svg");

    if (!svg) {
        console.error("❌ Errore: Nessun elemento SVG trovato nel QR Code");
        toast.error("❌ Il QR Code non è stato generato correttamente.");
        return;
    }

    // Converte il QR Code SVG in una stringa XML
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);

    // Crea un blob SVG e genera un URL temporaneo per l'immagine
    const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Crea un nuovo oggetto `Image` per caricare l'SVG
    const img = new Image();
    img.src = svgUrl;

    img.onload = () => {
        // Crea un canvas per disegnare l'immagine finale
        const qrCanvas = document.createElement("canvas");
        const ctx = qrCanvas.getContext("2d");

        // Imposta le dimensioni del canvas
        qrCanvas.width = 250;
        qrCanvas.height = 300;

        // Riempie lo sfondo di bianco per il miglior rendering dell'immagine
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);

        // Imposta il testo sopra il QR Code
        ctx.fillStyle = "black";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Biglietto #${ticketId}`, qrCanvas.width / 2, 30);

        // Disegna il QR Code al centro del canvas
        ctx.drawImage(img, 25, 50, 200, 200);

        // Crea un link per scaricare l'immagine
        const link = document.createElement("a");
        link.href = qrCanvas.toDataURL("image/png");
        link.download = `QRCode_Biglietto_${ticketId}.png`;

        // Aggiunge il link al DOM, lo clicca automaticamente e lo rimuove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Libera la memoria eliminando l'URL temporaneo
        URL.revokeObjectURL(svgUrl);
    };
  };

  /**
   * @function refundTicket
   * @description Processa il rimborso di un biglietto se l'evento è stato annullato.
   * @param {number} ticketId - ID del biglietto da rimborsare.
   */
  const refundTicket = async (ticketId) => {
    setLoading(true); // Attiva lo stato di caricamento
    setMessage(null); // Pulisce eventuali messaggi precedenti

    try {
        // Ottiene il signer dell'utente per eseguire operazioni firmate sulla blockchain
        const signer = await provider.getSigner();

        // Recupera l'indirizzo dell'utente connesso
        const userAddress = await signer.getAddress();

        // Connettiamo i contratti con il signer per effettuare transazioni
        const paymentManagerWithSigner = paymentManagerContract.connect(signer);
        const eventFactoryWithSigner = eventFactoryContract.connect(signer);
        const ticketManagerWithSigner = ticketManagerContract.connect(signer);

        // Controlla che il biglietto non sia stato già verificato (condizione necessaria per il rimborso)
        const isVerified = await ticketManagerWithSigner.isTicketVerified(ticketId);
        if (isVerified) {
            console.error("❌ Questo biglietto è stato già verificato e non può essere rimborsato!");
            setMessage({ type: "danger", text: "❌ Questo biglietto è stato già verificato e non può essere rimborsato!" });
            toast.error("❌ Questo biglietto è stato già verificato e non può essere rimborsato!");
            return;
        }

        // Recupera l'ID dell'evento associato al biglietto
        const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);

        // Controlla se l'evento è stato annullato (condizione necessaria per il rimborso)
        const isCancelled = await eventFactoryWithSigner.isEventCancelled(eventId);
        if (!isCancelled) {
            setMessage({ type: "danger", text: "Questo evento non è stato annullato! Non puoi chiedere il rimborso." });
            toast.warn("❌ Questo evento non è stato annullato! Impossibile rimborsare.");
            return;
        }

        // Recupera i dettagli dell'evento dalla blockchain
        const eventDetails = await eventFactoryWithSigner.events(eventId);
        if (!eventDetails) {
            console.error("❌ Errore: Dettagli dell'evento non trovati!");
            setMessage({ type: "danger", text: "Errore nel recupero dei dettagli dell'evento!" });
            toast.error("❌ Errore nel recupero dei dettagli dell'evento!");
            return;
        }

        // Recupera l'importo del rimborso (prezzo del biglietto in ETH)
        const refundAmount = eventDetails.price ? ethers.formatEther(eventDetails.price) : null;
        if (!refundAmount) {
            console.error("❌ Importo di rimborso non valido!");
            setMessage({ type: "danger", text: "Errore nel calcolo del rimborso!" });
            toast.error("❌ Errore nel calcolo del rimborso!");
            return;
        }

        // Controlla il saldo del contratto `PaymentManager`
        const contractBalance = await provider.getBalance(paymentManagerContract.target);

        // Verifica se il contratto ha fondi sufficienti per il rimborso
        if (BigInt(ethers.parseEther(refundAmount)) > BigInt(contractBalance)) {
            console.error("❌ Il contratto non ha abbastanza fondi per il rimborso!");
            setMessage({ type: "danger", text: "Il contratto non ha abbastanza ETH per il rimborso." });
            toast.error("❌ Il contratto non ha abbastanza fondi per il rimborso!");
            return;
        }

        // Esegue la transazione per il rimborso dell'utente
        const refundTx = await paymentManagerWithSigner.processRefund(
            userAddress, 
            ethers.parseEther(refundAmount.toString()), 
            { gasLimit: 500000 } // Imposta un limite di gas per la transazione
        );
        await refundTx.wait(); // Attende la conferma della transazione sulla blockchain

        toast.success("✅ Rimborso completato!");

        // Brucia il biglietto dopo il rimborso per invalidarlo
        const burnTx = await ticketManagerWithSigner.refundTicket(ticketId);
        await burnTx.wait();

        toast.info("🔥 Biglietto eliminato dopo rimborso.");

        // Aggiorna la lista dei biglietti rimuovendo quello rimborsato
        setTickets((prevTickets) => prevTickets.filter((t) => t.id !== ticketId.toString()));

    } catch (error) {
        console.error("❌ Errore durante il rimborso:", error);
        setMessage({ type: "danger", text: "Rimborso fallito!" });
        toast.error("❌ Rimborso fallito!");
    } finally {
        setLoading(false); // Disattiva lo stato di caricamento
    }
  };


  /**
   * @returns {JSX.Element} Interfaccia utente per la gestione e il rimborso dei biglietti dell'utente.
   */
  return (
    <div className="mt-4 text-center">
      {/* Titolo della sezione */}
      <h2 className="title-shadow">🎫 I tuoi Biglietti</h2>

      {/* Mostra un messaggio informativo o di errore (se presente) */}
      {message && <Alert variant={message.type}>{message.text}</Alert>}

      {/* Mostra uno spinner di caricamento mentre i biglietti vengono recuperati */}
      {loading && <Spinner animation="border" className="d-block mx-auto my-3" />}

      {/* Contenitore dello slider per la navigazione tra i biglietti */}
      <div className="slider-container position-relative">
        {/* Pulsante per scorrere verso sinistra nel carosello di biglietti */}
        <button 
          className="slider-button left" 
          onClick={() => scrollRef.current.scrollBy({ left: -300, behavior: "smooth" })}
        >
          ⬅️
        </button>

        {/* Contenitore dei biglietti con effetto slider */}
        <div className="event-slider" ref={scrollRef}>
          {/* Mappa e genera le card dei biglietti disponibili */}
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="event-card text-white">
              <Card.Body>
                {/* Titolo del biglietto */}
                <Card.Title>🎟️ Biglietto #{ticket.id}</Card.Title>

                {/* Pulsante per richiedere il rimborso del biglietto */}
                <Button className="btn-danger" onClick={() => refundTicket(ticket.id)}>🔄 Richiedi Rimborso</Button>

                {/* Pulsante per generare il QR Code per la convalida del biglietto */}
                <Button className="btn-primary" onClick={() => signTicketValidation(ticket.id)}>✅ Genera QR Code</Button>

                {/* Se il QR Code è stato generato, lo mostra con un pulsante per scaricarlo */}
                {qrData[ticket.id] && (
                  <div id={`qr-${ticket.id}`} className="mt-3">
                    {/* Genera il QR Code con i dati firmati */}
                    <QRCode value={qrData[ticket.id]} size={200} />

                    {/* Pulsante per scaricare il QR Code come immagine */}
                    <Button className="btn-primary mt-2" onClick={() => downloadQRCode(ticket.id)}>
                      ⬇️ Scarica QR Code
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Pulsante per scorrere verso destra nel carosello di biglietti */}
        <button 
          className="slider-button right" 
          onClick={() => scrollRef.current.scrollBy({ left: 300, behavior: "smooth" })}
        >
          ➡️
        </button>
      </div>
    </div>
  );
};

export default MyTickets;

