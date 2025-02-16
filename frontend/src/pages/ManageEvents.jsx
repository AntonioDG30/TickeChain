// Importazione delle librerie principali di React
import React, { useEffect, useState, useRef } from "react";

// Importazione di componenti Bootstrap per l'interfaccia utente
import { Button, Form, Modal, Alert, Card } from "react-bootstrap";

// Importazione di Ethers.js per interagire con la blockchain Ethereum
import { ethers } from "ethers";

// Importazione degli smart contract per interagire con la blockchain
import { ticketManagerContract, eventFactoryContract, provider } from "../utils/contracts";

// Importazione della libreria di notifiche per mostrare messaggi utente
import { toast } from "react-toastify";

// Importazione del file CSS personalizzato per la stilizzazione della UI
import "../custom.css";

/**
 * @function ManageEvents
 * @description Componente che permette all'utente di gestire i propri eventi sulla blockchain.
 * @param {Object} props
 * @param {string|null} props.account - Indirizzo dell'account Ethereum connesso.
 * @returns {JSX.Element} Interfaccia utente per la gestione degli eventi.
 */
const ManageEvents = ({ account }) => {
  // Stato per memorizzare gli eventi dell'utente
  const [events, setEvents] = useState([]);

  // Stato per controllare la visibilità del modal di creazione evento
  const [showModal, setShowModal] = useState(false);

  // Stato per memorizzare i dati inseriti nel modulo di creazione evento
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    date: "",
    price: "",
    ticketsAvailable: "",
  });

  // Stato per mostrare messaggi informativi o errori all'utente
  const [message, setMessage] = useState("");

  // Stato per gestire il caricamento durante le operazioni
  const [loading, setLoading] = useState(false);

  // Riferimento per lo scroll automatico della lista degli eventi
  const scrollRef = useRef(null);

  /**
   * @function useEffect
   * @description Controlla lo stato di emergenza e recupera gli eventi dell'utente quando cambia l'account.
   */
  useEffect(() => {
    checkEmergencyStatus(); // Controlla se il sistema è in stato di emergenza
    fetchUserEvents(); // Recupera gli eventi creati dall'utente
  }, [account]);

  /**
   * @function handleShowModal
   * @description Mostra il modal di creazione di un nuovo evento.
   */
  const handleShowModal = () => setShowModal(true);

  /**
   * @function handleCloseModal
   * @description Nasconde il modal di creazione evento.
   */
  const handleCloseModal = () => setShowModal(false);

  /**
   * @function handleChange
   * @description Gestisce le modifiche ai campi del modulo di creazione evento.
   * @param {Event} e - Evento generato dall'input del modulo.
   */
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /**
   * @function fetchUserEvents
   * @description Recupera tutti gli eventi creati dall'utente sulla blockchain.
   */
  const fetchUserEvents = async () => {
    try {
      // Ottiene il signer dell'utente per interagire con i contratti
      const signer = await provider.getSigner();

      // Recupera l'indirizzo dell'utente connesso
      const userAddress = await signer.getAddress();

      // Ottiene il numero totale di eventi registrati
      const totalEvents = await eventFactoryContract.getTotalEvents();

      // Array per memorizzare gli eventi dell'utente
      let userEvents = [];

      // Itera su tutti gli eventi registrati per filtrare quelli creati dall'utente connesso
      for (let i = 0; i < totalEvents; i++) {
        const event = await eventFactoryContract.events(i);

        if (event.creator.toLowerCase() === userAddress.toLowerCase()) {
          userEvents.push({ 
            id: i, 
            name: event.name, 
            state: Number(event.state) // Converte lo stato dell'evento in numero
          });
        }
      }

      // Aggiorna lo stato con gli eventi dell'utente
      setEvents(userEvents);
    } catch (error) {
      console.error("❌ Errore nel recupero eventi:", error);
      toast.error("❌ Errore nel recupero eventi!");
    }
  };  

  /**
   * @function handleCreateEvent
   * @description Crea un nuovo evento sulla blockchain chiamando la funzione `createEvent` dello smart contract `EventFactory`.
   */
  const handleCreateEvent = async () => {
    setLoading(true); // Attiva lo stato di caricamento
    setMessage(""); // Pulisce eventuali messaggi precedenti

    try {        
        // Ottiene il signer dell'utente per eseguire transazioni firmate sulla blockchain
        const signer = await provider.getSigner();

        // Connette il contratto `EventFactory` con il signer per effettuare operazioni in suo nome
        const eventFactoryWithSigner = eventFactoryContract.connect(signer);

        // Converte la data dell'evento da formato umano a timestamp UNIX (secondi)
        const timestamp = Math.floor(new Date(formData.date).getTime() / 1000);

        // Esegue la transazione per creare un nuovo evento
        const tx = await eventFactoryWithSigner.createEvent(
            formData.name, // Nome dell'evento
            formData.location, // Posizione dell'evento
            formData.description, // Descrizione dell'evento
            timestamp, // Data dell'evento in formato UNIX
            ethers.parseEther(formData.price), // Converte il prezzo in formato ETH
            Number(formData.ticketsAvailable) // Numero di biglietti disponibili (convertito in numero intero)
        );

        await tx.wait(); // Attende la conferma della transazione sulla blockchain

        // Mostra un messaggio di successo all'utente
        toast.success("✅ Evento creato con successo!");

        // Chiude il modal di creazione evento
        setShowModal(false);

        // Resetta il modulo di input
        setFormData({ name: "", location: "", description: "", date: "", price: "", ticketsAvailable: "" });

        // Aggiorna la lista degli eventi per includere il nuovo evento creato
        fetchUserEvents();

    } catch (error) {
        console.error("❌ Errore nella creazione dell'evento:", error);
        toast.error("❌ Errore durante la creazione dell'evento.");
    }

    setLoading(false); // Disattiva lo stato di caricamento
  };

  /**
   * @function changeEventState
   * @description Modifica lo stato di un evento esistente sulla blockchain.
   * @param {number} eventId - ID dell'evento da modificare.
   * @param {number} newState - Nuovo stato da assegnare all'evento.
   */
  const changeEventState = async (eventId, newState) => {
    try {
        // Ottiene il signer dell'utente per eseguire operazioni firmate sulla blockchain
        const signer = await provider.getSigner();

        // Connettiamo il contratto `EventFactory` con il signer per effettuare operazioni in suo nome
        const eventFactoryWithSigner = eventFactoryContract.connect(signer);

        // Connettiamo il contratto `TicketManager` con il signer per verificare i biglietti associati
        const ticketManagerWithSigner = ticketManagerContract.connect(signer);

        /**
         * Controllo speciale per l'annullamento dell'evento (stato 3)
         * Se un evento ha già biglietti verificati, non può essere annullato.
         */
        if (newState === 3) { // Stato 3 = Evento annullato
            // Recupera il numero totale di biglietti NFT mintati
            const totalTickets = await ticketManagerWithSigner.getTotalMintedTickets();

            // Itera su tutti i biglietti per controllare se qualcuno è associato a questo evento e già verificato
            for (let i = 1; i <= totalTickets; i++) {
                try {
                    // Recupera l'ID dell'evento a cui è associato il biglietto
                    const ticketEventId = await ticketManagerWithSigner.ticketToEventId(i);

                    // Se il biglietto appartiene all'evento corrente
                    if (ticketEventId.toString() === eventId.toString()) {
                        // Controlla se il biglietto è già stato verificato
                        const isVerified = await ticketManagerWithSigner.isTicketVerified(i);
                        if (isVerified) {
                            console.error("❌ Esistono biglietti già verificati per questo evento!");
                            toast.error("❌ Non puoi annullare un evento con biglietti già verificati!");
                            return; // Blocca l'annullamento dell'evento
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Il biglietto ${i} non esiste o non è associato all'evento.`);
                }
            }
        }

        // Se tutti i controlli sono superati, cambia lo stato dell'evento sulla blockchain
        const tx = await eventFactoryWithSigner.changeEventState(eventId, newState);
        await tx.wait(); // Attende la conferma della transazione sulla blockchain

        // Mostra un messaggio di successo all'utente
        toast.success("✅ Stato evento aggiornato con successo!");

        // Aggiorna la lista degli eventi per riflettere il nuovo stato
        fetchUserEvents();
    } catch (error) {
        console.error("❌ Errore nel cambio di stato:", error);
        toast.error("❌ Errore durante la modifica dello stato.");
    }
  };


  /**
   * @function checkEmergencyStatus
   * @description Controlla se il sistema è in modalità di emergenza (`paused`).
   */
  const checkEmergencyStatus = async () => {
    // Controlla se il contratto `EventFactory` è in stato di pausa
    const isPaused = await eventFactoryContract.paused();

    // Se il sistema è in modalità di emergenza, avvisa l'utente
    if (isPaused) {
        toast.warn("🛑 Il sistema è in modalità di emergenza!");
    }
  };

  /**
   * @function cancelEvent
   * @description Annulla un evento esistente sulla blockchain chiamando la funzione `cancelEvent` dello smart contract `EventFactory`.
   * @param {number} eventId - Identificativo dell'evento da annullare.
   */
  const cancelEvent = async (eventId) => {
    try {
        // Ottiene il signer dell'utente per eseguire operazioni firmate sulla blockchain
        const signer = await provider.getSigner();

        // Connettiamo il contratto `EventFactory` con il signer per effettuare operazioni in suo nome
        const eventFactoryWithSigner = eventFactoryContract.connect(signer);

        // Esegue la transazione per annullare l'evento
        const tx = await eventFactoryWithSigner.cancelEvent(eventId);
        await tx.wait(); // Attende la conferma della transazione sulla blockchain

        // Mostra un messaggio di successo all'utente
        toast.success("✅ Evento annullato con successo!");

        // Aggiorna la lista degli eventi per riflettere il nuovo stato
        fetchUserEvents();
    } catch (error) {
        console.error("❌ Errore nell'annullamento dell'evento:", error);
        toast.error("❌ Impossibile annullare l'evento!");
    }
  };

  /**
   * @function getEventStateLabel
   * @description Restituisce un'etichetta descrittiva dello stato dell'evento basata sul valore numerico dello stato.
   * @param {number} state - Valore numerico dello stato dell'evento.
   * @returns {string} Etichetta descrittiva dello stato dell'evento.
   */
  const getEventStateLabel = (state) => {
    switch (state) {
        case 0:
            return "📌 Creato ma non aperto alla vendita"; // L'evento è stato creato ma non è ancora disponibile per l'acquisto
        case 1:
            return "🟢 Aperto alla vendita"; // I biglietti possono essere acquistati
        case 2:
            return "⏳ Terminato"; // L'evento è chiuso e non più disponibile
        case 3:
            return "❌ Annullato"; // L'evento è stato cancellato e i rimborsi potrebbero essere disponibili
        default:
            return "⚠️ Stato sconosciuto"; // Stato non riconosciuto (errore o contratto modificato)
    }
  };

  /**
   * @returns {JSX.Element} Interfaccia utente per la gestione degli eventi dell'utente.
   */
  return (
    <div className="manage-events-container">
      {/* Titolo della pagina */}
      <h2 className="title-shadow text-center">⚙️ Gestisci i tuoi Eventi</h2>

      {/* Bottone per aprire il modal di creazione di un nuovo evento */}
      <Button className="neu-button mb-3" onClick={handleShowModal}>➕ Crea Nuovo Evento</Button>

      {/* Messaggio informativo per l'utente (se presente) */}
      {message && <Alert variant="info">{message}</Alert>}
      
      {/* Contenitore dello slider per scorrere tra gli eventi creati dall'utente */}
      <div className="slider-container position-relative">
        {/* Pulsante per scorrere verso sinistra nella lista degli eventi */}
        <button 
          className="slider-button left" 
          onClick={() => scrollRef.current.scrollBy({ left: -300, behavior: "smooth" })}
        >
          ⬅️
        </button>

        {/* Lista degli eventi gestiti dall'utente */}
        <div className="event-slider" ref={scrollRef}>
          {events.map((event) => (
            <Card key={event.id} className="event-card text-white">
              <Card.Body>
                {/* Titolo dell'evento */}
                <Card.Title>{event.name}</Card.Title>

                {/* Stato dell'evento con etichetta leggibile */}
                <Card.Text>🔄 Stato: {getEventStateLabel(event.state)}</Card.Text>

                {/* Pulsanti per aprire le vendite o annullare l'evento */}
                <div className="d-flex justify-content-between">
                  <Button className="btn-primary" onClick={() => changeEventState(event.id, 1)}>Apri Vendite</Button>
                  <Button className="btn-danger" onClick={() => changeEventState(event.id, 3)}>Annulla Evento</Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Pulsante per scorrere verso destra nella lista degli eventi */}
        <button 
          className="slider-button right" 
          onClick={() => scrollRef.current.scrollBy({ left: 300, behavior: "smooth" })}
        >
          ➡️
        </button>
      </div>

      {/* Modale per la Creazione dell'Evento */}
      <Modal show={showModal} onHide={handleCloseModal} className="neu-modal">
        <Modal.Header closeButton>
          <Modal.Title>➕ Crea un Nuovo Evento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Input per il Nome dell'evento */}
            <Form.Group>
              <Form.Label>Nome Evento</Form.Label>
              <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required />
            </Form.Group>

            {/* Input per la Posizione dell'evento */}
            <Form.Group>
              <Form.Label>Luogo</Form.Label>
              <Form.Control type="text" name="location" value={formData.location} onChange={handleChange} required />
            </Form.Group>

            {/* Campo di testo per la descrizione dell'evento */}
            <Form.Group>
              <Form.Label>Descrizione Evento</Form.Label>
              <Form.Control as="textarea" rows={3} name="description" value={formData.description} onChange={handleChange} required />
            </Form.Group>

            {/* Input per la Data dell'evento (con restrizione per date passate) */}
            <Form.Group>
              <Form.Label>Data</Form.Label>
              <Form.Control type="date" name="date" value={formData.date} min={new Date().toISOString().split("T")[0]} onChange={handleChange} required />
            </Form.Group>

            {/* Input per il Prezzo del biglietto in ETH */}
            <Form.Group>
              <Form.Label>Prezzo del Biglietto (ETH)</Form.Label>
              <Form.Control type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required />
            </Form.Group>

            {/* Input per il numero totale di biglietti disponibili */}
            <Form.Group>
              <Form.Label>Biglietti Disponibili</Form.Label>
              <Form.Control type="number" name="ticketsAvailable" value={formData.ticketsAvailable} onChange={handleChange} required />
            </Form.Group>
          </Form>
        </Modal.Body>

        {/* Pulsanti di controllo nel modal */}
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Chiudi</Button>
          <Button className="btn-primary" onClick={handleCreateEvent} disabled={loading}>
            {loading ? "Creazione in corso..." : "Crea Evento"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManageEvents;
