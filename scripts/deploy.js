const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy ERC20Mock (Token di test per i pagamenti)
  const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Mock.deploy("Test Token", "TTK", hre.ethers.parseEther("1000000"));
  await token.waitForDeployment();
  console.log("ERC20Mock deployed to:", token.target);

  // Deploy PaymentManager (passando l'indirizzo del token ERC-20)
  const PaymentManager = await hre.ethers.getContractFactory("PaymentManager");
  const paymentManager = await PaymentManager.deploy(token.target);
  await paymentManager.waitForDeployment();
  console.log("PaymentManager deployed to:", paymentManager.target);

  // Deploy EventRegistry
  const EventRegistry = await hre.ethers.getContractFactory("EventRegistry");
  const eventRegistry = await EventRegistry.deploy();
  await eventRegistry.waitForDeployment();
  console.log("EventRegistry deployed to:", eventRegistry.target);

  // ✅ Deploy TicketManager (passando i parametri richiesti)
  const TicketManager = await hre.ethers.getContractFactory("TicketManager");
  const ticketManager = await TicketManager.deploy("TickeChain NFT", "TCK");
  await ticketManager.waitForDeployment();
  console.log("TicketManager deployed to:", ticketManager.target);

  // Deploy EventFactory (se ha parametri, aggiungili qui)
  const EventFactory = await hre.ethers.getContractFactory("EventFactory");
  const eventFactory = await EventFactory.deploy();
  await eventFactory.waitForDeployment();
  console.log("EventFactory deployed to:", eventFactory.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
