import { JsonRpcProvider, BrowserProvider, Contract } from "ethers";
import contractAddresses from "./contract-addresses.json";

import EventFactoryABI from "../../../artifacts/contracts/EventFactory.sol/EventFactory.json";
import TicketManagerABI from "../../../artifacts/contracts/TicketManager.sol/TicketManager.json";
import PaymentManagerABI from "../../../artifacts/contracts/PaymentManager.sol/PaymentManager.json";

const provider = window.ethereum
  ? new BrowserProvider(window.ethereum)  // MetaMask per transazioni
  : new JsonRpcProvider("http://127.0.0.1:7545"); // Ganache

const EVENT_FACTORY_ADDRESS = contractAddresses.EventFactory;
const TICKET_MANAGER_ADDRESS = contractAddresses.TicketManager;
const PAYMENT_MANAGER_ADDRESS = contractAddresses.PaymentManager;

const eventFactoryContract = new Contract(EVENT_FACTORY_ADDRESS, EventFactoryABI.abi, provider);
const ticketManagerContract = new Contract(TICKET_MANAGER_ADDRESS, TicketManagerABI.abi, provider);
const paymentManagerContract = new Contract(PAYMENT_MANAGER_ADDRESS, PaymentManagerABI.abi, provider);

export { provider, eventFactoryContract, ticketManagerContract, paymentManagerContract };
