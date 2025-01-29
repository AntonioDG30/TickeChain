// Importiamo le librerie necessarie: `expect` per le asserzioni nei test e `ethers` per interagire con Hardhat e gli smart contract.
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketManager", function () {
  let TicketManager;
  let ticketManager;
  let token;
  let eventFactory;
  let owner, addr1, addr2;

  beforeEach(async function () {
    // Deploy di EventFactory
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment();

    // Deploy del token ERC-20 Mock
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("Test Token", "TTK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Deploy di TicketManager passando l'indirizzo di EventFactory
    TicketManager = await ethers.getContractFactory("TicketManager");
    [owner, addr1, addr2] = await ethers.getSigners();
    ticketManager = await TicketManager.deploy("EventTicket", "ETK", eventFactory.target);
    await ticketManager.waitForDeployment();

    // Trasferiamo il token a addr1 e addr2
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.transfer(addr2.address, ethers.parseEther("100"));

    // Creare un evento (passando eventId = 0)
    const futureDate = Math.floor(Date.now() / 1000) + 86400;
    await eventFactory.createEvent("Concerto Test", "Milano", futureDate, ethers.parseEther("0.1"), 100);

    // Verifica che l'evento sia stato creato
    const event = await eventFactory.events(0);
    expect(event.name).to.equal("Concerto Test");

    // Impostare lo stato dell'evento su OPEN
    await eventFactory.changeEventState(0, 1); // 1 corrisponde a OPEN
  });

  it("Dovrebbe permettere al proprietario di emettere un biglietto", async function () {
    // Mintare il biglietto per addr1, passare anche l'eventId (0)
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1", 0);  // Passiamo eventId = 0

    const ownerOfTicket = await ticketManager.ownerOf(0);
    expect(ownerOfTicket).to.equal(addr1.address); // Verifica che l'indirizzo corrisponda
  });

  // Test: verifica che un biglietto possa essere trasferito tra utenti.
  it("Dovrebbe trasferire un biglietto", async function () {
    // Il proprietario emette un biglietto per `addr1`.
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1", 0);

    // `addr1` trasferisce il biglietto con ID 0 a `addr2`.
    await ticketManager.connect(addr1).transferTicket(addr1.address, addr2.address, 0);

    // Recuperiamo il nuovo proprietario del biglietto e verifichiamo che sia `addr2`.
    const newOwner = await ticketManager.ownerOf(0);
    expect(newOwner).to.equal(addr2.address); // Controlliamo che il trasferimento sia avvenuto correttamente.
  });

  // Test: verifica che il proprietario possa validare il biglietto.
  it("Dovrebbe validare un biglietto", async function () {
    // Il proprietario emette un biglietto per `addr1`.
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1", 0);

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
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1", 0);

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
