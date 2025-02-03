import React from "react";
import { Button } from "react-bootstrap";
import { ethers } from "ethers";

const WalletConnect = ({ setAccount }) => {
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
      } catch (error) {
        console.error("Errore durante la connessione:", error);
      }
    } else {
      alert("Installa Metamask per continuare!");
    }
  };

  return (
    <div className="text-center">
      <Button onClick={connectWallet} variant="primary">Connetti Wallet</Button>
    </div>
  );
};

export default WalletConnect;
