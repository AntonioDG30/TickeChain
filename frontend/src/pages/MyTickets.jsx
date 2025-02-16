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
  const [qrData, setQrData] = useState({}); 
  const qrRef = useRef(null); 
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchUserTickets = async () => {
      try {
        setLoading(true);
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

  const signTicketValidation = async (ticketId) => {
    try {
      toast.info(`🔍 Generazione della firma per il biglietto #${ticketId}...`);
  
      const signer = await provider.getSigner();
      const message = `Sto validando il mio biglietto #${ticketId}`;
      const signature = await signer.signMessage(message);
  
      const signedData = JSON.stringify({ ticketId, message, signature });
  
      setQrData((prevQrData) => ({
        ...prevQrData,
        [ticketId]: signedData,
      }));
  
      toast.success("✅ Firma generata con successo! Scansiona il QR Code per verificare.");
    } catch (error) {
      console.error("❌ Errore durante la firma:", error);
      toast.error("❌ Errore durante la firma del biglietto!");
    }
  };
  

  const downloadQRCode = async (ticketId) => {
    const qrElement = document.getElementById(`qr-${ticketId}`);
  
    if (!qrElement) {
      console.error("❌ Errore: QR Code non trovato per il biglietto", ticketId);
      toast.error("❌ Errore: QR Code non trovato!");
      return;
    }
  
    const svg = qrElement.querySelector("svg");
  
    if (!svg) {
      console.error("❌ Errore: Nessun elemento SVG trovato nel QR Code");
      toast.error("❌ Il QR Code non è stato generato correttamente.");
      return;
    }
  
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml" });
    const svgUrl = URL.createObjectURL(svgBlob);
  
    const img = new Image();
    img.src = svgUrl;
    img.onload = () => {
      const qrCanvas = document.createElement("canvas");
      const ctx = qrCanvas.getContext("2d");
  
      qrCanvas.width = 250;
      qrCanvas.height = 300;
  
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
      ctx.fillStyle = "black";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`Biglietto #${ticketId}`, qrCanvas.width / 2, 30);
  
      ctx.drawImage(img, 25, 50, 200, 200);
  
      const link = document.createElement("a");
      link.href = qrCanvas.toDataURL("image/png");
      link.download = `QRCode_Biglietto_${ticketId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      URL.revokeObjectURL(svgUrl);
    };
  };
  
  
  
  

  const refundTicket = async (ticketId) => {
    setLoading(true);
    setMessage(null);

    try {
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const paymentManagerWithSigner = paymentManagerContract.connect(signer);
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);
      const ticketManagerWithSigner = ticketManagerContract.connect(signer);


      const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);

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

      const contractBalance = await provider.getBalance(paymentManagerContract.target);

      if (BigInt(ethers.parseEther(refundAmount)) > BigInt(contractBalance)) {
        console.error("❌ Il contratto non ha abbastanza fondi per il rimborso!");
        setMessage({ type: "danger", text: "Il contratto non ha abbastanza ETH per il rimborso." });
        toast.error("❌ Il contratto non ha abbastanza fondi per il rimborso!");
        return;
      }

      const refundTx = await paymentManagerWithSigner.processRefund(
          userAddress, 
          ethers.parseEther(refundAmount.toString()), 
          { gasLimit: 500000 }
      );
      await refundTx.wait();
      toast.success("✅ Rimborso completato!");

      const burnTx = await ticketManagerWithSigner.refundTicket(ticketId);
      await burnTx.wait();
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
                {qrData[ticket.id] && (
                  <div id={`qr-${ticket.id}`} className="mt-3">
                    <QRCode value={qrData[ticket.id]} size={200} />
                    <Button className="btn-primary mt-2" onClick={() => downloadQRCode(ticket.id)}>
                      ⬇️ Scarica QR Code
                    </Button>
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
