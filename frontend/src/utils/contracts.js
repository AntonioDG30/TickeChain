// Importazione delle librerie di Ethers.js per interagire con la blockchain Ethereum
import { JsonRpcProvider, BrowserProvider, Contract } from "ethers";

// Importazione degli indirizzi dei contratti smart
import contractAddresses from "./contract-addresses.json";

// Importazione degli ABI dei contratti smart
import EventFactoryABI from "../../../artifacts/contracts/EventFactory.sol/EventFactory.json";
import TicketManagerABI from "../../../artifacts/contracts/TicketManager.sol/TicketManager.json";
import PaymentManagerABI from "../../../artifacts/contracts/PaymentManager.sol/PaymentManager.json";

/**
 * @constant provider
 * @description Configura il provider per la connessione alla blockchain.
 * Se MetaMask è disponibile, usa `BrowserProvider` per interagire con Ethereum attraverso il browser.
 * Se MetaMask non è disponibile, usa `JsonRpcProvider` per connettersi a una blockchain locale (Ganache).
 */
const provider = window.ethereum
  ? new BrowserProvider(window.ethereum)  // Usa MetaMask per transazioni firmate
  : new JsonRpcProvider("http://127.0.0.1:7545"); // Usa Ganache per test in locale

/**
 * @constant EVENT_FACTORY_ADDRESS
 * @constant TICKET_MANAGER_ADDRESS
 * @constant PAYMENT_MANAGER_ADDRESS
 * @description Recupera gli indirizzi deployati dei contratti dalla configurazione JSON.
 */
const EVENT_FACTORY_ADDRESS = contractAddresses.EventFactory;
const TICKET_MANAGER_ADDRESS = contractAddresses.TicketManager;
const PAYMENT_MANAGER_ADDRESS = contractAddresses.PaymentManager;

/**
 * @constant eventFactoryContract
 * @description Istanza del contratto `EventFactory`, che gestisce la creazione e gestione degli eventi.
 */
const eventFactoryContract = new Contract(EVENT_FACTORY_ADDRESS, EventFactoryABI.abi, provider);

/**
 * @constant ticketManagerContract
 * @description Istanza del contratto `TicketManager`, che gestisce l'emissione, il trasferimento e la validazione dei biglietti NFT.
 */
const ticketManagerContract = new Contract(TICKET_MANAGER_ADDRESS, TicketManagerABI.abi, provider);

/**
 * @constant paymentManagerContract
 * @description Istanza del contratto `PaymentManager`, che gestisce i pagamenti e i rimborsi dei biglietti.
 */
const paymentManagerContract = new Contract(PAYMENT_MANAGER_ADDRESS, PaymentManagerABI.abi, provider);

/**
 * @exports provider, eventFactoryContract, ticketManagerContract, paymentManagerContract
 * @description Esporta il provider e le istanze dei contratti per essere utilizzati in altre parti dell'applicazione.
 */
export { provider, eventFactoryContract, ticketManagerContract, paymentManagerContract };
