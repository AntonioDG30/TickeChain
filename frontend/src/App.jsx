import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  const [account, setAccount] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("❌ Errore durante la connessione:", error);
      }
    } else {
      alert("⚠️ Installa MetaMask per continuare!");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
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
      <Routes>
        <Route path="/login" element={<Login connectWallet={connectWallet} />} />
        <Route path="/*" element={account ? <Dashboard account={account} disconnectWallet={disconnectWallet} /> : <Login connectWallet={connectWallet} />} />
      </Routes>
    </Router>
  );
}

export default App;
