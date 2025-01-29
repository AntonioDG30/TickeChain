// Importiamo la libreria Hardhat Runtime Environment (hre), che ci fornisce tutte le funzionalità di Hardhat.
const hre = require("hardhat");

async function main() {
  // Otteniamo gli account da utilizzare per il deployment. `getSigners` restituisce un array di account.
  const [deployer] = await ethers.getSigners();

  // Stampa l'indirizzo del deployer, che è l'account che deployerà i contratti
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy del contratto EventFactory.
  // Utilizziamo `ethers.getContractFactory` per ottenere la factory del contratto EventFactory, che ci permette di fare il deploy.
  const EventFactory = await ethers.getContractFactory("EventFactory");
  // Deploy del contratto, creandolo sulla blockchain.
  const eventFactory = await EventFactory.deploy();
  // Aspettiamo che il contratto venga distribuito correttamente prima di continuare.
  await eventFactory.waitForDeployment();
  // Stampa l'indirizzo del contratto EventFactory appena distribuito.
  console.log("EventFactory deployed to:", eventFactory.target);

  // Deploy di ERC20Mock (un token di test).
  // Creiamo una factory per ERC20Mock, che è il contratto che simula un token ERC-20.
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  // Deploy del contratto ERC20Mock con il nome "Test Token", il simbolo "TTK", e un'iniziale offerta di 1 milione di token.
  const token = await ERC20Mock.deploy("Test Token", "TTK", ethers.parseEther("1000000"));
  // Aspettiamo che il contratto ERC20Mock venga distribuito.
  await token.waitForDeployment();
  // Stampa l'indirizzo del contratto ERC20Mock appena distribuito.
  console.log("ERC20Mock deployed to:", token.target);

  // Deploy di PaymentManager, passando l'indirizzo del contratto ERC20Mock e EventFactory.
  // Otteniamo la factory per il contratto PaymentManager.
  const PaymentManager = await ethers.getContractFactory("PaymentManager");
  // Deploy del contratto PaymentManager, passando l'indirizzo di ERC20Mock come token e l'indirizzo di EventFactory.
  const paymentManager = await PaymentManager.deploy(token.target, eventFactory.target);
  // Aspettiamo che il contratto venga distribuito.
  await paymentManager.waitForDeployment();
  // Stampa l'indirizzo del contratto PaymentManager appena distribuito.
  console.log("PaymentManager deployed to:", paymentManager.target);

  // Deploy di TicketManager, passando l'indirizzo di EventFactory.
  // Otteniamo la factory per il contratto TicketManager.
  const TicketManager = await ethers.getContractFactory("TicketManager");
  // Deploy del contratto TicketManager, passando "TickeChain NFT" come nome e "TCK" come simbolo, e l'indirizzo di EventFactory.
  const ticketManager = await TicketManager.deploy("TickeChain NFT", "TCK", eventFactory.target);
  // Aspettiamo che il contratto venga distribuito.
  await ticketManager.waitForDeployment();
  // Stampa l'indirizzo del contratto TicketManager appena distribuito.
  console.log("TicketManager deployed to:", ticketManager.target);
}

// Esegui la funzione principale per deployare i contratti.
main()
  .then(() => process.exit(0)) // Una volta completato, termina il processo con successo (exit code 0).
  .catch((error) => {
      console.error(error);  // Se c'è un errore, stampalo nella console.
      process.exit(1); // Termina il processo con errore (exit code 1).
  });
