import React, { useEffect, useState, useRef } from "react";
import { Button, Card, Spinner } from "react-bootstrap";
import { ethers } from "ethers";
import { eventFactoryContract, ticketManagerContract, paymentManagerContract, provider } from "../utils/contracts";
import { toast } from "react-toastify";
import "../custom.css";

const EventList = ({ account }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const fetchEvents = async () => {
    try {          
      console.log("📡 Recupero eventi disponibili...");
      toast.info("📡 Recupero eventi disponibili...");
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
      toast.success("✅ Eventi aggiornati!");
    } catch (error) {
      console.error("❌ Errore nel recupero eventi:", error);
      toast.error("❌ Errore nel recupero eventi!");
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [account]);

  const buyTicket = async (eventId, price) => {
    console.log(`🛒 Acquisto biglietto per evento ID: ${eventId}`);
    toast.info(`🛒 Tentativo di acquisto per evento ID: ${eventId}`);
    
    try {
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);
      const paymentManagerWithSigner = paymentManagerContract.connect(signer);
      const ticketManagerWithSigner = ticketManagerContract.connect(signer);
  
      console.log("📡 Connessione a PaymentManager.sol");
  
      // 🔹 Controllo se il contratto è in pausa
      const isPaused = await ticketManagerWithSigner.paused();
      if (isPaused) {
        toast.warn("⏸️ Il contratto è in pausa! Impossibile procedere.");
        return;
      }

      // 🔹 Controlliamo se l'evento è annullato
      const isCancelled = await eventFactoryWithSigner.isEventCancelled(eventId);
      if (isCancelled) {
        toast.error("❌ Questo evento è stato annullato! Non puoi acquistare biglietti.");
        return;
      }

      // 🔹 Controlliamo se l'evento è aperto alla vendita
      const isOpen = await eventFactoryWithSigner.isEventOpen(eventId);
      if (!isOpen) {
        toast.warn("❌ La vendita per questo evento non è ancora aperta! Non puoi acquistare biglietti.");
        return;
      }
  
      // 🔹 Deposito ETH su PaymentManager.sol
      console.log(`💰 Deposito di ${price} ETH`);
      toast.info(`💰 Deposito di ${price} ETH in corso...`);
      const depositTx = await paymentManagerWithSigner.depositFunds({
        value: ethers.parseEther(price.toString()),
        gasLimit: 300000, // Impostiamo un gasLimit più alto
      });
      await depositTx.wait();
      console.log("✅ Deposito completato!");
      toast.success("✅ Deposito completato!");

      // 🔹 Mint del biglietto
      console.log("🎟️ Avvio minting del biglietto...");
      toast.info("🎟️ Creazione del biglietto in corso...");
      const tx = await ticketManagerWithSigner.mintTicket(
        userAddress, 
        "https://example.com/ticket", 
        eventId,
        { gasLimit: 500000 } // 🔹 Forziamo il gas limit
      );
      await tx.wait();
      console.log("✅ Biglietto acquistato con successo!");
      toast.success("✅ Biglietto acquistato con successo!");

      // 🔹 Decrementa i biglietti disponibili
      console.log("📉 Aggiornamento biglietti disponibili...");
      toast.info("📉 Aggiornamento biglietti disponibili...");
      const updateTx = await eventFactoryWithSigner.decreaseTicketCount(eventId);
      await updateTx.wait();
      console.log("✅ Numero biglietti decrementato!");
      toast.success("✅ Numero biglietti decrementato!");
  
      // 🔄 Aggiorna la lista eventi
      fetchEvents();
    } catch (error) {
      console.error("❌ Errore durante l'acquisto:", error);
      toast.error(`❌ Acquisto fallito: ${error.message}`);
    }
  };

  return (
    <div className="mt-4 text-center">
      <h2 className="title-shadow">🎟️ Eventi Disponibili</h2>
      {loading && <Spinner animation="border" className="d-block mx-auto my-3" />}
      
      <div className="slider-container position-relative">
        <button className="slider-button left" onClick={() => scrollRef.current.scrollBy({ left: -300, behavior: "smooth" })}>⬅️</button>
        <div className="event-slider" ref={scrollRef}>
          {events.map((event) => (
            <Card key={event.id} className="event-card text-white">
              <Card.Body>
                <Card.Title>{event.name}</Card.Title>
                <Card.Text>📝 {event.description}</Card.Text>
                <Card.Text>📅 {event.date}</Card.Text>
                <Card.Text>📍 {event.location}</Card.Text>
                <Card.Text>💰 {event.price} ETH</Card.Text>
                <Card.Text>🎟️ {event.ticketsAvailable} disponibili</Card.Text>
                <Button onClick={() => buyTicket(event.id, event.price)} className="btn-buy">
                  🛒 Acquista Biglietto
                </Button>
              </Card.Body>
            </Card>
          ))}
        </div>
        <button className="slider-button right" onClick={() => scrollRef.current.scrollBy({ left: 300, behavior: "smooth" })}>➡️</button>
      </div>
    </div>
  );
};

export default EventList;
