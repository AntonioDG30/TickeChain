// Importazione dei moduli principali di React
import React from "react";
import ReactDOM from "react-dom/client"; // Importa ReactDOM per renderizzare l'app nella root del DOM

// Importazione del componente principale dell'applicazione
import App from "./App";

// Importazione di Bootstrap per lo stile e il layout responsivo
import "bootstrap/dist/css/bootstrap.min.css";

// Importazione del file CSS personalizzato per sovrascrivere gli stili di default di Bootstrap
import "./custom.css"; 

// Montaggio dell'applicazione React all'interno dell'elemento con id "root" nel DOM
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode> {/* Abilita controlli extra e avvisi per codice potenzialmente problematico */}
    <App /> {/* Componente principale dell'applicazione */}
  </React.StrictMode>
);
