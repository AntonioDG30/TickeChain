const hre = require("hardhat");

async function main() {
  // Otteniamo gli account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy EventFactory prima di usarlo negli altri contratti
  const EventFactory = await ethers.getContractFactory("EventFactory");
  const eventFactory = await EventFactory.deploy();
  await eventFactory.waitForDeployment();
  console.log("EventFactory deployed to:", eventFactory.target);

  // Deploy ERC20Mock (Token di test)
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Mock.deploy("Test Token", "TTK", ethers.parseEther("1000000"));
  await token.waitForDeployment();
  console.log("ERC20Mock deployed to:", token.target);

  // Deploy PaymentManager (passando l'indirizzo di EventFactory)
  const PaymentManager = await ethers.getContractFactory("PaymentManager");
  const paymentManager = await PaymentManager.deploy(token.target, eventFactory.target);
  await paymentManager.waitForDeployment();
  console.log("PaymentManager deployed to:", paymentManager.target);

  // Deploy TicketManager (passando l'indirizzo di EventFactory)
  const TicketManager = await ethers.getContractFactory("TicketManager");
  const ticketManager = await TicketManager.deploy("TickeChain NFT", "TCK", eventFactory.target);
  await ticketManager.waitForDeployment();
  console.log("TicketManager deployed to:", ticketManager.target);
}

// Esegui la funzione principale
main()
  .then(() => process.exit(0))
  .catch((error) => {
      console.error(error);
      process.exit(1);
  });

