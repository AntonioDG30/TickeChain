import React from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../custom.css";

const Login = ({ connectWallet }) => {
  const navigate = useNavigate();

  const handleConnect = async () => {
    await connectWallet();
    navigate("/");
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-gradient-primary text-white">
      <div className="neu-card text-center p-5 w-40 rounded-4 shadow-lg border-0 bg-dark-blue">
        <h1 className="fw-bold text-light mb-3 title-shadow">TickeChain</h1>
        <p className="text-muted fs-5">Accedi con il tuo wallet per continuare.</p>
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
