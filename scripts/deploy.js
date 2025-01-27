const { ethers } = require("hardhat");

async function main() {
  // Ottieni l'account di deploy
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Ottieni la factory del contratto e fai il deploy
  const TicketManager = await ethers.getContractFactory("TicketManager");
  const ticketManager = await TicketManager.deploy("EventTicket", "ETK");

  await ticketManager.waitForDeployment();

  console.log("TicketManager deployed to:", ticketManager.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
