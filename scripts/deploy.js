const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy EventFactory
  const EventFactory = await hre.ethers.getContractFactory("EventFactory");
  const eventFactory = await EventFactory.deploy();
  await eventFactory.waitForDeployment();
  console.log("EventFactory deployed to:", eventFactory.target);

  // Deploy ERC20Mock (Token di test)
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Mock.deploy("Test Token", "TTK", ethers.parseEther("1000000"));
  await token.waitForDeployment();
  console.log("ERC20Mock deployed to:", token.target);

  // Deploy PaymentManager
  const PaymentManager = await hre.ethers.getContractFactory("PaymentManager");
  const paymentManager = await PaymentManager.deploy(token.target, eventFactory.target);
  await paymentManager.waitForDeployment();
  console.log("PaymentManager deployed to:", paymentManager.target);

  // Deploy TicketManager
  const TicketManager = await hre.ethers.getContractFactory("TicketManager");
  const ticketManager = await TicketManager.deploy();
  await ticketManager.waitForDeployment();
  console.log("TicketManager deployed to:", ticketManager.target);

  // Salvataggio degli indirizzi in un file JSON accessibile dal frontend
  const addresses = {
    EventFactory: eventFactory.target,
    TicketManager: ticketManager.target,
    PaymentManager: paymentManager.target,
    ERC20Mock: token.target
  };

  const frontendPath = "./frontend/src/utils/contract-addresses.json";

  // Creiamo la cartella utils se non esiste
  if (!fs.existsSync("./frontend/src/utils")) {
    fs.mkdirSync("./frontend/src/utils", { recursive: true });
  }

  // Salviamo il file JSON con gli indirizzi
  fs.writeFileSync(frontendPath, JSON.stringify(addresses, null, 2));

  console.log("Indirizzi dei contratti salvati in:", frontendPath);
}

// Esegui la funzione principale
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
