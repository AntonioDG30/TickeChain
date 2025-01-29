// Importiamo le librerie necessarie per il test: `expect` per fare asserzioni e `ethers` per interagire con gli smart contract tramite Hardhat.
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TickeChain - Test di Integrazione Completo", function () {
  // Dichiarazione delle variabili per memorizzare gli account e gli smart contract.
  let owner, user; // Account di test: owner è il creatore, user è l'acquirente.
  let eventFactory, ticketManager, paymentManager, token; // Contratti distribuiti

  // Questo hook `beforeEach` viene eseguito prima di ogni test, per garantire un ambiente "pulito".
  beforeEach(async function () {
    // Otteniamo gli account di test, che rappresentano i vari utenti (owner e user) che interagiranno con i contratti.
    [owner, user] = await ethers.getSigners();

    // Deploy di ERC20Mock (un token di test ERC-20).
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    // Deployamo il contratto ERC20Mock con nome "Test Token", simbolo "TTK", e un'iniziale offerta di 1 milione di token.
    token = await ERC20Mock.deploy("Test Token", "TTK", ethers.parseEther("1000000"));
    await token.waitForDeployment(); // Aspettiamo che il contratto venga distribuito.

    // Assegniamo 10 TTK all'utente (user) per permettergli di depositare nel PaymentManager.
    await token.transfer(user.address, ethers.parseEther("10"));

    // Deploy di EventFactory per la gestione degli eventi.
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment(); // Aspettiamo che EventFactory venga distribuito.

    // Deploy di PaymentManager per gestire pagamenti e rimborsi.
    const PaymentManager = await ethers.getContractFactory("PaymentManager");
    paymentManager = await PaymentManager.deploy(token.target, eventFactory.target); // Passiamo gli indirizzi dei contratti ERC20Mock e EventFactory.
    await paymentManager.waitForDeployment(); // Aspettiamo che il contratto venga distribuito.

    // Deploy di TicketManager per gestire i biglietti NFT.
    const TicketManager = await ethers.getContractFactory("TicketManager");
    ticketManager = await TicketManager.deploy("TickeChain NFT", "TCK", eventFactory.target); // Passiamo l'indirizzo di EventFactory.
    await ticketManager.waitForDeployment(); // Aspettiamo che il contratto venga distribuito.
  });

  // Test: verifica che il ciclo completo di creazione evento, acquisto biglietto e rimborso funzioni correttamente.
  it("Dovrebbe eseguire il ciclo completo: Creazione evento → Acquisto biglietto → Rimborso", async function () {
    // CREAZIONE DELL'EVENTO DA PARTE DEL CREATOR
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Calcoliamo una data valida nel futuro (1 giorno da ora).
    await eventFactory.connect(owner).createEvent("Concerto Test", "Milano", futureDate, ethers.parseEther("0.1"), 100);
    // Creiamo l'evento tramite `eventFactory` usando l'account `owner`.

    // Verifica che l'evento sia stato registrato correttamente.
    const event = await eventFactory.events(0);
    expect(event.name).to.equal("Concerto Test"); // Verifica il nome dell'evento.
    expect(event.location).to.equal("Milano"); // Verifica il luogo dell'evento.

    // APERTURA DELL'EVENTO PER L'ACQUISTO
    await eventFactory.connect(owner).changeEventState(0, 1); // Cambiamo lo stato dell'evento a "OPEN" (1).

    // DEPOSITO FONDI SU PAYMENTMANAGER
    await token.connect(user).approve(paymentManager.target, ethers.parseEther("0.1")); // L'utente approva il pagamento.
    await paymentManager.connect(user).depositFunds(ethers.parseEther("0.1")); // L'utente deposita i fondi nel contratto PaymentManager.

    // Verifica che il saldo dell'utente nel PaymentManager sia stato aggiornato correttamente.
    let balance = await paymentManager.getBalance(user.address);
    expect(balance).to.equal(ethers.parseEther("0.1")); // Il saldo dovrebbe essere di 0.1 TTK.

    // ACQUISTO DEL BIGLIETTO
    await ticketManager.connect(user).mintTicket(user.address, "https://example.com/ticket1", 0); // L'utente acquista un biglietto (evento ID 0).

    // Verifica che il biglietto sia stato correttamente assegnato all'utente.
    const ownerOfTicket = await ticketManager.ownerOf(0);
    expect(ownerOfTicket).to.equal(user.address); // Il proprietario del biglietto dovrebbe essere l'utente.

    // ANNULLAMENTO DELL'EVENTO
    await eventFactory.connect(owner).changeEventState(0, 3); // Cambiamo lo stato dell'evento a "CANCELLED" (3).

    // RIMBORSO
    await paymentManager.processRefund(user.address, ethers.parseEther("0.1"), 0); // Elabora il rimborso per l'utente (evento ID 0).

    // Verifica che il saldo dell'utente nel PaymentManager sia stato aggiornato dopo il rimborso.
    balance = await paymentManager.getBalance(user.address);
    expect(balance).to.equal(ethers.parseEther("0.2")); // Il saldo dovrebbe essere ora di 0.2 TTK.
  });
});
