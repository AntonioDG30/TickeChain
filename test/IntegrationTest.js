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

    // Deploy EventFactory
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment();

    // Deploy PaymentManager (passando correttamente i parametri)
    const PaymentManager = await ethers.getContractFactory("PaymentManager");
    paymentManager = await PaymentManager.deploy(token.target, eventFactory.target);
    await paymentManager.waitForDeployment();

    // Deploy TicketManager (passando correttamente i parametri)
    const TicketManager = await ethers.getContractFactory("TicketManager");
    ticketManager = await TicketManager.deploy("TickeChain NFT", "TCK", eventFactory.target);
    await ticketManager.waitForDeployment();
  });

  it("Dovrebbe eseguire il ciclo completo: Creazione evento → Acquisto biglietto → Rimborso", async function () {
    // CREAZIONE EVENTO DAL CREATORE
    const futureDate = Math.floor(Date.now() / 1000) + 86400;
    await eventFactory.connect(owner).createEvent("Concerto Test", "Milano", futureDate, ethers.parseEther("0.1"), 100);
  
    // Verifica che l'evento sia stato registrato
    const event = await eventFactory.events(0);
    expect(event.name).to.equal("Concerto Test");
    expect(event.location).to.equal("Milano");
  
    // APERTURA DELL'EVENTO PER L'ACQUISTO
    await eventFactory.connect(owner).changeEventState(0, 1); // 1 corrisponde a OPEN
  
    // DEPOSITO FONDI SU PAYMENTMANAGER
    await token.connect(user).approve(paymentManager.target, ethers.parseEther("0.1"));
    await paymentManager.connect(user).depositFunds(ethers.parseEther("0.1"));
  
    // Verifica saldo aggiornato
    let balance = await paymentManager.getBalance(user.address);
    expect(balance).to.equal(ethers.parseEther("0.1"));
  
    // ACQUISTO BIGLIETTO (passiamo l'eventId = 0, creato dal proprietario)
    await ticketManager.connect(user).mintTicket(user.address, "https://example.com/ticket1", 0);
  
    // Verifica che il biglietto sia stato assegnato
    const ownerOfTicket = await ticketManager.ownerOf(0);
    expect(ownerOfTicket).to.equal(user.address);
  
    // ANNULLARE L'EVENTO
    await eventFactory.connect(owner).changeEventState(0, 3); // 3 corrisponde a CANCELLED
  
    // RIMBORSO
    await paymentManager.processRefund(user.address, ethers.parseEther("0.1"), 0);
  
    // Verifica che il saldo sia stato aggiornato dopo il rimborso
    balance = await paymentManager.getBalance(user.address);
    expect(balance).to.equal(ethers.parseEther("0.2"));
  });

});
