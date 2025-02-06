import React, { useEffect, useState } from "react";
import { Button, Card, Spinner } from "react-bootstrap";
import { ethers } from "ethers";
import { eventFactoryContract, ticketManagerContract, provider } from "../utils/contracts";

const EventList = ({ account }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log("📡 Connessione a MetaMask...");
        
        // Forza la connessione al wallet
        await provider.send("eth_requestAccounts", []);
    
        console.log("📡 Chiamata a getTotalEvents...");
    
        const signer = await provider.getSigner();  // Otteniamo il signer dall'utente
        const totalEvents = await eventFactoryContract.connect(signer).getTotalEvents();
    
        console.log("🎟️ Numero di eventi totali:", totalEvents.toString());
    
        if (totalEvents.toString() === "0") {
          console.warn("⚠️ Nessun evento trovato.");
          return;
        }
    
        let fetchedEvents = [];
        for (let i = 0; i < totalEvents; i++) {
          const event = await eventFactoryContract.events(i);
          fetchedEvents.push({
            id: i,
            name: event.name,
            location: event.location,
            price: event.price ? ethers.formatEther(event.price) : "0",
            ticketsAvailable: Number(event.ticketsAvailable),
          });
        }
    
        setEvents(fetchedEvents);
        console.log("✅ Eventi recuperati:", fetchedEvents);
      } catch (error) {
        console.error("❌ Errore nel recupero eventi:", error);
      }
    };
    
    fetchEvents();
  }, []);
  

  const buyTicket = async (eventId, price) => {
    setLoading(true);
    try {
        const signer = await provider.getSigner();

        // 1️⃣ Verifica lo stato dell'evento
        const event = await eventFactoryContract.events(eventId);
        console.log("📅 Stato dell'evento:", event.state.toString());

        if (event.state.toString() !== "1") { // 1 = OPEN
            alert("❌ L'evento non è aperto per l'acquisto!");
            setLoading(false);
            return;
        }

        const userAddress = await signer.getAddress();
        console.log("📝 Indirizzo del wallet:", userAddress);


        // 2️⃣ Verifica il saldo dell'utente
        const balance = await provider.getBalance(account);
        console.log("💳 Saldo utente:", ethers.formatEther(balance), "ETH");

        if (balance < ethers.parseEther(price.toString())) {
            alert("❌ Fondi insufficienti!");
            setLoading(false);
            return;
        }

        // 3️⃣ Debug: Dati della transazione
        console.log("🏷️ Acquisto biglietto per evento:", eventId);
        console.log("👛 Account:", account);
        console.log("💰 Prezzo:", price);
        console.log("🎟️ Contract Address:", ticketManagerContract.target);

        // 4️⃣ Esegui la transazione
        const tx = await ticketManagerContract.connect(signer).mintTicket(
            account,
            "https://example.com/ticket",
            eventId,
            {
                value: ethers.parseEther(price.toString()), // Conversione corretta
            }
        );

        await tx.wait();
        alert("✅ Biglietto acquistato con successo!");
    } catch (error) {
        console.error("❌ Errore durante l'acquisto:", error);
        alert("Acquisto fallito");
    }
    setLoading(false);
  };



  return (
    <div className="mt-4">
      <h2 className="text-center">Eventi Disponibili</h2>
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
                <Button onClick={() => buyTicket(event.id, event.price)} disabled={loading}>
                  Acquista Biglietto
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
