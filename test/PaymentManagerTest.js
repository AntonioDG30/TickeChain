// Importiamo le librerie necessarie per il test: `expect` per le asserzioni nei test e `ethers` per interagire con Hardhat e gli smart contract.
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentManager", function () {
  // Variabili per memorizzare gli smart contract e gli account di test.
  let PaymentManager; // Factory del contratto PaymentManager
  let paymentManager; // L'istanza del contratto distribuito
  let token; // Il contratto ERC20Mock (token di test)
  let eventFactory; // Il contratto EventFactory
  let owner, addr1, addr2; // Gli account di test: proprietario (owner) e due utenti (addr1, addr2)

  // Questo hook `beforeEach` viene eseguito prima di ogni test, garantendo che ogni test inizi con un ambiente pulito.
  beforeEach(async function () {
    // Deploy del contratto ERC20Mock, che crea un token di test (nome: "Test Token", simbolo: "TTK", supply iniziale di 1000 TTK).
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    token = await ERC20Mock.deploy("Test Token", "TTK", ethers.parseEther("1000"));
    await token.waitForDeployment(); // Aspettiamo che il contratto venga distribuito.

    // Deploy del contratto EventFactory per la gestione degli eventi.
    const EventFactory = await ethers.getContractFactory("EventFactory");
    eventFactory = await EventFactory.deploy();
    await eventFactory.waitForDeployment(); // Aspettiamo che il contratto venga distribuito.

    // Deploy del contratto PaymentManager, passando gli indirizzi dei contratti ERC20Mock e EventFactory come parametri.
    PaymentManager = await ethers.getContractFactory("PaymentManager");
    [owner, addr1, addr2] = await ethers.getSigners();
    paymentManager = await PaymentManager.deploy(token.target, eventFactory.target);
    await paymentManager.waitForDeployment(); // Aspettiamo che il contratto venga distribuito.

    // Trasferiamo token a `addr1` e `addr2` per permettere loro di interagire con il contratto PaymentManager.
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.transfer(addr2.address, ethers.parseEther("100"));
  });

  // Test: verifica che il proprietario possa processare un rimborso per l'utente.
  it("Dovrebbe permettere al proprietario di processare un rimborso", async function () {
    // Creiamo un evento utilizzando EventFactory.
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Data futura per l'evento.
    await eventFactory.createEvent("Concerto Test", "Milano", futureDate, ethers.parseEther("0.1"), 100);

    // Verifica che l'evento sia stato creato correttamente.
    const event = await eventFactory.events(0);
    expect(event.name).to.equal("Concerto Test");

    // Annulliamo l'evento, impostando lo stato dell'evento come CANCELLED (3).
    await eventFactory.changeEventState(0, 3);

    // Il proprietario approva il contratto PaymentManager per poter trasferire token.
    await token.connect(owner).approve(paymentManager.target, ethers.parseEther("100"));
    await paymentManager.connect(owner).depositFunds(ethers.parseEther("100"));

    // Il proprietario processa un rimborso di 20 token per `addr1`, collegando l'ID dell'evento.
    await paymentManager.processRefund(addr1.address, ethers.parseEther("20"), 0);

    // Verifica che il saldo di `addr1` sia aumentato del rimborso di 20 token.
    const tokenBalance = await token.balanceOf(addr1.address);
    expect(tokenBalance).to.equal(ethers.parseEther("120")); // Saldo iniziale 100 + rimborso 20
  });

  // Test: verifica che non sia possibile prelevare fondi superiori al saldo disponibile.
  it("Dovrebbe impedire il ritiro di fondi insufficienti", async function () {
    // `addr1` approva il contratto PaymentManager per trasferire 10 token.
    await token.connect(addr1).approve(paymentManager.target, ethers.parseEther("10"));
    await paymentManager.connect(addr1).depositFunds(ethers.parseEther("10"));

    try {
      // Tentiamo di prelevare 20 token, ma `addr1` ha solo 10 token disponibili.
      await paymentManager.connect(addr1).withdrawFunds(ethers.parseEther("20"));
      throw new Error("Il ritiro avrebbe dovuto fallire");
    } catch (error) {
      // Verifica che l'errore di "fondi insufficienti" venga sollevato.
      expect(error.message).to.include("Fondi insufficienti");
    }
  });

  // Test: verifica che non sia possibile processare un rimborso senza fondi sufficienti nel contratto.
  it("Dovrebbe impedire rimborsi senza fondi sufficienti nel contratto", async function () {
    // Creiamo un evento come nel test precedente.
    const futureDate = Math.floor(Date.now() / 1000) + 86400;
    await eventFactory.createEvent("Concerto Test", "Milano", futureDate, ethers.parseEther("0.1"), 100);
  
    // Verifica che l'evento sia stato creato correttamente.
    const event = await eventFactory.events(0);
    expect(event.name).to.equal("Concerto Test");

    // Annulliamo l'evento.
    await eventFactory.changeEventState(0, 3);

    // Il proprietario deposita 100 token nel contratto.
    await token.connect(owner).approve(paymentManager.target, ethers.parseEther("100"));
    await paymentManager.connect(owner).depositFunds(ethers.parseEther("100"));

    try {
      // Tentiamo di rimborsare 150 token, ma il saldo del contratto è solo 100.
      await paymentManager.processRefund(addr1.address, ethers.parseEther("150"), 0);
      throw new Error("Il rimborso avrebbe dovuto fallire");
    } catch (error) {
      // Verifica che venga sollevato l'errore di "fondi insufficienti" nel contratto.
      expect(error.message).to.include("Fondi del contratto insufficienti");
    }
  });

  // Test: verifica che le operazioni vengano sospese quando il contratto è in pausa.
  it("Dovrebbe sospendere le operazioni quando il contratto è in pausa", async function () {
    // Mettiamo il contratto in pausa.
    await paymentManager.pause();

    try {
      // Proviamo a depositare fondi mentre il contratto è in pausa.
      await paymentManager.connect(addr1).depositFunds(ethers.parseEther("10"));
      throw new Error("La funzione depositFunds avrebbe dovuto fallire");
    } catch (error) {
      // Verifica che l'errore "Pausable: paused" venga sollevato.
      expect(error.message).to.include("Pausable: paused");
    }

    try {
      // Proviamo a ritirare fondi mentre il contratto è in pausa.
      await paymentManager.connect(addr1).withdrawFunds(ethers.parseEther("10"));
      throw new Error("La funzione withdrawFunds avrebbe dovuto fallire");
    } catch (error) {
      // Verifica che l'errore "Pausable: paused" venga sollevato.
      expect(error.message).to.include("Pausable: paused");
    }

    // Riabilitiamo il contratto.
    await paymentManager.unpause();

    // Effettuiamo il deposito nuovamente.
    await token.connect(addr1).approve(paymentManager.target, ethers.parseEther("10"));
    await paymentManager.connect(addr1).depositFunds(ethers.parseEther("10"));

    // Verifica che il saldo del contratto sia stato aggiornato correttamente.
    const balance = await paymentManager.getBalance(addr1.address);
    expect(balance).to.equal(ethers.parseEther("10"));
  });
});
