const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EventFactory", function () {
    let EventFactory, eventFactory, owner, addr1, addr2;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        EventFactory = await ethers.getContractFactory("EventFactory");
        eventFactory = await EventFactory.deploy();
        await eventFactory.waitForDeployment();
    });

    it("Dovrebbe creare un evento", async function () {
        const tx = await eventFactory.connect(addr1).createEvent(
            "Concerto Rock", "Roma", "Grande concerto rock", 
            Math.floor(Date.now() / 1000) + 86400, 100, 50
        );
        const txReceipt = await tx.wait();
        const eventLog = txReceipt.logs[0]; // Prende il primo evento registrato
        
        expect(eventLog).to.not.be.undefined;
    });

    it("Dovrebbe aggiornare un evento esistente", async function () {
        await eventFactory.connect(addr1).createEvent("Evento Test", "Milano", "Descrizione", 
            Math.floor(Date.now() / 1000) + 86400, 200, 30);
        
        const tx = await eventFactory.connect(addr1).updateEvent(0, "Evento Aggiornato", "Napoli", 
            Math.floor(Date.now() / 1000) + 86400, 150, 25);
        const txReceipt = await tx.wait();
        const eventLog = txReceipt.logs[0];

        expect(eventLog).to.not.be.undefined;
    });

    it("Dovrebbe eliminare un evento esistente", async function () {
        await eventFactory.connect(addr1).createEvent("Evento Eliminabile", "Venezia", "Descrizione", 
            Math.floor(Date.now() / 1000) + 86400, 50, 10);
        
        const tx = await eventFactory.connect(addr1).deleteEvent(0);
        const txReceipt = await tx.wait();
        const eventLog = txReceipt.logs[0];

        expect(eventLog).to.not.be.undefined;
    });

    it("Dovrebbe cambiare lo stato dell'evento", async function () {
        await eventFactory.connect(addr1).createEvent("Evento Stato", "Firenze", "Descrizione", 
            Math.floor(Date.now() / 1000) + 86400, 80, 20);
        
        const tx = await eventFactory.connect(addr1).changeEventState(0, 1); // Stato OPEN
        const txReceipt = await tx.wait();
        const eventLog = txReceipt.logs[0];

        expect(eventLog).to.not.be.undefined;
    });

    it("Dovrebbe ridurre il numero di biglietti disponibili", async function () {
        await eventFactory.connect(addr1).createEvent("Evento Vendita", "Bologna", "Descrizione", 
            Math.floor(Date.now() / 1000) + 86400, 120, 5);
        await eventFactory.connect(addr1).changeEventState(0, 1); // Passa a OPEN
        
        await eventFactory.decreaseTicketCount(0);
        const eventData = await eventFactory.events(0);
        expect(Number(eventData.ticketsAvailable)).to.equal(4);
    });

    it("Dovrebbe annullare un evento e attivare Emergency Stop dopo 3 cancellazioni", async function () {
        for (let i = 0; i < 3; i++) {
            await eventFactory.connect(addr1).createEvent(`Evento ${i}`, "Città", "Descrizione", 
                Math.floor(Date.now() / 1000) + 86400, 90, 15);
            await eventFactory.connect(addr1).cancelEvent(i);
        }
        expect(await eventFactory.paused()).to.be.true;
    });
});
