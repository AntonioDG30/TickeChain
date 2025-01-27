// Importiamo le librerie necessarie: `expect` per le asserzioni nei test e `ethers` per interagire con Hardhat e gli smart contract.
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventRegistry", function () {
  // Variabili per memorizzare la factory e l'istanza del contratto EventRegistry, oltre agli account di test.
  let EventRegistry; // Factory del contratto EventRegistry
  let eventRegistry; // Istanza del contratto distribuito
  let owner, addr1, addr2; // Account di test: proprietario e due utenti

  // Questo hook `beforeEach` viene eseguito prima di ogni test, garantendo un ambiente "pulito".
  beforeEach(async function () {
    // Otteniamo la factory del contratto EventRegistry.
    EventRegistry = await ethers.getContractFactory("EventRegistry");

    // Recuperiamo i signer (account di test) forniti da Hardhat.
    [owner, addr1, addr2] = await ethers.getSigners();

    // Distribuiamo il contratto EventRegistry sulla blockchain di test.
    eventRegistry = await EventRegistry.deploy();

    // Aspettiamo che il contratto venga distribuito correttamente.
    await eventRegistry.waitForDeployment();
  });

  // Test: verifica che un utente possa registrare un evento.
  it("Dovrebbe permettere a un utente di registrare un evento", async function () {
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Data valida nel futuro (1 giorno da ora)
    await eventRegistry.connect(addr1).registerEvent("Concerto", "Milano", futureDate); // `addr1` registra un evento

    const events = await eventRegistry.listEvents(); // Recuperiamo l'elenco degli eventi registrati
    expect(events.length).to.equal(1); // Verifichiamo che ci sia un evento registrato
    expect(events[0].name).to.equal("Concerto"); // Nome dell'evento
    expect(events[0].location).to.equal("Milano"); // Luogo dell'evento
    expect(Number(events[0].date)).to.equal(futureDate); // Data dell'evento
    expect(events[0].creator).to.equal(addr1.address); // Verifica che il creatore sia `addr1`
  });

  // Test: verifica che tutti gli eventi registrati vengano restituiti.
  it("Dovrebbe restituire tutti gli eventi registrati", async function () {
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Data valida nel futuro
    await eventRegistry.connect(addr1).registerEvent("Evento 1", "Roma", futureDate); // `addr1` registra il primo evento
    await eventRegistry.connect(addr2).registerEvent("Evento 2", "Napoli", futureDate + 3600); // `addr2` registra il secondo evento

    const events = await eventRegistry.listEvents(); // Recuperiamo l'elenco di tutti gli eventi
    expect(events.length).to.equal(2); // Verifichiamo che ci siano due eventi registrati
    expect(events[0].name).to.equal("Evento 1"); // Primo evento
    expect(events[1].name).to.equal("Evento 2"); // Secondo evento
  });

  // Test: verifica che gli eventi possano essere filtrati in base al creatore.
  it("Dovrebbe filtrare eventi creati da un particolare creatore", async function () {
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Data valida nel futuro
    await eventRegistry.connect(addr1).registerEvent("Evento 1", "Roma", futureDate); // `addr1` registra il primo evento
    await eventRegistry.connect(addr2).registerEvent("Evento 2", "Napoli", futureDate + 3600); // `addr2` registra il secondo evento
    await eventRegistry.connect(addr1).registerEvent("Evento 3", "Firenze", futureDate + 7200); // `addr1` registra un altro evento

    const creatorEvents = await eventRegistry.findEventsByCreator(addr1.address); // Filtriamo gli eventi creati da `addr1`
    expect(creatorEvents.length).to.equal(2); // `addr1` ha registrato due eventi
    expect(creatorEvents[0].name).to.equal("Evento 1"); // Verifichiamo il primo evento
    expect(creatorEvents[1].name).to.equal("Evento 3"); // Verifichiamo il secondo evento
  });

  // Test: verifica che il creatore o il proprietario del contratto possa eliminare un evento.
  it("Dovrebbe permettere al creatore o al proprietario di eliminare un evento", async function () {
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Data valida nel futuro
    await eventRegistry.connect(addr1).registerEvent("Evento 1", "Roma", futureDate); // `addr1` registra un evento

    // `addr1` elimina il proprio evento
    await eventRegistry.connect(addr1).deleteEvent(0);

    const events = await eventRegistry.listEvents(); // Recuperiamo l'elenco degli eventi
    expect(events.length).to.equal(0); // Verifichiamo che non ci siano più eventi registrati
  });

  // Test: verifica che non sia possibile registrare eventi con una data passata.
  it("Dovrebbe impedire la registrazione di eventi con data passata", async function () {
    const pastDate = Math.floor(Date.now() / 1000) - 86400; // Data nel passato
    try {
      await eventRegistry.connect(addr1).registerEvent("Evento Passato", "Roma", pastDate); // `addr1` prova a registrare un evento con data passata
      throw new Error("La registrazione non avrebbe dovuto avere successo");
    } catch (error) {
      expect(error.message).to.include("La data dell'evento deve essere nel futuro"); // Verifica il messaggio di errore
    }
  });

  // Test: verifica che solo il creatore o il proprietario possa eliminare un evento.
  it("Dovrebbe impedire a utenti non autorizzati di eliminare eventi", async function () {
    const futureDate = Math.floor(Date.now() / 1000) + 86400; // Data valida nel futuro
    await eventRegistry.connect(addr1).registerEvent("Evento 1", "Roma", futureDate); // `addr1` registra un evento

    // `addr2` prova a eliminare un evento creato da `addr1`
    try {
      await eventRegistry.connect(addr2).deleteEvent(0);
      throw new Error("L'eliminazione non avrebbe dovuto avere successo");
    } catch (error) {
      expect(error.message).to.include("Non autorizzato a eliminare l'evento"); // Verifica il messaggio di errore
    }
  });
});
