import React, { useState } from "react";
import { Button, Form, Alert } from "react-bootstrap";
import { ethers } from "ethers";
import { provider, paymentManagerContract, eventFactoryContract } from "../utils/contracts";

const RefundRequest = ({ account }) => {
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const requestRefund = async () => {
    setLoading(true);
    setMessage("");

    try {
      const signer = await provider.getSigner();

      // Verifica che l'evento sia stato annullato
      const isCancelled = await eventFactoryContract.isEventCancelled(eventId);
      if (!isCancelled) {
        setMessage("❌ Questo evento non è stato annullato, non puoi richiedere un rimborso.");
        setLoading(false);
        return;
      }

      // Chiamata alla funzione processRefund nel contratto PaymentManager
      const tx = await paymentManagerContract.connect(signer).processRefund(account, ethers.parseEther("0.1"), eventId);
      await tx.wait();

      setMessage("✅ Rimborso richiesto con successo!");
    } catch (error) {
      console.error("Errore nel rimborso:", error);
      setMessage("❌ Errore durante la richiesta di rimborso.");
    }

    setLoading(false);
  };

  return (
    <div className="mt-4">
      <h2>🔄 Richiedi un Rimborso</h2>
      <Form>
        <Form.Group>
          <Form.Label>ID Evento</Form.Label>
          <Form.Control
            type="number"
            placeholder="Inserisci l'ID dell'evento"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          />
        </Form.Group>
        <Button onClick={requestRefund} disabled={loading} className="mt-2">
          {loading ? "Elaborazione..." : "Richiedi Rimborso"}
        </Button>
      </Form>
      {message && <Alert className="mt-3">{message}</Alert>}
    </div>
  );
};

export default RefundRequest;
