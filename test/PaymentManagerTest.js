const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentManager", function () {
  let PaymentManager;
  let paymentManager;
  let token;
  let eventFactory;
  let owner, addr1, addr2;

  beforeEach(async function () {
    // Deploy ERC20Mock (Token di test)
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("Test Token", "TTK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Deploy EventFactory
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment();

    // Deploy PaymentManager passando l'indirizzo di EventFactory e del token
    PaymentManager = await ethers.getContractFactory("PaymentManager");
    [owner, addr1, addr2] = await ethers.getSigners();
    paymentManager = await PaymentManager.deploy(token.target, eventFactory.target);
    await paymentManager.waitForDeployment();

    // Trasferire token ad addr1 e addr2 per i test
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.transfer(addr2.address, ethers.parseEther("100"));
  });

  it("Dovrebbe permettere al proprietario di processare un rimborso", async function () {
    // Creare un evento
    const futureDate = Math.floor(Date.now() / 1000) + 86400;
    await eventFactory.createEvent("Concerto Test", "Milano", futureDate, ethers.parseEther("0.1"), 100);
  
    // Verifica che l'evento sia stato creato
    const event = await eventFactory.events(0);
    expect(event.name).to.equal("Concerto Test");
  
    // Annulla l'evento
    await eventFactory.changeEventState(0, 3); // 3 corrisponde a CANCELLED
  
    // Il proprietario deposita fondi nel contratto
    await token.connect(owner).approve(paymentManager.target, ethers.parseEther("100"));
    await paymentManager.connect(owner).depositFunds(ethers.parseEther("100"));
    
    // Proprietario processa un rimborso di 20 token a `addr1`
    await paymentManager.processRefund(addr1.address, ethers.parseEther("20"), 0); // Passa l'eventId
    
    // Verifica che `addr1` abbia ricevuto il rimborso
    const tokenBalance = await token.balanceOf(addr1.address);
    expect(tokenBalance).to.equal(ethers.parseEther("120")); // Saldo iniziale 100 + rimborso 20
  });

  it("Dovrebbe impedire il ritiro di fondi insufficienti", async function () {
    await token.connect(addr1).approve(paymentManager.target, ethers.parseEther("10"));
    await paymentManager.connect(addr1).depositFunds(ethers.parseEther("10"));

    try {
      await paymentManager.connect(addr1).withdrawFunds(ethers.parseEther("20"));
      throw new Error("Il ritiro avrebbe dovuto fallire");
    } catch (error) {
      expect(error.message).to.include("Fondi insufficienti");
    }
  });

  it("Dovrebbe impedire rimborsi senza fondi sufficienti nel contratto", async function () {
    // Creare un evento
    const futureDate = Math.floor(Date.now() / 1000) + 86400;
    await eventFactory.createEvent("Concerto Test", "Milano", futureDate, ethers.parseEther("0.1"), 100);
  
    // Verifica che l'evento sia stato creato
    const event = await eventFactory.events(0);
    expect(event.name).to.equal("Concerto Test");
  
    // Annullare l'evento
    await eventFactory.changeEventState(0, 3); // 3 corrisponde a CANCELLED
  
    // Il proprietario deposita fondi nel contratto
    await token.connect(owner).approve(paymentManager.target, ethers.parseEther("100"));
    await paymentManager.connect(owner).depositFunds(ethers.parseEther("100"));

    // Tentativo di rimborso di 150 token (fondi insufficienti)
    try {
      await paymentManager.processRefund(addr1.address, ethers.parseEther("150"), 0); // Passa eventId
      throw new Error("Il rimborso avrebbe dovuto fallire");
    } catch (error) {
      expect(error.message).to.include("Fondi del contratto insufficienti");
    }
  }); 
   

  it("Dovrebbe sospendere le operazioni quando il contratto è in pausa", async function () {
    await paymentManager.pause();

    try {
      await paymentManager.connect(addr1).depositFunds(ethers.parseEther("10"));
      throw new Error("La funzione depositFunds avrebbe dovuto fallire");
    } catch (error) {
      expect(error.message).to.include("Pausable: paused");
    }

    try {
      await paymentManager.connect(addr1).withdrawFunds(ethers.parseEther("10"));
      throw new Error("La funzione withdrawFunds avrebbe dovuto fallire");
    } catch (error) {
      expect(error.message).to.include("Pausable: paused");
    }

    await paymentManager.unpause();

    await token.connect(addr1).approve(paymentManager.target, ethers.parseEther("10"));
    await paymentManager.connect(addr1).depositFunds(ethers.parseEther("10"));

    const balance = await paymentManager.getBalance(addr1.address);
    expect(balance).to.equal(ethers.parseEther("10"));
  });
});
