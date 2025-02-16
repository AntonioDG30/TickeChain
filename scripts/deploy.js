// Importazione del modulo `hardhat` per gestire il deployment degli smart contract
const hre = require("hardhat");

// Importazione del modulo `fs` per scrivere i file JSON con gli indirizzi dei contratti deployati
const fs = require("fs");

/**
 * @async
 * @function main
 * @description Effettua il deployment dei contratti `EventFactory`, `PaymentManager` e `TicketManager` sulla blockchain.
 */
async function main() {
  // Recupera l'account del deployer (chi sta eseguendo il deployment)
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying contracts with the account:", deployer.address);

  /**
   * Deploy del contratto `EventFactory`
   * Questo contratto gestisce la creazione e la gestione degli eventi.
   */
  const EventFactory = await hre.ethers.getContractFactory("EventFactory");
  const eventFactory = await EventFactory.deploy(); // Deploy del contratto
  await eventFactory.waitForDeployment(); // Attende la conferma della transazione
  console.log("✅ EventFactory deployed to:", eventFactory.target);

  /**
   * Deploy del contratto `PaymentManager`
   * Questo contratto gestisce i pagamenti, i rimborsi e la sicurezza delle transazioni.
   */
  const PaymentManager = await hre.ethers.getContractFactory("PaymentManager");
  const paymentManager = await PaymentManager.deploy(); // Deploy del contratto senza parametri
  await paymentManager.waitForDeployment(); // Attende la conferma della transazione
  console.log("✅ PaymentManager deployed to:", paymentManager.target);

  /**
   * Deploy del contratto `TicketManager`
   * Questo contratto gestisce l'emissione, la verifica e il trasferimento dei biglietti NFT.
   */
  const TicketManager = await hre.ethers.getContractFactory("TicketManager");
  const ticketManager = await TicketManager.deploy(); // Deploy del contratto
  await ticketManager.waitForDeployment(); // Attende la conferma della transazione
  console.log("✅ TicketManager deployed to:", ticketManager.target);

  /**
   * Crea un oggetto contenente gli indirizzi dei contratti appena deployati
   */
  const addresses = {
    EventFactory: eventFactory.target, // Indirizzo del contratto `EventFactory`
    TicketManager: ticketManager.target, // Indirizzo del contratto `TicketManager`
    PaymentManager: paymentManager.target // Indirizzo del contratto `PaymentManager`
  };

  /**
   * Percorso del file JSON dove saranno salvati gli indirizzi per il frontend.
   */
  const frontendPath = "./frontend/src/utils/contract-addresses.json";

  /**
   * Controlla se la cartella `frontend/src/utils` esiste, altrimenti la crea.
   * Questo evita errori se la cartella non è ancora stata generata.
   */
  if (!fs.existsSync("./frontend/src/utils")) {
    fs.mkdirSync("./frontend/src/utils", { recursive: true });
  }

  /**
   * Scrive gli indirizzi dei contratti in un file JSON.
   * Questo file sarà usato dal frontend per connettersi ai contratti sulla blockchain.
   */
  fs.writeFileSync(frontendPath, JSON.stringify(addresses, null, 2));

  console.log("✅ Indirizzi dei contratti salvati in:", frontendPath);
}

/**
 * Esegue la funzione `main()` per avviare il deployment.
 * Se il deployment ha successo, il processo termina con `exit(0)`, indicando che non ci sono errori.
 * Se si verifica un errore, viene catturato e stampato, e il processo termina con `exit(1)`.
 */
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Errore nel deploy:", error);
    process.exit(1);
  });
