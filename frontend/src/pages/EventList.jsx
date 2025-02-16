// Importazione delle librerie principali di React
import React, { useEffect, useState, useRef } from "react";

// Importazione dei componenti di Bootstrap per lo stile e il layout
import { Button, Card, Spinner } from "react-bootstrap";

// Importazione di Ethers.js per interagire con gli smart contract sulla blockchain Ethereum
import { ethers } from "ethers";

// Importazione degli oggetti di connessione ai contratti smart su Ethereum
import { eventFactoryContract, ticketManagerContract, paymentManagerContract, provider } from "../utils/contracts";

// Importazione della libreria di notifiche per mostrare messaggi all'utente
import { toast } from "react-toastify";

// Importazione del file CSS personalizzato per la stilizzazione della UI
import "../custom.css";


/**
 * @function EventList
 * @description Componente che mostra la lista degli eventi disponibili per l'acquisto di biglietti.
 * @param {Object} props
 * @param {string|null} props.account - Indirizzo dell'account Ethereum connesso.
 * @returns {JSX.Element} Interfaccia utente con la lista degli eventi.
 */
const EventList = ({ account }) => {
  // Stato per memorizzare gli eventi recuperati dalla blockchain
  const [events, setEvents] = useState([]);

  // Stato per gestire il caricamento dei dati
  const [loading, setLoading] = useState(false);

  // Riferimento per lo scroll automatico nella lista degli eventi
  const scrollRef = useRef(null);

  /**
   * @function fetchEvents
   * @description Recupera tutti gli eventi disponibili dallo smart contract `EventFactory`.
   * @dev Viene escluso dalla lista qualsiasi evento creato dall'utente connesso.
   */
  const fetchEvents = async () => {
    try {
      // Ottiene il signer dell'utente per eseguire operazioni firmate
      const signer = await provider.getSigner();

      // Recupera l'indirizzo dell'utente connesso
      const userAddress = await signer.getAddress();

      // Recupera il numero totale di eventi registrati
      const totalEvents = await eventFactoryContract.getTotalEvents();

      // Array per memorizzare gli eventi filtrati
      let fetchedEvents = [];

      // Itera su tutti gli eventi registrati nella blockchain
      for (let i = 0; i < totalEvents; i++) {
        const event = await eventFactoryContract.events(i);

        // Filtra gli eventi creati dall'utente stesso (non vengono mostrati nella lista)
        if (event.creator.toLowerCase() !== userAddress.toLowerCase()) {
          fetchedEvents.push({
            id: i,
            name: event.name,
            location: event.location,
            description: event.description,
            date: new Date(Number(event.date) * 1000).toLocaleDateString(), // Converte la data in formato leggibile
            price: event.price ? ethers.formatEther(event.price) : "0", // Converte il prezzo in ETH
            ticketsAvailable: Number(event.ticketsAvailable), // Converte i biglietti disponibili in numero intero
          });
        }
      }

      // Aggiorna lo stato con gli eventi filtrati
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("❌ Errore nel recupero eventi:", error);
      toast.error("❌ Errore nel recupero eventi!");
    }
  };

  /**
   * @function useEffect
   * @description Effettua il recupero degli eventi ogni volta che cambia l'account connesso.
   */
  useEffect(() => {
    fetchEvents();
  }, [account]); // La funzione viene eseguita quando cambia l'account utente


  /**
   * @function buyTicket
   * @description Permette a un utente di acquistare un biglietto per un evento.
   * @param {number} eventId - Identificativo dell'evento per cui si vuole acquistare il biglietto.
   * @param {number} price - Prezzo del biglietto in ETH.
   */
  const buyTicket = async (eventId, price) => {
    try {
        // Ottiene il signer dell'utente per eseguire operazioni firmate sulla blockchain
        const signer = await provider.getSigner();

        // Recupera l'indirizzo dell'utente connesso
        const userAddress = await signer.getAddress();

        // Connettiamo i contratti con il signer per effettuare transazioni
        const eventFactoryWithSigner = eventFactoryContract.connect(signer);
        const paymentManagerWithSigner = paymentManagerContract.connect(signer);
        const ticketManagerWithSigner = ticketManagerContract.connect(signer);

        // Controlla se il contratto `TicketManager` è in pausa
        const isPaused = await ticketManagerWithSigner.paused();
        if (isPaused) {
            toast.warn("⏸️ Il contratto è in pausa! Impossibile procedere.");
            return;
        }

        // Controlla se l'evento è stato annullato
        const isCancelled = await eventFactoryWithSigner.isEventCancelled(eventId);
        if (isCancelled) {
            toast.error("❌ Questo evento è stato annullato! Non puoi acquistare biglietti.");
            return;
        }

        // Controlla se la vendita dell'evento è aperta
        const isOpen = await eventFactoryWithSigner.isEventOpen(eventId);
        if (!isOpen) {
            toast.warn("❌ La vendita per questo evento non è ancora aperta! Non puoi acquistare biglietti.");
            return;
        }

        // Effettua il deposito dei fondi nel contratto `PaymentManager`
        const depositTx = await paymentManagerWithSigner.depositFunds({
            value: ethers.parseEther(price.toString()), // Converte il prezzo in formato ETH
            gasLimit: 300000, // Limite di gas per la transazione
        });
        await depositTx.wait(); // Attende la conferma della transazione sulla blockchain

        // Chiama la funzione `mintTicket` su `TicketManager` per creare il biglietto NFT
        const tx = await ticketManagerWithSigner.mintTicket(
            userAddress, // Indirizzo dell'acquirente
            "https://example.com/ticket", // URI del biglietto (metadati, in futuro da migliorare)
            eventId,
            { gasLimit: 500000 } // Limite di gas per la transazione
        );
        await tx.wait(); // Attende la conferma della transazione sulla blockchain

        // Mostra un messaggio di successo all'utente
        toast.success("✅ Biglietto acquistato con successo!");

        // Aggiorna il numero di biglietti disponibili nell'evento
        const updateTx = await eventFactoryWithSigner.decreaseTicketCount(eventId);
        await updateTx.wait(); // Attende la conferma della transazione

        // Aggiorna la lista degli eventi per riflettere le nuove disponibilità
        fetchEvents();
    } catch (error) {
        console.error("❌ Errore durante l'acquisto:", error);
        toast.error(`❌ Acquisto fallito: ${error.message}`);
    }
  };


  /**
   * @returns {JSX.Element} Interfaccia utente per la visualizzazione degli eventi disponibili.
   */
  return (
    <div className="mt-4 text-center">
      {/* Titolo della sezione con effetto visivo personalizzato */}
      <h2 className="title-shadow">🎟️ Eventi Disponibili</h2>

      {/* Mostra uno spinner di caricamento mentre i dati degli eventi vengono recuperati */}
      {loading && <Spinner animation="border" className="d-block mx-auto my-3" />}

      {/* Contenitore principale dello slider per la navigazione tra gli eventi */}
      <div className="slider-container position-relative">

        {/* Pulsante per scorrere verso sinistra nel carosello di eventi */}
        <button 
          className="slider-button left" 
          onClick={() => scrollRef.current.scrollBy({ left: -300, behavior: "smooth" })}
        >
          ⬅️
        </button>

        {/* Contenitore degli eventi con effetto slider */}
        <div className="event-slider" ref={scrollRef}>
          {/* Mappa e genera le card degli eventi disponibili */}
          {events.map((event) => (
            <Card key={event.id} className="event-card text-white">
              <Card.Body>
                {/* Titolo dell'evento */}
                <Card.Title>{event.name}</Card.Title>

                {/* Descrizione dell'evento */}
                <Card.Text>📝 {event.description}</Card.Text>

                {/* Data dell'evento */}
                <Card.Text>📅 {event.date}</Card.Text>

                {/* Posizione dell'evento */}
                <Card.Text>📍 {event.location}</Card.Text>

                {/* Prezzo del biglietto in ETH */}
                <Card.Text>💰 {event.price} ETH</Card.Text>

                {/* Numero di biglietti disponibili */}
                <Card.Text>🎟️ {event.ticketsAvailable} disponibili</Card.Text>

                {/* Pulsante per acquistare il biglietto per l'evento */}
                <Button onClick={() => buyTicket(event.id, event.price)} className="btn-buy">
                  🛒 Acquista Biglietto
                </Button>
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Pulsante per scorrere verso destra nel carosello di eventi */}
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

export default EventList;

