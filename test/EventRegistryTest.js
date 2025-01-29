// Importiamo le librerie necessarie per i test: `expect` per le asserzioni nei test e `ethers` per interagire con Hardhat e gli smart contract.
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventRegistry", function () {
  // Dichiarazione delle variabili necessarie per i test.
  // `EventRegistry` è la factory per il contratto EventRegistry, mentre `eventRegistry` è l'istanza del contratto distribuito.
  // `owner`, `addr1`, `addr2` sono gli account di test generati da Hardhat.
  let EventRegistry; // La factory per il contratto EventRegistry
  let eventRegistry; // L'istanza del contratto distribuito
  let owner, addr1, addr2; // Account di test: proprietario (owner) e due utenti (addr1, addr2)

  // Il blocco `beforeEach` viene eseguito prima di ogni test, assicurando che ogni test parta con un ambiente pulito.
  beforeEach(async function () {
    // Recuperiamo la factory per il contratto EventRegistry
    EventRegistry = await ethers.getContractFactory("EventRegistry");

    // Otteniamo gli account di test forniti da Hardhat
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deployiamo il contratto EventRegistry sulla blockchain di test
    eventRegistry = await EventRegistry.deploy();

    // Aspettiamo che il contratto venga distribuito correttamente
    await eventRegistry.waitForDeployment();
  });

  // Test 1: Verifica che un utente possa registrare un evento
  it("Dovrebbe permettere a un utente di registrare un evento", async function () {
    // Calcoliamo una data futura (un giorno da ora) per l'evento
    const futureDate = Math.floor(Date.now() / 1000) + 86400;

    // Registriamo un nuovo evento con il nome "Concerto", il luogo "Milano", e la data futura
    await eventRegistry.connect(addr1).registerEvent("Concerto", "Milano", futureDate);

    // Recuperiamo la lista degli eventi registrati
    const events = await eventRegistry.listEvents();

    // Verifichiamo che ci sia un solo evento registrato
    expect(events.length).to.equal(1);

    // Verifica che le informazioni dell'evento corrispondano a quelle registrate
    expect(events[0].name).to.equal("Concerto"); // Nome dell'evento
    expect(events[0].location).to.equal("Milano"); // Luogo dell'evento
    expect(Number(events[0].date)).to.equal(futureDate); // Data dell'evento
    expect(events[0].creator).to.equal(addr1.address); // Verifica che l'account creatore sia `addr1`
  });

  // Test 2: Verifica che tutti gli eventi registrati vengano restituiti
  it("Dovrebbe restituire tutti gli eventi registrati", async function () {
    // Calcoliamo una data futura per i due eventi
    const futureDate = Math.floor(Date.now() / 1000) + 86400;

    // Registriamo due eventi, uno da `addr1` e uno da `addr2`
    await eventRegistry.connect(addr1).registerEvent("Evento 1", "Roma", futureDate);
    await eventRegistry.connect(addr2).registerEvent("Evento 2", "Napoli", futureDate + 3600);

    // Recuperiamo la lista di tutti gli eventi registrati
    const events = await eventRegistry.listEvents();

    // Verifica che ci siano due eventi registrati
    expect(events.length).to.equal(2);

    // Verifica che i nomi degli eventi corrispondano a quelli registrati
    expect(events[0].name).to.equal("Evento 1"); // Primo evento
    expect(events[1].name).to.equal("Evento 2"); // Secondo evento
  });

  // Test 3: Verifica che gli eventi possano essere filtrati in base al creatore
  it("Dovrebbe filtrare eventi creati da un particolare creatore", async function () {
    // Calcoliamo una data futura
    const futureDate = Math.floor(Date.now() / 1000) + 86400;

    // Registriamo tre eventi da due creatori diversi
    await eventRegistry.connect(addr1).registerEvent("Evento 1", "Roma", futureDate);
    await eventRegistry.connect(addr2).registerEvent("Evento 2", "Napoli", futureDate + 3600);
    await eventRegistry.connect(addr1).registerEvent("Evento 3", "Firenze", futureDate + 7200);

    // Filtriamo gli eventi creati da `addr1`
    const creatorEvents = await eventRegistry.findEventsByCreator(addr1.address);

    // Verifica che `addr1` abbia creato due eventi
    expect(creatorEvents.length).to.equal(2);
    expect(creatorEvents[0].name).to.equal("Evento 1"); // Primo evento creato da `addr1`
    expect(creatorEvents[1].name).to.equal("Evento 3"); // Secondo evento creato da `addr1`
  });

  // Test 4: Verifica che solo il creatore o il proprietario del contratto possa eliminare un evento
  it("Dovrebbe permettere al creatore o al proprietario di eliminare un evento", async function () {
    // Calcoliamo una data futura
    const futureDate = Math.floor(Date.now() / 1000) + 86400;

    // Registriamo un evento da `addr1`
    await eventRegistry.connect(addr1).registerEvent("Evento 1", "Roma", futureDate);

    // `addr1` elimina il proprio evento
    await eventRegistry.connect(addr1).deleteEvent(0);

    // Recuperiamo la lista degli eventi
    const events = await eventRegistry.listEvents();

    // Verifica che non ci siano eventi registrati dopo l'eliminazione
    expect(events.length).to.equal(0); // Verifica che non ci siano più eventi registrati
  });

  // Test 5: Verifica che non sia possibile registrare eventi con una data passata
  it("Dovrebbe impedire la registrazione di eventi con data passata", async function () {
    // Calcoliamo una data nel passato (un giorno prima)
    const pastDate = Math.floor(Date.now() / 1000) - 86400;

    try {
      // `addr1` prova a registrare un evento con una data passata
      await eventRegistry.connect(addr1).registerEvent("Evento Passato", "Roma", pastDate);
      // Se il codice arriva qui, il test fallisce perché non dovrebbe essere possibile registrare un evento con una data passata
      throw new Error("La registrazione non avrebbe dovuto avere successo");
    } catch (error) {
      // Verifica che l'errore sia quello previsto (la data deve essere nel futuro)
      expect(error.message).to.include("La data dell'evento deve essere nel futuro");
    }
  });

  // Test 6: Verifica che solo il creatore o il proprietario possa eliminare un evento
  it("Dovrebbe impedire a utenti non autorizzati di eliminare eventi", async function () {
    // Calcoliamo una data futura
    const futureDate = Math.floor(Date.now() / 1000) + 86400;

    // Registriamo un evento da `addr1`
    await eventRegistry.connect(addr1).registerEvent("Evento 1", "Roma", futureDate);

    try {
      // `addr2` prova a eliminare un evento creato da `addr1`
      await eventRegistry.connect(addr2).deleteEvent(0);
      // Se il codice arriva qui, il test fallisce perché `addr2` non è autorizzato a eliminare l'evento
      throw new Error("L'eliminazione non avrebbe dovuto avere successo");
    } catch (error) {
      // Verifica che l'errore sia quello previsto (non autorizzato)
      expect(error.message).to.include("Non autorizzato a eliminare l'evento");
    }
  });
});
