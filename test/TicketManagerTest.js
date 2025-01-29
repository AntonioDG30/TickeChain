// Importiamo le librerie necessarie per il test:
// `expect` è utilizzato per le asserzioni, ossia per verificare che il comportamento del codice sia corretto.
// `ethers` è la libreria che ci permette di interagire con Hardhat e gli smart contract.
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketManager", function () {
  // Variabili per memorizzare la factory e l'istanza dei contratti e gli account di test.
  let TicketManager; // La factory del contratto TicketManager
  let ticketManager; // L'istanza del contratto TicketManager distribuito
  let token; // Il contratto ERC20Mock (token di test)
  let eventFactory; // Il contratto EventFactory per la gestione degli eventi
  let owner, addr1, addr2; // Gli account di test: `owner` è il creatore dell'evento, `addr1` e `addr2` sono gli utenti

  // `beforeEach` è un hook che esegue il codice prima di ogni test per garantire che ogni test parta da uno stato pulito.
  beforeEach(async function () {
    // Deploy del contratto EventFactory
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy(); // Deploy del contratto EventFactory
    await eventFactory.waitForDeployment(); // Aspettiamo che il contratto venga distribuito

    // Deploy di ERC20Mock (un token di test ERC-20)
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("Test Token", "TTK", ethers.parseEther("1000")); // Deploy del token
    await token.waitForDeployment(); // Aspettiamo che il contratto venga distribuito

    // Deploy di TicketManager passando l'indirizzo di EventFactory
    TicketManager = await ethers.getContractFactory("TicketManager");
    [owner, addr1, addr2] = await ethers.getSigners(); // Otteniamo gli account di test
    ticketManager = await TicketManager.deploy("EventTicket", "ETK", eventFactory.target); // Deploy di TicketManager
    await ticketManager.waitForDeployment(); // Aspettiamo che il contratto venga distribuito

    // Trasferiamo token a `addr1` e `addr2` per permettere loro di interagire con il contratto TicketManager.
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.transfer(addr2.address, ethers.parseEther("100"));

    // Creiamo un evento usando `EventFactory`
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Data futura, un giorno da ora
    await eventFactory.createEvent("Concerto Test", "Milano", futureDate, ethers.parseEther("0.1"), 100);

    // Verifica che l'evento sia stato creato correttamente
    const event = await eventFactory.events(0);
    expect(event.name).to.equal("Concerto Test"); // Verifica il nome dell'evento

    // Impostiamo lo stato dell'evento su OPEN (1)
    await eventFactory.changeEventState(0, 1); // 1 significa che l'evento è aperto per l'acquisto
  });

  // Test: verifica che il proprietario possa emettere un biglietto.
  it("Dovrebbe permettere al proprietario di emettere un biglietto", async function () {
    // Il proprietario emette un biglietto per `addr1` per l'evento con ID 0
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1", 0);

    // Recuperiamo il proprietario del biglietto (ID 0) e verifichiamo che sia `addr1`
    const ownerOfTicket = await ticketManager.ownerOf(0);
    expect(ownerOfTicket).to.equal(addr1.address); // Controlliamo che il proprietario sia `addr1`
  });

  // Test: verifica che un biglietto possa essere trasferito da un utente a un altro.
  it("Dovrebbe trasferire un biglietto", async function () {
    // Mintiamo un biglietto per `addr1` (ID evento 0)
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1", 0);

    // `addr1` trasferisce il biglietto con ID 0 a `addr2`
    await ticketManager.connect(addr1).transferTicket(addr1.address, addr2.address, 0);

    // Recuperiamo il nuovo proprietario del biglietto e verifichiamo che sia `addr2`
    const newOwner = await ticketManager.ownerOf(0);
    expect(newOwner).to.equal(addr2.address); // Verifica che il trasferimento sia avvenuto correttamente
  });

  // Test: verifica che il proprietario del biglietto possa validarlo.
  it("Dovrebbe validare un biglietto", async function () {
    // Mintiamo un biglietto per `addr1`
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1", 0);

    // `addr1` valida il biglietto con ID 0
    const tx = await ticketManager.connect(addr1).validateTicket(0);

    // Aspettiamo la conferma della transazione
    const receipt = await tx.wait();

    // Cerchiamo l'evento `TicketValidated` nei log della transazione
    const event = receipt.logs
      .map((log) => ticketManager.interface.parseLog(log))
      .find((e) => e.name === "TicketValidated");

    // Verifichiamo che l'ID del biglietto validato sia 0
    expect(Number(event.args[0])).to.equal(0); // Conferma che il biglietto sia stato validato correttamente
  });

  // Test: verifica che il proprietario possa rimborsare un biglietto e che venga distrutto.
  it("Dovrebbe rimborsare un biglietto", async function () {
    // Mintiamo un biglietto per `addr1`
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1", 0);

    // `addr1` rimborsa il biglietto con ID 0
    const tx = await ticketManager.connect(addr1).refundTicket(0);

    // Recuperiamo i log della transazione per verificare che l'evento `TicketRefunded` sia stato emesso
    const receipt = await tx.wait();

    // Cerchiamo l'evento `TicketRefunded` nei log della transazione
    const event = receipt.logs
      .map((log) => ticketManager.interface.parseLog(log))
      .find((e) => e.name === "TicketRefunded");

    // Verifichiamo che l'ID del biglietto rimborsato sia 0
    expect(Number(event.args[0])).to.equal(0); // Conferma che il biglietto sia stato rimborsato

    // Verifica che il proprietario che ha richiesto il rimborso sia `addr1`
    expect(event.args[1]).to.equal(addr1.address);

    // Verifica che il biglietto sia stato distrutto
    try {
      await ticketManager.ownerOf(0);
      throw new Error("La chiamata dovrebbe fallire");
    } catch (error) {
      // Verifica che il biglietto non esista più e che venga sollevato un errore
      expect(error.message).to.include("ERC721: invalid token ID");
    }
  });
});
