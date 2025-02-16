# TickeChain

TickeChain is a decentralized platform developed for the **Data Security** exam of the **Master's Degree in Cybersecurity** at **Università degli Studi di Salerno**.

TickeChain enables users to create events, issue **NFT-based tickets**, manage sales and refunds, and verify ticket validity using advanced cryptographic techniques. The entire system is designed to be **secure, flexible, and highly transparent**, eliminating intermediaries and providing advanced control tools for both organizers and participants. This ensures that event management is **decentralized and resistant to fraud**, while ticket validation is seamless and tamper-proof.

## Features

- **Event Management:** Create and manage events with structured states (**CREATED → OPEN → CLOSED → CANCELLED**).
- **NFT Ticketing (ERC-721):** Tickets are non-fungible tokens, ensuring authenticity and uniqueness.
- **Payments & Refunds in ETH:** Tickets can only be purchased and refunded using Ethereum.
- **QR Code Validation with Digital Signature:** The system uses cryptographic signatures to validate tickets.
- **Emergency Stop Mechanism (Circuit Breaker):** Temporarily suspend the system in case of security concerns.

## Technology Stack

### Blockchain & Smart Contracts

- **Solidity** - Smart contract development language.
- **Ethereum (EVM Compatible)** - Blockchain used for managing events and tickets.
- **OpenZeppelin** - Security libraries for NFT and payment management.
- **Hardhat** - Development, testing, and deployment framework for smart contracts.

### Frontend

- **Vite** - Fast development server and build tool.
- **React.js** - Modern and interactive UI.
- **Bootstrap** - Styling framework for responsive design.
- **Ethers.js** - Library for Ethereum blockchain interaction.
- **React-QR-Code** - QR Code generation for ticket validation.
- **HTML5-Qrcode** - Library for scanning QR codes.
- **Html2Canvas** - Converts HTML elements into images.
- **React-Toastify** - Provides notifications for user interactions.

### Backend & Storage

- **MetaMask** - Wallet integration for transactions.
- **Ganache** - Local Ethereum blockchain for development and testing.

## Developer

The project was entirely developed by:

**Antonio Di Giorgio**  
Role: Developer & Smart Contract Engineer  
GitHub: [@AntonioDG30](https://github.com/AntonioDG30)

## Getting Started

### 1️⃣ Install Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js** (Latest LTS version) - Download from [Node.js](https://nodejs.org)
- **MetaMask Extension** - Install for Chrome or Firefox
- **Ganache** - Ethereum blockchain simulator for local development:
  - Download from [Truffle Suite](https://trufflesuite.com/ganache/)
  - Start a new local blockchain instance with a custom RPC URL (e.g., `http://127.0.0.1:7545`)

### 2️⃣ Clone the Repository

```sh
git clone https://github.com/AntonioDG30/tickechain.git
cd tickechain
```

### 3️⃣ Install Dependencies

Install all required packages for the frontend:

```sh
npm install
npm install vite
npm install bootstrap
npm install react-qr-code
npm install html5-qrcode
npm install html2canvas
npm install react-toastify
```

### 4️⃣ Deploy Smart Contracts on Local Blockchain

Start Ganache and configure it with the correct RPC URL.

Deploy the smart contracts using Hardhat:

```sh
npx hardhat run scripts/deploy.js --network localhost
```

### 5️⃣ Start the Frontend

```sh
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Smart Contracts

### 1️⃣ EventFactory.sol
- Manages event creation and lifecycle.
- Controls state transitions for events.

### 2️⃣ TicketManager.sol
- Issues and manages NFT tickets.
- Validates tickets via QR Code and cryptographic signature.
- Supports refunds and ticket burning.

### 3️⃣ PaymentManager.sol
- Manages ETH payments and refunds.
- Ensures fund availability before processing refunds.

### 4️⃣ EventRegistry.sol
- Stores and provides access to event details.

## Security & Best Practices

- **Checks-Effects-Interactions Pattern** - Protection against reentrancy attacks.
- **Circuit Breaker** - Mechanism to halt operations in case of emergency.
- **Access Control with Ownable** - Restricts sensitive operations.
- **Pull-Payment Refunds** - Reduces risk of fraud in refunds.

## Future Enhancements

- **Multi-Chain Support** - Deploy on other EVM-compatible blockchains (Polygon, Binance Smart Chain).
- **Secondary NFT Marketplace** - Secure ticket reselling.
- **Data Analytics & Optimization** - Event statistics and demand prediction.

## License

This project is licensed under the **MIT License** - see the LICENSE file for details.
