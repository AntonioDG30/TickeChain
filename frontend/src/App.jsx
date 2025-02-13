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
  }, []);

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/login" element={<Login connectWallet={connectWallet} />} />
        <Route path="/*" element={account ? <Dashboard account={account} disconnectWallet={disconnectWallet} /> : <Login connectWallet={connectWallet} />} />
      </Routes>
    </Router>
  );
}

export default App;
