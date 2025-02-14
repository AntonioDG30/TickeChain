import React, { useEffect, useState, useRef } from "react";
import { Button, Form, Modal, Alert, Card } from "react-bootstrap";
import { ethers } from "ethers";
import { eventFactoryContract, provider } from "../utils/contracts";
import { toast } from "react-toastify";
import "../custom.css";

const ManageEvents = ({ account }) => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    date: "",
    price: "",
    ticketsAvailable: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    checkEmergencyStatus();
    fetchUserEvents();
  }, [account]);

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchUserEvents = async () => {
    try {
      toast.info("📡 Recupero eventi...");
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const totalEvents = await eventFactoryContract.getTotalEvents();
      let userEvents = [];

      for (let i = 0; i < totalEvents; i++) {
        const event = await eventFactoryContract.events(i);
        if (event.creator.toLowerCase() === userAddress.toLowerCase()) {
          userEvents.push({ 
            id: i, 
            name: event.name, 
            state: Number(event.state) 
          });
        }
      }

      setEvents(userEvents);
      toast.success("✅ Eventi aggiornati!");
    } catch (error) {
      console.error("❌ Errore nel recupero eventi:", error);
      toast.error("❌ Errore nel recupero eventi!");
    }
  };

  const handleCreateEvent = async () => {
    setLoading(true);
    setMessage("");

    try {
      toast.info("⌛ Creazione evento in corso...");
      const signer = await provider.getSigner();
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);

      const timestamp = Math.floor(new Date(formData.date).getTime() / 1000);
      const tx = await eventFactoryWithSigner.createEvent(
        formData.name,
        formData.location,
        formData.description,
        timestamp,
        ethers.parseEther(formData.price),
        Number(formData.ticketsAvailable)
      );
      
      await tx.wait();
      toast.success("✅ Evento creato con successo!");
      setShowModal(false);
      setFormData({ name: "", location: "", description: "", date: "", price: "", ticketsAvailable: "" });

      fetchUserEvents(); // Aggiorna la lista eventi senza ricaricare la pagina

    } catch (error) {
      console.error("❌ Errore nella creazione dell'evento:", error);
      toast.error("❌ Errore durante la creazione dell'evento.");
    }

    setLoading(false);
  };

  const changeEventState = async (eventId, newState) => {
    try {
      toast.info("⌛ Modifica dello stato evento...");
      const signer = await provider.getSigner();
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);

      const tx = await eventFactoryWithSigner.changeEventState(eventId, newState);
      await tx.wait();

      toast.success("✅ Stato evento aggiornato con successo!");
      fetchUserEvents();
    } catch (error) {
      console.error("❌ Errore nel cambio di stato:", error);
      toast.error("❌ Errore durante la modifica dello stato.");
    }
  };

  const checkEmergencyStatus = async () => {
    const isPaused = await eventFactoryContract.paused();
    if (isPaused) {
      toast.warn("🛑 Il sistema è in modalità di emergenza!");
    }
  };

  const cancelEvent = async (eventId) => {
    try {
      console.log(`🚨 Tentativo di annullamento per evento ID: ${eventId}`);
      toast.info(`🚨 Tentativo di annullamento per evento #${eventId}`);

      const signer = await provider.getSigner();
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);

      const tx = await eventFactoryWithSigner.cancelEvent(eventId);
      await tx.wait();

      toast.success("✅ Evento annullato con successo!");
      fetchUserEvents();
    } catch (error) {
      console.error("❌ Errore nell'annullamento dell'evento:", error);
      toast.error("❌ Impossibile annullare l'evento!");
    }
  };

  return (
    <div className="manage-events-container">
      <h2 className="title-shadow text-center">⚙️ Gestisci i tuoi Eventi</h2>
      <Button className="neu-button mb-3" onClick={handleShowModal}>➕ Crea Nuovo Evento</Button>

      {message && <Alert variant="info">{message}</Alert>}
      
      <div className="slider-container position-relative">
        <button className="slider-button left" onClick={() => scrollRef.current.scrollBy({ left: -300, behavior: "smooth" })}>⬅️</button>
        <div className="event-slider" ref={scrollRef}>
          {events.map((event) => (
            <Card key={event.id} className="event-card text-white">
              <Card.Body>
                <Card.Title>{event.name}</Card.Title>
                <Card.Text>🔄 Stato: {event.state}</Card.Text>
                <div className="d-flex justify-content-between">
                  <Button className="btn-primary" onClick={() => changeEventState(event.id, 1)}>Apri Vendite</Button>
                  <Button className="btn-danger" onClick={() => changeEventState(event.id, 3)}>Annulla Evento</Button>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
        <button className="slider-button right" onClick={() => scrollRef.current.scrollBy({ left: 300, behavior: "smooth" })}>➡️</button>
      </div>

      {/* Modale per la Creazione dell'Evento */}
      <Modal show={showModal} onHide={handleCloseModal} className="neu-modal">
        <Modal.Header closeButton>
          <Modal.Title>➕ Crea un Nuovo Evento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Nome Evento</Form.Label>
              <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Luogo</Form.Label>
              <Form.Control type="text" name="location" value={formData.location} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Descrizione Evento</Form.Label>
              <Form.Control as="textarea" rows={3} name="description" value={formData.description} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Data</Form.Label>
              <Form.Control type="date" name="date" value={formData.date} min={new Date().toISOString().split("T")[0]} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Prezzo del Biglietto (ETH)</Form.Label>
              <Form.Control type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Biglietti Disponibili</Form.Label>
              <Form.Control type="number" name="ticketsAvailable" value={formData.ticketsAvailable} onChange={handleChange} required />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Chiudi</Button>
          <Button className="btn-primary" onClick={handleCreateEvent} disabled={loading}>{loading ? "Creazione in corso..." : "Crea Evento"}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManageEvents;
