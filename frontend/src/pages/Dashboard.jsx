// Importazione delle librerie principali di React e React Router
import React from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";

// Importazione dei componenti che rappresentano le diverse sezioni della Dashboard
import EventList from "./EventList";
import ManageEvents from "./ManageEvents";
import MyTickets from "./MyTickets";
import EventVerification from "./EventVerification";

// Importazione del componente `Button` da React Bootstrap per una UI più elegante
import { Button } from "react-bootstrap";

// Importazione del file CSS personalizzato per lo stile della Dashboard
import "../custom.css";

/**
 * @function Dashboard
 * @description Componente principale della Dashboard dell'applicazione TickeChain.
 * @param {Object} props
 * @param {string|null} props.account - Indirizzo dell'account Ethereum connesso.
 * @param {Function} props.disconnectWallet - Funzione per disconnettere il wallet dell'utente.
 * @returns {JSX.Element} Interfaccia utente della Dashboard con navigazione e gestione eventi.
 */
const Dashboard = ({ account, disconnectWallet }) => {
  const navigate = useNavigate(); // Hook per la navigazione tra le pagine

  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100 bg-gradient-primary text-white">
      {/* Contenitore principale della Dashboard con effetto Neumorfismo */}
      <div className="neu-card w-75 p-4 rounded-4 shadow-lg border-0 bg-dark-blue">
        {/* Titolo della piattaforma con effetto visivo */}
        <h1 className="fw-bold text-light text-center title-shadow">🎟️ TickeChain</h1>

        {/* Barra di navigazione con i collegamenti alle varie sezioni della Dashboard */}
        <div className="d-flex justify-content-between align-items-center my-4">
          <nav className="nav flex-grow-1 d-flex justify-content-around">
            <Link className="nav-link custom-link" to="/">🎟️ Eventi Disponibili</Link>
            <Link className="nav-link custom-link" to="/manage-events">⚙️ Gestisci Eventi</Link>
            <Link className="nav-link custom-link" to="/my-tickets">🎫 Biglietti Personali</Link>
            <Link className="nav-link custom-link" to="/event-verification">🎫 Verifica Eventi</Link>
          </nav>

          {/* Pulsante di disconnessione del wallet */}
          <Button
            className="btn btn-danger rounded-pill shadow-md px-4 py-2"
            onClick={() => {
              disconnectWallet(); // Disconnette il wallet
              navigate("/login"); // Reindirizza alla pagina di login
            }}
          >
            ❌ Disconnetti
          </Button>
        </div>

        {/* Contenitore per il rendering delle diverse pagine della Dashboard */}
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
