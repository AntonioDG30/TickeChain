import React, { useEffect, useState } from "react";
import { Button, Card, Spinner } from "react-bootstrap";
import { ethers } from "ethers";
import { eventFactoryContract, ticketManagerContract, provider } from "../utils/contracts";

const EventList = ({ account }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    try {          
      console.log("📡 Recupero eventi disponibili...");
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
  
      const totalEvents = await eventFactoryContract.getTotalEvents();
      let fetchedEvents = [];
  
      for (let i = 0; i < totalEvents; i++) {
        const event = await eventFactoryContract.events(i);

        // Filtra gli eventi creati dall'utente connesso
        if (event.creator.toLowerCase() !== userAddress.toLowerCase()) {
          fetchedEvents.push({
            id: i,
            name: event.name,
            location: event.location,
            price: event.price ? ethers.formatEther(event.price) : "0",
            ticketsAvailable: Number(event.ticketsAvailable),
          });
        }
      }
  
      setEvents(fetchedEvents);
      console.log("✅ Eventi aggiornati:", fetchedEvents);
    } catch (error) {
      console.error("❌ Errore nel recupero eventi:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [account]);

  const buyTicket = async (eventId) => {
    console.log(`🛒 Tentativo di acquisto biglietto per evento ID: ${eventId}`);

    try {
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const ticketManagerWithSigner = ticketManagerContract.connect(signer);

      console.log("📡 Connessione al contratto TicketManager:", ticketManagerWithSigner);
      console.log("👛 Indirizzo utente:", userAddress);

      // Controlliamo lo stato dell'evento
      const event = await eventFactoryContract.events(eventId);
      console.log("📅 Stato dell'evento:", event.state.toString());

      if (event.state.toString() !== "1") { // 1 = OPEN
        alert("❌ L'evento non è aperto per l'acquisto!");
        return;
      }

      // Acquisto del biglietto
      const tx = await ticketManagerWithSigner.mintTicket(userAddress, "https://example.com/ticket", eventId);
      await tx.wait();

      console.log("✅ Acquisto completato!");
      alert("✅ Biglietto acquistato con successo!");

      // ⚡ Dopo l'acquisto, aggiorniamo automaticamente la lista eventi
      fetchEvents();
    } catch (error) {
      console.error("❌ Errore durante l'acquisto:", error);
      alert("❌ Acquisto fallito!");
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-center">🎟️ Eventi Disponibili</h2>
      {loading && <Spinner animation="border" />}
      <div className="row">
        {events.map((event) => (
          <div className="col-md-4" key={event.id}>
            <Card className="mb-3">
              <Card.Body>
                <Card.Title>{event.name}</Card.Title>
                <Card.Text>📍 {event.location}</Card.Text>
                <Card.Text>💰 {event.price} ETH</Card.Text>
                <Card.Text>🎟️ {event.ticketsAvailable} disponibili</Card.Text>
                <Button onClick={() => buyTicket(event.id)} disabled={loading}>
                    🛒 Acquista Biglietto
                </Button>
              </Card.Body>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventList;
