// Importazione delle librerie principali di React e React Router
import React from "react";
import { useNavigate } from "react-router-dom";

// Importazione di Bootstrap per lo stile e il layout responsivo
import "bootstrap/dist/css/bootstrap.min.css";

// Importazione del file CSS personalizzato per la stilizzazione della pagina di login
import "../custom.css";

/**
 * @function Login
 * @description Componente per la pagina di accesso tramite wallet Ethereum.
 * @param {Object} props
 * @param {Function} props.connectWallet - Funzione per connettere il wallet Ethereum.
 * @returns {JSX.Element} Interfaccia utente della pagina di login.
 */
const Login = ({ connectWallet }) => {
  const navigate = useNavigate(); // Hook per la navigazione tra le pagine

  /**
   * @function handleConnect
   * @description Gestisce la connessione al wallet e reindirizza alla Dashboard.
   */
  const handleConnect = async () => {
    await connectWallet(); // Chiama la funzione per connettere il wallet
    navigate("/"); // Reindirizza l'utente alla Dashboard dopo la connessione
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-gradient-primary text-white">
      {/* Contenitore principale con effetto Neumorfismo */}
      <div className="neu-card text-center p-5 w-40 rounded-4 shadow-lg border-0 bg-dark-blue">
        {/* Titolo dell'applicazione con ombra per un effetto visivo migliore */}
        <h1 className="fw-bold text-light mb-3 title-shadow">TickeChain</h1>

        {/* Messaggio di istruzione per l'utente */}
        <p className="text-white-50 fs-5">Accedi con il tuo wallet per continuare.</p>

        {/* Pulsante per connettere il wallet */}
        <button 
          onClick={handleConnect} 
          className="btn btn-primary mt-4 px-5 py-3 rounded-pill fw-bold text-uppercase shadow-md"
        >
          🔗 Connettiti al Wallet
        </button>
      </div>
    </div>
  );
};

export default Login;
