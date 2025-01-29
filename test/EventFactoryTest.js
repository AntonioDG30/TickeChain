// Importiamo le librerie necessarie: `expect` per le asserzioni nei test e `ethers` per interagire con Hardhat e gli smart contract.
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventFactory", function () {
  // Variabili per memorizzare la factory e l'istanza del contratto EventFactory, oltre agli account di test.
  let EventFactory; // Factory del contratto EventFactory
  let eventFactory; // Istanza del contratto distribuito
  let owner, addr1; // Account di test: proprietario e un altro utente

  // Questo hook `beforeEach` viene eseguito prima di ogni test. Serve a garantire che ogni test parta con un ambiente "pulito".
  beforeEach(async function () {
    // Otteniamo la factory del contratto EventFactory per poterlo distribuire.
    EventFactory = await ethers.getContractFactory("EventFactory");

    // Recuperiamo i signer (account di test) forniti da Hardhat.
    [owner, addr1] = await ethers.getSigners();

    // Distribuiamo il contratto EventFactory sulla blockchain di test.
    eventFactory = await EventFactory.deploy();

    // Aspettiamo che il contratto venga distribuito correttamente.
    await eventFactory.waitForDeployment();
  });

  // Test: verifica che sia possibile creare un evento.
  it("Dovrebbe creare un evento", async function () {
    // Calcoliamo una data valida nel futuro (1 giorno da ora).
    const futureDate = Math.floor(Date.now() / 1000) + 86400;

    // Creiamo un nuovo evento con i dettagli specificati.
    await eventFactory.createEvent("Concerto", "Milano", futureDate, ethers.parseEther("1"), 100);

    // Recuperiamo i dettagli dell'evento creato (ID 0).
    const event = await eventFactory.events(0);

    // Verifichiamo che i dettagli dell'evento corrispondano a quelli forniti.
    expect(event.name).to.equal("Concerto"); // Nome dell'evento
    expect(event.location).to.equal("Milano"); // Luogo dell'evento
    expect(Number(event.ticketsAvailable)).to.equal(100); // Numero di biglietti disponibili
  });

  // Test: verifica che sia possibile aggiornare un evento.
  it("Dovrebbe aggiornare un evento", async function () {
    // Calcoliamo una data valida nel futuro.
    const futureDate = Math.floor(Date.now() / 1000) + 86400;

    // Creiamo un nuovo evento.
    await eventFactory.createEvent("Concerto", "Milano", futureDate, ethers.parseEther("1"), 100);

    // Aggiorniamo l'evento con nuovi dettagli.
    await eventFactory.updateEvent(0, "Concerto Aggiornato", "Roma", futureDate + 3600, ethers.parseEther("1.5"), 150);

    // Recuperiamo i dettagli dell'evento aggiornato (ID 0).
    const event = await eventFactory.events(0);

    // Verifichiamo che i dettagli aggiornati siano corretti.
    expect(event.name).to.equal("Concerto Aggiornato"); // Nome aggiornato
    expect(event.location).to.equal("Roma"); // Luogo aggiornato
    expect(Number(event.ticketsAvailable)).to.equal(150); // Numero di biglietti aggiornato
  });

  // Test: verifica che sia possibile eliminare un evento.
  it("Dovrebbe eliminare un evento", async function () {
    // Calcoliamo una data valida nel futuro.
    const futureDate = Math.floor(Date.now() / 1000) + 86400;

    // Creiamo un nuovo evento.
    await eventFactory.createEvent("Concerto", "Milano", futureDate, ethers.parseEther("1"), 100);

    // Eliminiamo l'evento con ID 0.
    await eventFactory.deleteEvent(0);

    // Recuperiamo i dettagli dell'evento eliminato.
    const event = await eventFactory.events(0);

    // Verifichiamo che il nome dell'evento sia vuoto, indicando che è stato eliminato.
    expect(event.name).to.equal(""); // Verifica che l'evento sia stato eliminato
  });

  // Test: verifica che sia possibile cambiare lo stato di un evento.
  it("Dovrebbe cambiare lo stato di un evento", async function () {
    // Calcoliamo una data valida nel futuro.
    const futureDate = Math.floor(Date.now() / 1000) + 86400;

    // Creiamo un nuovo evento.
    await eventFactory.createEvent("Concerto", "Milano", futureDate, ethers.parseEther("1"), 100);

    // Cambiamo lo stato dell'evento con ID 0 a `OPEN` (stato 1).
    await eventFactory.changeEventState(0, 1);

    // Recuperiamo i dettagli dell'evento aggiornato.
    const event = await eventFactory.events(0);

    // Verifichiamo che lo stato dell'evento sia stato aggiornato correttamente.
    expect(Number(event.state)).to.equal(1); // Stato OPEN
  });
});
