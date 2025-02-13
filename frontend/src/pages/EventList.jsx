import React, { useEffect, useState } from "react";
import { Button, Card, Spinner } from "react-bootstrap";
import { ethers } from "ethers";
import { eventFactoryContract, ticketManagerContract, paymentManagerContract, provider } from "../utils/contracts";

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
            description: event.description,
            date: new Date(Number(event.date) * 1000).toLocaleDateString(),
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

  const buyTicket = async (eventId, price) => {
    console.log(`🛒 Acquisto biglietto per evento ID: ${eventId}`);
    
    try {
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);
      const paymentManagerWithSigner = paymentManagerContract.connect(signer);
      const ticketManagerWithSigner = ticketManagerContract.connect(signer);
  
      console.log("📡 Connessione a PaymentManager.sol");
  
      // 🔹 Controllo se il contratto è in pausa
      const isPaused = await ticketManagerWithSigner.paused();
      console.log("⏸️ Stato contratto:", isPaused);
      if (isPaused) {
        throw new Error("⏸️ Il contratto è in pausa! Impossibile procedere.");
      }

      // 🔹 Controlliamo se l'evento è annullato
      const isCancelled = await eventFactoryWithSigner.isEventCancelled(eventId);
      if (isCancelled) {
        alert("❌ Questo evento è stato annullato! Non puoi acquistare biglietti.");
        return;
      }

      // 🔹 Controlliamo se l'evento è aperto alla vendita
      const isOpen = await eventFactoryWithSigner.isEventOpen(eventId);
      if (!isOpen) {
        alert("❌ La vendita per questo evento non è ancora aperta! Non puoi acquistare biglietti.");
        return;
      }
  
      // 🔹 Controlliamo se il wallet connesso è l'owner
      const contractOwner = await ticketManagerWithSigner.owner();
      console.log("👑 Owner del contratto:", contractOwner);
      console.log("🔑 Account connesso:", userAddress);
  
      if (contractOwner.toLowerCase() !== userAddress.toLowerCase()) {
        console.warn("⚠️ Attenzione! Il wallet connesso NON è l'owner del contratto.");
      }
  
      // 🔹 Deposito ETH su PaymentManager.sol
      console.log(`💰 Deposito di ${price} ETH`);
      const depositTx = await paymentManagerWithSigner.depositFunds({
        value: ethers.parseEther(price.toString()),
        gasLimit: 300000, // Impostiamo un gasLimit più alto
      });
      await depositTx.wait();
      console.log("✅ Deposito completato!");
  
      // 🔹 Controlliamo il saldo del contratto
      const contractBalance = await provider.getBalance(paymentManagerContract.target);
      console.log("💰 Saldo contratto dopo deposito:", ethers.formatEther(contractBalance));
  
      // 🔹 Mint del biglietto
      console.log("🎟️ Avvio minting del biglietto...");
      const tx = await ticketManagerWithSigner.mintTicket(
        userAddress, 
        "https://example.com/ticket", 
        eventId,
        { gasLimit: 500000 } // 🔹 Forziamo il gas limit
      );
      await tx.wait();
      console.log("✅ Biglietto acquistato con successo!");

      // 🔹 Decrementa i biglietti disponibili
      console.log("📉 Aggiornamento biglietti disponibili...");
      const updateTx = await eventFactoryWithSigner.decreaseTicketCount(eventId);
      await updateTx.wait();
      console.log("✅ Numero biglietti decrementato!");
  
      // 🔄 Aggiorna la lista eventi
      fetchEvents();
  
      alert("✅ Biglietto acquistato con successo!");
    } catch (error) {
      console.error("❌ Errore durante l'acquisto:", error);
      alert(`❌ Acquisto fallito! ${error.message}`);
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
                <Card.Text>📝 {event.description}</Card.Text>
                <Card.Text>📅 {event.date}</Card.Text>
                <Card.Text>📍 {event.location}</Card.Text>
                <Card.Text>💰 {event.price} ETH</Card.Text>
                <Card.Text>🎟️ {event.ticketsAvailable} disponibili</Card.Text>
                <Button onClick={() => buyTicket(event.id, event.price)} disabled={loading}>
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
