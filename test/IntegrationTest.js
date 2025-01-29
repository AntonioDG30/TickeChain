const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TickeChain - Test di Integrazione Completo", function () {
  let owner, user;
  let eventFactory, ticketManager, paymentManager, token;

  beforeEach(async function () {
    // Otteniamo gli account di test
    [owner, user] = await ethers.getSigners();

    // Deploy ERC20Mock (Token di test)
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("Test Token", "TTK", ethers.parseEther("1000000"));
    await token.waitForDeployment();

    // ✅ Assegniamo 10 TTK all'utente per poter depositare
    await token.transfer(user.address, ethers.parseEther("10"));

    // Deploy PaymentManager
    const PaymentManager = await ethers.getContractFactory("PaymentManager");
    paymentManager = await PaymentManager.deploy(token.target);
    await paymentManager.waitForDeployment();

    // Deploy EventRegistry
    const EventRegistry = await ethers.getContractFactory("EventRegistry");
    eventRegistry = await EventRegistry.deploy();
    await eventRegistry.waitForDeployment();

    // Deploy TicketManager
    const TicketManager = await ethers.getContractFactory("TicketManager");
    ticketManager = await TicketManager.deploy("TickeChain NFT", "TCK");
    await ticketManager.waitForDeployment();

    // Deploy EventFactory
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment();
  });

  it("Dovrebbe eseguire il ciclo completo: Creazione evento → Acquisto biglietto → Rimborso", async function () {
    // 1️⃣ CREAZIONE EVENTO
    const futureDate = Math.floor(Date.now() / 1000) + 86400;
    await eventFactory.createEvent("Concerto Test", "Milano", futureDate, ethers.parseEther("0.1"), 100);

    // Verifica che l'evento sia stato registrato
    const event = await eventFactory.events(0);
    expect(event.name).to.equal("Concerto Test");
    expect(event.location).to.equal("Milano");

    // 2️⃣ DEPOSITO FONDI SU PAYMENTMANAGER
    await token.connect(user).approve(paymentManager.target, ethers.parseEther("0.1"));
    await paymentManager.connect(user).depositFunds(ethers.parseEther("0.1"));

    // Verifica saldo aggiornato
    let balance = await paymentManager.getBalance(user.address);
    expect(balance).to.equal(ethers.parseEther("0.1"));

    // 3️⃣ ACQUISTO BIGLIETTO
    await ticketManager.connect(user).mintTicket(user.address, "https://example.com/ticket1");

    // Verifica che il biglietto sia stato assegnato
    const ownerOfTicket = await ticketManager.ownerOf(0);
    expect(ownerOfTicket).to.equal(user.address);

    // 4️⃣ RIMBORSO
    await paymentManager.processRefund(user.address, ethers.parseEther("0.1"));

    // Verifica che il saldo sia stato aggiornato dopo il rimborso
    balance = await paymentManager.getBalance(user.address);
    expect(balance).to.equal(ethers.parseEther("0.2"));
  });
});
