import { BrowserProvider, Contract } from "ethers";
import contractAddresses from "./contract-addresses.json";

// Importiamo gli ABI direttamente dagli artifacts di Hardhat
import EventFactoryABI from "../../../artifacts/contracts/EventFactory.sol/EventFactory.json";
import TicketManagerABI from "../../../artifacts/contracts/TicketManager.sol/TicketManager.json";
import PaymentManagerABI from "../../../artifacts/contracts/PaymentManager.sol/PaymentManager.json";

// Inizializza il provider (connessione a MetaMask)
const provider = new BrowserProvider(window.ethereum);

// Recuperiamo gli indirizzi dal file JSON
const EVENT_FACTORY_ADDRESS = contractAddresses.EventFactory;
const TICKET_MANAGER_ADDRESS = contractAddresses.TicketManager;
const PAYMENT_MANAGER_ADDRESS = contractAddresses.PaymentManager;

// Creiamo le istanze dei contratti
const eventFactoryContract = new Contract(EVENT_FACTORY_ADDRESS, EventFactoryABI.abi, provider);
const ticketManagerContract = new Contract(TICKET_MANAGER_ADDRESS, TicketManagerABI.abi, provider);
const paymentManagerContract = new Contract(PAYMENT_MANAGER_ADDRESS, PaymentManagerABI.abi, provider);

export { provider, eventFactoryContract, ticketManagerContract, paymentManagerContract };
