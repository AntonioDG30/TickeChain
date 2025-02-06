import React, { useEffect, useState } from "react";
import { ticketManagerContract, provider } from "../utils/contracts";
import { Card } from "react-bootstrap";

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
          const ticketId = i; // Semplicemente iteriamo sugli ID
          const owner = await ticketManagerContract.ownerOf(ticketId);

          // Se il biglietto appartiene all'utente, recuperiamo il tokenURI
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
