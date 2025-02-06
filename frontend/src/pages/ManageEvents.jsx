import React, { useEffect, useState } from "react";
import { Button, Form, Modal, Alert } from "react-bootstrap";
import { ethers } from "ethers";
import { eventFactoryContract, provider } from "../utils/contracts";

const ManageEvents = ({ account }) => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    date: "",
    price: "",
    ticketsAvailable: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserEvents = async () => {
      try {
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
      } catch (error) {
        console.error("❌ Errore nel recupero eventi:", error);
      }
    };

    fetchUserEvents();
  }, [account]);

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateEvent = async () => {
    setLoading(true);
    setMessage("");

    try {
      const signer = await provider.getSigner();
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);

      const timestamp = Math.floor(new Date(formData.date).getTime() / 1000);
      const tx = await eventFactoryWithSigner.createEvent(
        formData.name,
        formData.location,
        timestamp,
        ethers.parseEther(formData.price),
        Number(formData.ticketsAvailable)
      );

      await tx.wait();
      setMessage("✅ Evento creato con successo!");
      setShowModal(false);
      setFormData({ name: "", location: "", date: "", price: "", ticketsAvailable: "" });

      window.location.reload(); // Ricarica la lista eventi

    } catch (error) {
      console.error("❌ Errore nella creazione dell'evento:", error);
      setMessage("❌ Errore durante la creazione dell'evento.");
    }

    setLoading(false);
  };

  const changeEventState = async (eventId, newState) => {
    try {
      setMessage("");
      const signer = await provider.getSigner();
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);

      const tx = await eventFactoryWithSigner.changeEventState(eventId, newState);
      await tx.wait();

      setMessage("✅ Stato evento aggiornato con successo!");
      window.location.reload();
    } catch (error) {
      console.error("❌ Errore nel cambio di stato:", error);
      setMessage("❌ Errore durante la modifica dello stato.");
    }
  };

  const cancelEvent = async (eventId) => {
    try {
      setMessage("");
      const signer = await provider.getSigner();
      const eventFactoryWithSigner = eventFactoryContract.connect(signer);

      const tx = await eventFactoryWithSigner.cancelEvent(eventId);
      await tx.wait();

      setMessage("✅ Evento annullato con successo!");
      window.location.reload();
    } catch (error) {
      console.error("❌ Errore nell'annullamento dell'evento:", error);
      setMessage("❌ Errore durante l'annullamento dell'evento.");
    }
  };

  return (
    <div className="mt-4">
      <h2 className="text-center">⚙️ Gestisci i tuoi Eventi</h2>

      <Button className="mb-3" onClick={handleShowModal}>
        ➕ Crea Nuovo Evento
      </Button>

      {message && <Alert variant="info">{message}</Alert>}

      <ul>
        {events.map((event) => (
          <li key={event.id} className="mb-2">
            {event.name} - Stato: {event.state}
            <Button variant="warning" size="sm" className="mx-2" onClick={() => changeEventState(event.id, 1)}>
              Apri Vendite
            </Button>
            <Button variant="danger" size="sm" onClick={() => cancelEvent(event.id)}>
              Annulla Evento
            </Button>
          </li>
        ))}
      </ul>

      {/* Modale per la Creazione dell'Evento */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>➕ Crea un Nuovo Evento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Nome Evento</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="Inserisci il nome"
                value={formData.name}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Luogo</Form.Label>
              <Form.Control
                type="text"
                name="location"
                placeholder="Inserisci la location"
                value={formData.location}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Data</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Prezzo del Biglietto (ETH)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                name="price"
                placeholder="0.1"
                value={formData.price}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Biglietti Disponibili</Form.Label>
              <Form.Control
                type="number"
                name="ticketsAvailable"
                placeholder="100"
                value={formData.ticketsAvailable}
                onChange={handleChange}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Chiudi
          </Button>
          <Button variant="primary" onClick={handleCreateEvent} disabled={loading}>
            {loading ? "Creazione in corso..." : "Crea Evento"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManageEvents;
