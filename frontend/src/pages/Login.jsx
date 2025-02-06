import React from "react";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const Login = ({ connectWallet }) => {
  const navigate = useNavigate(); // Hook per il redirect

  const handleConnect = async () => {
    await connectWallet(); // Connette il wallet
    navigate("/"); // Reindirizza alla dashboard
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center vh-100">
      <h1>🎟️ TickeChain</h1>
      <p>Connettiti con il tuo wallet per accedere alla piattaforma.</p>
      <Button onClick={handleConnect} variant="primary">🔗 Connettiti al Wallet</Button>
    </div>
  );
};

export default Login;
