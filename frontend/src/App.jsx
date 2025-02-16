// Importazione delle librerie principali di React e React Router
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Importazione delle pagine principali dell'applicazione
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Importazione della libreria di notifiche Toastify per messaggi utente
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * @function App
 * @description Componente principale dell'applicazione che gestisce il routing e la connessione al wallet Ethereum.
 * @returns {JSX.Element} L'interfaccia utente con il router e le notifiche.
 */
function App() {
  // Stato per memorizzare l'account Ethereum connesso
  const [account, setAccount] = useState(null);

  /**
   * @function connectWallet
   * @description Tenta di connettere il wallet Ethereum utilizzando MetaMask.
   * Se la connessione ha successo, aggiorna lo stato con l'account connesso.
   */
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Richiede l'autorizzazione per accedere agli account Ethereum dell'utente
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

        // Imposta l'account connesso nello stato
        setAccount(accounts[0]);

        // Mostra un messaggio di successo all'utente
        toast.success("🔗 Wallet connesso con successo!");
      } catch (error) {
        console.error("❌ Errore durante la connessione:", error);
        toast.error("❌ Errore durante la connessione al wallet!");
      }
    } else {
      toast.warn("⚠️ Installa MetaMask per continuare!");
    }
  };

  /**
   * @function disconnectWallet
   * @description Disconnette il wallet Ethereum, rimuovendo l'account dallo stato.
   */
  const disconnectWallet = () => {
    setAccount(null);
    toast.info("❌ Wallet disconnesso!");
  };

  /**
   * @function useEffect
   * @description Controlla se un wallet è già connesso quando l'app viene caricata.
   * Aggiunge anche un listener per rilevare cambiamenti negli account di MetaMask.
   */
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        // Recupera gli account già autorizzati in MetaMask
        const accounts = await window.ethereum.request({ method: "eth_accounts" });

        // Se esiste un account connesso, lo imposta nello stato
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      }
    };

    // Chiama la funzione per controllare la connessione
    checkWalletConnection();

    // Listener per rilevare cambiamenti nell'account MetaMask
    window.ethereum?.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet(); // Se non ci sono più account connessi, esegue la disconnessione
      } else {
        setAccount(null); // Resetta l'account per forzare il login
      }
    });

    // Cleanup: rimuove il listener quando il componente viene smontato
    return () => {
      window.ethereum?.removeListener("accountsChanged", () => {});
    };
  }, []);

  return (
    <Router>
      {/* Contenitore per le notifiche */}
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Definizione delle rotte dell'applicazione */}
      <Routes>
        {/* Pagina di login */}
        <Route path="/login" element={<Login connectWallet={connectWallet} />} />

        {/* Rotta protetta per la Dashboard: se non c'è un account, viene reindirizzato */}
        <Route path="/*" element={<ProtectedRoute account={account} disconnectWallet={disconnectWallet} />} />
      </Routes>
    </Router>
  );
}

// Importazione di `useNavigate` per la gestione della navigazione nelle rotte
import { useNavigate } from "react-router-dom";

/**
 * @function ProtectedRoute
 * @description Componente che protegge l'accesso alla Dashboard: se l'utente non è connesso, lo reindirizza al login.
 * @param {Object} props
 * @param {string|null} props.account - Indirizzo dell'account Ethereum connesso.
 * @param {Function} props.disconnectWallet - Funzione per disconnettere il wallet.
 * @returns {JSX.Element|null} Dashboard se l'utente è connesso, altrimenti null.
 */
const ProtectedRoute = ({ account, disconnectWallet }) => {
  const navigate = useNavigate(); // Hook per la navigazione tra le pagine

  useEffect(() => {
    if (!account) {
      toast.warn("⚠️ Sei stato disconnesso!");
      navigate("/login"); // Se l'utente non è connesso, viene reindirizzato al login
    }
  }, [account, navigate]);

  // Se l'account è connesso, mostra la Dashboard, altrimenti restituisce null
  return account ? <Dashboard account={account} disconnectWallet={disconnectWallet} /> : null;
};

export default App;
