const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventRegistry", function () {
    let EventRegistry, eventRegistry, owner, addr1, addr2;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        EventRegistry = await ethers.getContractFactory("EventRegistry");
        eventRegistry = await EventRegistry.deploy();
        await eventRegistry.waitForDeployment();
    });

    it("Dovrebbe registrare un nuovo evento", async function () {
        const eventName = "Concerto Jazz";
        const eventLocation = "Milano";
        const eventDate = Math.floor(Date.now() / 1000) + 86400;

        const tx = await eventRegistry.connect(addr1).registerEvent(eventName, eventLocation, eventDate);
        await tx.wait();

        const events = await eventRegistry.listEvents();
        expect(events).to.have.lengthOf(1);
        expect(events[0].name).to.equal(eventName);
        expect(events[0].location).to.equal(eventLocation);
        expect(events[0].date).to.equal(eventDate);
        expect(events[0].creator).to.equal(addr1.address);
    });

    it("Dovrebbe restituire l'elenco di tutti gli eventi", async function () {
        const event1 = { name: "Evento1", location: "Roma", date: Math.floor(Date.now() / 1000) + 86400 };
        const event2 = { name: "Evento2", location: "Napoli", date: Math.floor(Date.now() / 1000) + 172800 };

        await eventRegistry.connect(addr1).registerEvent(event1.name, event1.location, event1.date);
        await eventRegistry.connect(addr2).registerEvent(event2.name, event2.location, event2.date);

        const events = await eventRegistry.listEvents();
        expect(events).to.have.lengthOf(2);
        expect(events[0].name).to.equal(event1.name);
        expect(events[1].name).to.equal(event2.name);
    });

    it("Dovrebbe trovare gli eventi creati da un utente specifico", async function () {
        const event1 = { name: "Evento1", location: "Roma", date: Math.floor(Date.now() / 1000) + 86400 };
        const event2 = { name: "Evento2", location: "Napoli", date: Math.floor(Date.now() / 1000) + 172800 };

        await eventRegistry.connect(addr1).registerEvent(event1.name, event1.location, event1.date);
        await eventRegistry.connect(addr1).registerEvent(event2.name, event2.location, event2.date);

        const userEvents = await eventRegistry.findEventsByCreator(addr1.address);
        expect(userEvents).to.have.lengthOf(2);
        expect(userEvents[0].name).to.equal(event1.name);
        expect(userEvents[1].name).to.equal(event2.name);
    });

    it("Dovrebbe eliminare un evento esistente", async function () {
        const eventName = "Concerto Jazz";
        const eventLocation = "Milano";
        const eventDate = Math.floor(Date.now() / 1000) + 86400;

        await eventRegistry.connect(addr1).registerEvent(eventName, eventLocation, eventDate);
        const initialEvents = await eventRegistry.listEvents();
        expect(initialEvents).to.have.lengthOf(1);

        await eventRegistry.connect(addr1).deleteEvent(0);
        const remainingEvents = await eventRegistry.listEvents();
        expect(remainingEvents).to.be.empty;
    });
});
