import React, { useEffect, useState } from "react";
import { ticketManagerContract, paymentManagerContract, eventFactoryContract, provider } from "../utils/contracts";
import { Card, Button } from "react-bootstrap";
import { ethers } from "ethers";


const MyTickets = ({ account }) => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchUserTickets = async () => {
      try {
        console.log("📡 Recupero biglietti NFT posseduti dall'utente...");
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        const totalTickets = await ticketManagerContract.balanceOf(userAddress);
        let userTickets = [];

        for (let i = 0; i < totalTickets; i++) {
          const ticketId = i; // Iteriamo sugli ID
          const owner = await ticketManagerContract.ownerOf(ticketId);

          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            const tokenURI = await ticketManagerContract.tokenURI(ticketId);
            userTickets.push({ id: ticketId.toString(), uri: tokenURI });
          }
        }

        setTickets(userTickets);
        console.log("✅ Biglietti recuperati:", userTickets);
      } catch (error) {
        console.error("❌ Errore nel recupero dei biglietti:", error);
      }
    };

    fetchUserTickets();
  }, [account]);

  const refundTicket = async (ticketId, eventId, price) => {
    console.log(`🔄 Tentativo di rimborso per il biglietto ID: ${ticketId}`);
  
    try {
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const paymentManagerWithSigner = paymentManagerContract.connect(signer);
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);
  
      console.log("📡 Connessione al contratto PaymentManager:", paymentManagerWithSigner);
  
      // ⚡ Verifica nel frontend se l'evento è annullato prima di eseguire il rimborso
      const isCancelled = await eventFactoryWithSigner.isEventCancelled(eventId);
      console.log("🛑 Stato dell'evento annullato:", isCancelled);
  
      if (!isCancelled) {
        alert("❌ Questo evento non è stato annullato, il rimborso non è disponibile.");
        return;
      }
  
      // ⚡ Verifica il saldo disponibile nel contratto PaymentManager (in ETH)
      const contractBalance = await provider.getBalance(paymentManagerContract.target);
      console.log("💰 Bilancio contratto PaymentManager (ETH):", ethers.formatEther(contractBalance));
  
      if (contractBalance < ethers.parseEther(price.toString())) {
        alert("❌ Il contratto non ha fondi sufficienti per il rimborso.");
        return;
      }
  
      // Chiamata al contratto per il rimborso
      const refundTx = await paymentManagerWithSigner.processRefund(
        userAddress,
        ethers.parseEther(price.toString()),
        eventId
      );
      await refundTx.wait();
  
      console.log("✅ Rimborso completato!");
      alert("✅ Rimborso effettuato con successo!");
  
      // ⚡ Brucia il biglietto dopo il rimborso
      const burnTx = await ticketManagerContract.connect(signer).refundTicket(ticketId);
      await burnTx.wait();
  
      console.log("🔥 Biglietto bruciato!");
      alert("🔥 Biglietto eliminato dal tuo portafoglio!");
  
      // ⚡ Aggiorniamo la lista dei biglietti
      setTickets((prevTickets) => prevTickets.filter((t) => t.id !== ticketId.toString()));
    } catch (error) {
      console.error("❌ Errore durante il rimborso:", error);
      alert("❌ Rimborso fallito!");
    }
  };
  

  return (
    <div className="mt-4">
      <h2 className="text-center">🎫 I tuoi Biglietti</h2>
      <div className="row">
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <div className="col-md-4" key={ticket.id}>
              <Card className="mb-3">
                <Card.Body>
                  <Card.Title>🎟️ Biglietto #{ticket.id}</Card.Title>
                  <Card.Text>🔗 <a href={ticket.uri} target="_blank" rel="noopener noreferrer">Vedi metadati</a></Card.Text>
                  <Button variant="danger" onClick={() => refundTicket(ticket.id, 1, 0.1)}>
                    🔄 Rimborsa
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
