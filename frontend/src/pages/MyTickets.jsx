import React, { useEffect, useState } from "react";
import { ticketManagerContract, paymentManagerContract, eventFactoryContract, provider } from "../utils/contracts";
import { Card, Button, Spinner, Alert } from "react-bootstrap";
import { ethers } from "ethers";

const MyTickets = ({ account }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchUserTickets = async () => {
      try {
        setLoading(true);
        console.log("📡 Recupero biglietti NFT posseduti dall'utente...");
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        const maxTicketId = await ticketManagerContract.getTotalMintedTickets(); // Otteniamo il massimo ID generato
    
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
      } catch (error) {
        console.error("❌ Errore nel recupero dei biglietti:", error);
        setMessage({ type: "danger", text: "Errore nel recupero dei biglietti." });
      } finally {
        setLoading(false);
      }
    };
       
        
    fetchUserTickets();
  }, [account]);

  const refundTicket = async (ticketId) => {
    console.log(`🔄 Tentativo di rimborso per il biglietto ID: ${ticketId}`);
    setLoading(true);
    setMessage(null);

    try {
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const paymentManagerWithSigner = paymentManagerContract.connect(signer);
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);
      const ticketManagerWithSigner = ticketManagerContract.connect(signer);

      console.log("📡 Connessione ai contratti:", { paymentManagerWithSigner, eventFactoryWithSigner, ticketManagerWithSigner });

      // ✅ Recupera l'ID dell'evento associato al biglietto
      const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);
      console.log("🎟️ Evento associato al biglietto:", eventId.toString());

      // ✅ Recupera il prezzo del biglietto dal contratto EventFactory
      const eventDetails = await eventFactoryWithSigner.events(eventId);
      if (!eventDetails) {
          console.error("❌ Errore: Dettagli dell'evento non trovati!");
          setMessage({ type: "danger", text: "Errore nel recupero dei dettagli dell'evento!" });
          return;
      }

      const refundAmount = eventDetails.price ? ethers.formatEther(eventDetails.price) : null;
      if (!refundAmount) {
          console.error("❌ Importo di rimborso non valido!");
          setMessage({ type: "danger", text: "Errore nel calcolo del rimborso!" });
          return;
      }

      console.log(`💰 Importo del rimborso: ${refundAmount} ETH`);

      // ✅ Controlliamo se il contratto ha abbastanza fondi PRIMA di eseguire il rimborso
      const contractBalance = await provider.getBalance(paymentManagerContract.target);
      console.log("💰 Saldo attuale del contratto:", ethers.formatEther(contractBalance));

      if (BigInt(ethers.parseEther(refundAmount)) > BigInt(contractBalance)) {
        console.error("❌ Il contratto non ha abbastanza fondi per il rimborso!");
        setMessage({ type: "danger", text: "Il contratto non ha abbastanza ETH per il rimborso." });
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

      // ✅ Controlla il saldo dell'utente dopo il rimborso
      const finalBalance = await provider.getBalance(userAddress);
      console.log("💰 Saldo finale dell'utente:", ethers.formatEther(finalBalance));

      setMessage({ type: "success", text: "Rimborso effettuato con successo!" });

      // ✅ Dopo il rimborso, il biglietto viene eliminato
      console.log("🔥 Bruciatura del biglietto in corso...");
      const burnTx = await ticketManagerWithSigner.refundTicket(ticketId);
      await burnTx.wait();
      console.log("🔥 Biglietto bruciato!");

      // ✅ Aggiorna la lista dei biglietti
      setTickets((prevTickets) => prevTickets.filter((t) => t.id !== ticketId.toString()));

    } catch (error) {
      console.error("❌ Errore durante il rimborso:", error);
      setMessage({ type: "danger", text: "Rimborso fallito!" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-center">🎫 I tuoi Biglietti</h2>

      {message && <Alert variant={message.type}>{message.text}</Alert>}

      {loading && <Spinner animation="border" className="d-block mx-auto my-3" />}

      <div className="row">
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <div className="col-md-4" key={ticket.id}>
              <Card className="mb-3">
                <Card.Body>
                  <Card.Title>🎟️ Biglietto #{ticket.id}</Card.Title>
                  <Card.Text>🔗 <a href={ticket.uri} target="_blank" rel="noopener noreferrer">Vedi metadati</a></Card.Text>
                  <Button 
                    onClick={() => refundTicket(ticket.id)} 
                    disabled={loading}
                    variant="danger"
                  >
                    🔄 Richiedi Rimborso
                  </Button>
                </Card.Body>
              </Card>
            </div>
          ))
        ) : (
          <p className="text-center">❌ Nessun biglietto acquistato.</p>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
