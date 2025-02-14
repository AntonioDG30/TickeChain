import React from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import EventList from "./EventList";
import ManageEvents from "./ManageEvents";
import MyTickets from "./MyTickets";
import EventVerification from "./EventVerification";
import { Button } from "react-bootstrap";
import "../custom.css";

const Dashboard = ({ account, disconnectWallet }) => {
  const navigate = useNavigate();

  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-gradient-primary text-white">
      <div className="neu-card w-75 p-4 rounded-4 shadow-lg border-0 bg-dark-blue">
        <h1 className="fw-bold text-light text-center title-shadow">🎟️ TickeChain</h1>
        <div className="d-flex justify-content-between align-items-center my-4">
          <nav className="nav flex-grow-1 d-flex justify-content-around">
            <Link className="nav-link custom-link" to="/">🎟️ Eventi Disponibili</Link>
            <Link className="nav-link custom-link" to="/manage-events">⚙️ Gestisci Eventi</Link>
            <Link className="nav-link custom-link" to="/my-tickets">🎫 Biglietti Personali</Link>
            <Link className="nav-link custom-link" to="/event-verification">🎫 Verifica Eventi</Link>
          </nav>
          <Button className="btn btn-danger rounded-pill shadow-md px-4 py-2" onClick={() => { disconnectWallet(); navigate("/login"); }}>
            ❌ Disconnetti
          </Button>
        </div>
        <div className="content-wrapper w-100">
          <Routes>
            <Route path="/" element={<EventList account={account} />} />
            <Route path="/manage-events" element={<ManageEvents account={account} />} />
            <Route path="/my-tickets" element={<MyTickets account={account} />} />
            <Route path="/event-verification" element={<EventVerification account={account} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
