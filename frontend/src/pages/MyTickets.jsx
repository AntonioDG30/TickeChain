import React, { useEffect, useState, useRef } from "react";
import { ticketManagerContract, paymentManagerContract, eventFactoryContract, provider } from "../utils/contracts";
import { Card, Button, Spinner, Alert } from "react-bootstrap";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import "../custom.css";

const MyTickets = ({ account }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [qrData, setQrData] = useState(null);
  const qrRef = useRef(null); 
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchUserTickets = async () => {
      try {
        setLoading(true);
        toast.info("📡 Recupero biglietti NFT in corso...");
        console.log("📡 Recupero biglietti NFT posseduti dall'utente...");
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        const maxTicketId = await ticketManagerContract.getTotalMintedTickets();

        let userTickets = [];

        for (let i = 1; i <= maxTicketId; i++) {
          try {
            const isActive = await ticketManagerContract.isTicketActive(i);
            if (!isActive) {
              console.warn(`⚠️ Il biglietto con ID ${i} è stato rimborsato o bruciato.`);
              continue;
            }

            const owner = await ticketManagerContract.ownerOf(i);
            if (owner.toLowerCase() === userAddress.toLowerCase()) {
              const tokenURI = await ticketManagerContract.tokenURI(i);
              userTickets.push({ id: i.toString(), uri: tokenURI });
            }
          } catch (error) {
            console.warn(`⚠️ Il biglietto con ID ${i} non esiste.`);
          }
        }

        setTickets(userTickets);
        console.log("✅ Biglietti attivi recuperati:", userTickets);
        toast.success("✅ Biglietti aggiornati!");
      } catch (error) {
        console.error("❌ Errore nel recupero dei biglietti:", error);
        toast.error("❌ Errore nel recupero dei biglietti!");
        setMessage({ type: "danger", text: "Errore nel recupero dei biglietti." });
      } finally {
        setLoading(false);
      }
    };

    fetchUserTickets();
  }, [account]);

  // 🔹 Funzione per generare la firma e creare un QR Code
  const signTicketValidation = async (ticketId) => {
    try {
      toast.info(`🔍 Generazione della firma per il biglietto #${ticketId}...`);

      const signer = await provider.getSigner();
      const message = `Sto validando il mio biglietto #${ticketId}`;
      const signature = await signer.signMessage(message);

      const signedData = JSON.stringify({ ticketId, message, signature });

      setQrData(signedData);
      toast.success("✅ Firma generata con successo! Scansiona il QR Code per verificare.");
    } catch (error) {
      console.error("❌ Errore durante la firma:", error);
      toast.error("❌ Errore durante la firma del biglietto!");
    }
  };

  // 🔹 Funzione per scaricare il QR Code come immagine
  const downloadQRCode = () => {
    if (qrRef.current) {
      html2canvas(qrRef.current).then((canvas) => {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "QRCode_Biglietto.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  };

  // 🔹 Funzione per rimborsare un biglietto
  const refundTicket = async (ticketId) => {
    console.log(`🔄 Tentativo di rimborso per il biglietto ID: ${ticketId}`);
    toast.info(`🔄 Tentativo di rimborso per il biglietto #${ticketId}`);
    setLoading(true);
    setMessage(null);

    try {
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const paymentManagerWithSigner = paymentManagerContract.connect(signer);
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);
      const ticketManagerWithSigner = ticketManagerContract.connect(signer);

      console.log("📡 Connessione ai contratti:", { paymentManagerWithSigner, eventFactoryWithSigner, ticketManagerWithSigner });

      const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);
      console.log("🎟️ Evento associato al biglietto:", eventId.toString());

      const isCancelled = await eventFactoryWithSigner.isEventCancelled(eventId);
      if (!isCancelled) {
        setMessage({ type: "danger", text: "Questo evento non è stato annullato! Non puoi chiedere il rimborso." });
        toast.warn("❌ Questo evento non è stato annullato! Impossibile rimborsare.");
        return;
      }

      const eventDetails = await eventFactoryWithSigner.events(eventId);
      if (!eventDetails) {
          console.error("❌ Errore: Dettagli dell'evento non trovati!");
          setMessage({ type: "danger", text: "Errore nel recupero dei dettagli dell'evento!" });
          toast.error("❌ Errore nel recupero dei dettagli dell'evento!");
          return;
      }

      const refundAmount = eventDetails.price ? ethers.formatEther(eventDetails.price) : null;
      if (!refundAmount) {
          console.error("❌ Importo di rimborso non valido!");
          setMessage({ type: "danger", text: "Errore nel calcolo del rimborso!" });
          toast.error("❌ Errore nel calcolo del rimborso!");
          return;
      }

      console.log(`💰 Importo del rimborso: ${refundAmount} ETH`);
      toast.info(`💰 Rimborso di ${refundAmount} ETH in corso...`);

      // ✅ Controlliamo se il contratto ha abbastanza fondi PRIMA di eseguire il rimborso
      const contractBalance = await provider.getBalance(paymentManagerContract.target);
      console.log("💰 Saldo attuale del contratto:", ethers.formatEther(contractBalance));

      if (BigInt(ethers.parseEther(refundAmount)) > BigInt(contractBalance)) {
        console.error("❌ Il contratto non ha abbastanza fondi per il rimborso!");
        setMessage({ type: "danger", text: "Il contratto non ha abbastanza ETH per il rimborso." });
        toast.error("❌ Il contratto non ha abbastanza fondi per il rimborso!");
        return;
      }

      // ✅ Esegue il rimborso
      console.log("💸 Avvio del rimborso...");
      const refundTx = await paymentManagerWithSigner.processRefund(
          userAddress, 
          ethers.parseEther(refundAmount.toString()), 
          { gasLimit: 500000 }
      );
      await refundTx.wait();
      console.log("✅ Rimborso completato!");
      toast.success("✅ Rimborso completato!");

      console.log("🔥 Bruciatura del biglietto in corso...");
      const burnTx = await ticketManagerWithSigner.refundTicket(ticketId);
      await burnTx.wait();
      console.log("🔥 Biglietto bruciato!");
      toast.info("🔥 Biglietto eliminato dopo rimborso.");

      setTickets((prevTickets) => prevTickets.filter((t) => t.id !== ticketId.toString()));

    } catch (error) {
      console.error("❌ Errore durante il rimborso:", error);
      setMessage({ type: "danger", text: "Rimborso fallito!" });
      toast.error("❌ Rimborso fallito!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 text-center">
      <h2 className="title-shadow">🎫 I tuoi Biglietti</h2>
      {message && <Alert variant={message.type}>{message.text}</Alert>}
      {loading && <Spinner animation="border" className="d-block mx-auto my-3" />}
      
      <div className="slider-container position-relative">
        <button className="slider-button left" onClick={() => scrollRef.current.scrollBy({ left: -300, behavior: "smooth" })}>⬅️</button>
        <div className="event-slider" ref={scrollRef}>
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="event-card text-white">
              <Card.Body>
                <Card.Title>🎟️ Biglietto #{ticket.id}</Card.Title>
                <Button className="btn-danger" onClick={() => refundTicket(ticket.id)}>🔄 Richiedi Rimborso</Button>
                <Button className="btn-primary" onClick={() => signTicketValidation(ticket.id)}>✅ Genera QR Code</Button>
                {qrData && (
                  <div ref={qrRef} className="mt-3">
                    <QRCode value={qrData} size={150} />
                    <Button className="btn-primary mt-2" onClick={downloadQRCode}>⬇️ Scarica QR Code</Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
        <button className="slider-button right" onClick={() => scrollRef.current.scrollBy({ left: 300, behavior: "smooth" })}>➡️</button>
      </div>
    </div>
  );
};

export default MyTickets;
