import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [account, setAccount] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
        toast.success("🔗 Wallet connesso con successo!");
      } catch (error) {
        console.error("❌ Errore durante la connessione:", error);
        toast.error("❌ Errore durante la connessione al wallet!");
      }
    } else {
      toast.warn("⚠️ Installa MetaMask per continuare!");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    toast.info("❌ Wallet disconnesso!");
  };

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      }
    };

    checkWalletConnection();

    window.ethereum?.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(null); 
      }
    });

    return () => {
      window.ethereum?.removeListener("accountsChanged", () => {});
    };
  }, []);

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/login" element={<Login connectWallet={connectWallet} />} />
        <Route path="/*" element={<ProtectedRoute account={account} disconnectWallet={disconnectWallet} />} />
      </Routes>
    </Router>
  );
}

import { useNavigate } from "react-router-dom";

const ProtectedRoute = ({ account, disconnectWallet }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!account) {
      toast.warn("⚠️ Sei stato disconnesso!");
      navigate("/login");
    }
  }, [account, navigate]);

  return account ? <Dashboard account={account} disconnectWallet={disconnectWallet} /> : null;
};

export default App;
