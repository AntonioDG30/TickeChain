const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying contracts with the account:", deployer.address);

  // ✅ Deploy EventFactory
  const EventFactory = await hre.ethers.getContractFactory("EventFactory");
  const eventFactory = await EventFactory.deploy();
  await eventFactory.waitForDeployment();
  console.log("✅ EventFactory deployed to:", eventFactory.target);

  // ✅ Deploy PaymentManager
  const PaymentManager = await hre.ethers.getContractFactory("PaymentManager");
  const paymentManager = await PaymentManager.deploy(); // ❌ Rimosso il passaggio di parametri
  await paymentManager.waitForDeployment();
  console.log("✅ PaymentManager deployed to:", paymentManager.target);

  // ✅ Deploy TicketManager
  const TicketManager = await hre.ethers.getContractFactory("TicketManager");
  const ticketManager = await TicketManager.deploy();
  await ticketManager.waitForDeployment();
  console.log("✅ TicketManager deployed to:", ticketManager.target);

  // ✅ Salviamo gli indirizzi dei contratti in un file JSON accessibile dal frontend
  const addresses = {
    EventFactory: eventFactory.target,
    TicketManager: ticketManager.target,
    PaymentManager: paymentManager.target
  };

  const frontendPath = "./frontend/src/utils/contract-addresses.json";

  // ✅ Creiamo la cartella utils se non esiste
  if (!fs.existsSync("./frontend/src/utils")) {
    fs.mkdirSync("./frontend/src/utils", { recursive: true });
  }

  // ✅ Salviamo il file JSON con gli indirizzi
  fs.writeFileSync(frontendPath, JSON.stringify(addresses, null, 2));

  console.log("✅ Indirizzi dei contratti salvati in:", frontendPath);
}

// ✅ Esegui la funzione principale
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Errore nel deploy:", error);
    process.exit(1);
  });
