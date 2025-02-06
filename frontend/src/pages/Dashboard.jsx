import React from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import EventList from "./EventList";
import ManageEvents from "./ManageEvents";
import MyTickets from "./MyTickets";
import { Button } from "react-bootstrap";

const Dashboard = ({ account, disconnectWallet }) => {
  const navigate = useNavigate(); // Adesso useNavigate funziona correttamente

  return (
    <div className="container mt-4">
      <h1 className="text-center">🎟️ TickeChain</h1>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <nav className="nav nav-tabs">
          <Link className="nav-link" to="/">🎟️ Eventi Disponibili</Link>
          <Link className="nav-link" to="/manage-events">⚙️ Gestisci Eventi</Link>
          <Link className="nav-link" to="/my-tickets">🎫 Biglietti Personali</Link>
        </nav>
        <Button variant="danger" onClick={() => { disconnectWallet(); navigate("/login"); }}>
          ❌ Disconnetti
        </Button>
      </div>
      <Routes>
        <Route path="/" element={<EventList account={account} />} />
        <Route path="/manage-events" element={<ManageEvents account={account} />} />
        <Route path="/my-tickets" element={<MyTickets account={account} />} />
      </Routes>
    </div>
  );
};

export default Dashboard;
