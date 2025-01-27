// Importiamo le librerie necessarie: `expect` per le asserzioni nei test e `ethers` per interagire con Hardhat e gli smart contract.
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketManager", function () {
  // Variabili per memorizzare il contratto TicketManager e gli account di test.
  let TicketManager; // Factory del contratto TicketManager
  let ticketManager; // Istanza del contratto distribuito
  let owner, addr1, addr2; // Account di test: proprietario e due altri utenti

  // Questo hook `beforeEach` viene eseguito prima di ogni test. Serve a garantire che ogni test parta con un ambiente "pulito".
  beforeEach(async function () {
    // Otteniamo la factory del contratto TicketManager per poterlo distribuire.
    TicketManager = await ethers.getContractFactory("TicketManager");

    // Recuperiamo i signer (account di test) forniti da Hardhat.
    [owner, addr1, addr2] = await ethers.getSigners();

    // Distribuiamo il contratto TicketManager sulla blockchain di test con i parametri `EventTicket` (nome) e `ETK` (simbolo).
    ticketManager = await TicketManager.deploy("EventTicket", "ETK");

    // Aspettiamo che il contratto venga distribuito correttamente.
    await ticketManager.waitForDeployment();
  });

  // Test: verifica che il proprietario possa emettere un biglietto.
  it("Dovrebbe permettere al proprietario di emettere un biglietto", async function () {
    // Il proprietario del contratto emette un nuovo biglietto per `addr1`.
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1");

    // Recuperiamo il proprietario del biglietto con ID 0 e verifichiamo che sia `addr1`.
    const ownerOfTicket = await ticketManager.ownerOf(0);
    expect(ownerOfTicket).to.equal(addr1.address); // Controlliamo che l'indirizzo corrisponda.
  });

  // Test: verifica che un biglietto possa essere trasferito tra utenti.
  it("Dovrebbe trasferire un biglietto", async function () {
    // Il proprietario emette un biglietto per `addr1`.
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1");

    // `addr1` trasferisce il biglietto con ID 0 a `addr2`.
    await ticketManager.connect(addr1).transferTicket(addr1.address, addr2.address, 0);

    // Recuperiamo il nuovo proprietario del biglietto e verifichiamo che sia `addr2`.
    const newOwner = await ticketManager.ownerOf(0);
    expect(newOwner).to.equal(addr2.address); // Controlliamo che il trasferimento sia avvenuto correttamente.
  });

  // Test: verifica che il proprietario possa validare il biglietto.
  it("Dovrebbe validare un biglietto", async function () {
    // Il proprietario emette un biglietto per `addr1`.
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1");

    // `addr1` valida il biglietto con ID 0.
    const tx = await ticketManager.connect(addr1).validateTicket(0);

    // Recuperiamo i log della transazione per verificare che l'evento `TicketValidated` sia stato emesso.
    const receipt = await tx.wait(); // Aspettiamo la conferma della transazione.

    // Cerchiamo l'evento `TicketValidated` nei log della transazione.
    const event = receipt.logs
      .map((log) => ticketManager.interface.parseLog(log))
      .find((e) => e.name === "TicketValidated");

    // Verifichiamo che l'ID del biglietto validato sia 0.
    expect(Number(event.args[0])).to.equal(0); // Conferma che il biglietto sia stato validato correttamente.
  });

  // Test: verifica che il proprietario possa rimborsare un biglietto e che venga distrutto.
  it("Dovrebbe rimborsare un biglietto", async function () {
    // Il proprietario emette un biglietto per `addr1`.
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1");

    // `addr1` rimborsa il biglietto con ID 0.
    const tx = await ticketManager.connect(addr1).refundTicket(0);

    // Recuperiamo i log della transazione per verificare che l'evento `TicketRefunded` sia stato emesso.
    const receipt = await tx.wait();

    // Cerchiamo l'evento `TicketRefunded` nei log della transazione.
    const event = receipt.logs
      .map((log) => ticketManager.interface.parseLog(log))
      .find((e) => e.name === "TicketRefunded");

    // Verifichiamo che l'ID del biglietto rimborsato sia 0.
    expect(Number(event.args[0])).to.equal(0); // Conferma che il biglietto sia stato rimborsato.

    // Verifichiamo che il proprietario che ha richiesto il rimborso sia `addr1`.
    expect(event.args[1]).to.equal(addr1.address);

    // Proviamo a verificare il proprietario del biglietto con ID 0, ma dovrebbe fallire poiché il biglietto è stato distrutto.
    try {
      await ticketManager.ownerOf(0);
      throw new Error("La chiamata dovrebbe essere fallita");
    } catch (error) {
      // Verifichiamo che l'errore sia quello atteso (il biglietto non esiste più).
      expect(error.message).to.include("ERC721: invalid token ID");
    }
  });
});
