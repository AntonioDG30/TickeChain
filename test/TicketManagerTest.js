const { expect } = require("chai");
require("@nomicfoundation/hardhat-chai-matchers");
const { ethers } = require("hardhat");

describe("TicketManager", function () {
    let TicketManager, ticketManager, owner, addr1, addr2;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        TicketManager = await ethers.getContractFactory("TicketManager");
        ticketManager = await TicketManager.deploy();
        await ticketManager.waitForDeployment();
    });

    it("Dovrebbe creare un nuovo biglietto", async function () {
        const eventId = 1;
        const ticketURI = "ipfs://ticketMetadata";

        const tx = await ticketManager.connect(owner).mintTicket(addr1.address, ticketURI, eventId);
        await tx.wait();

        const ticketOwner = await ticketManager.ownerOf(1);
        expect(ticketOwner).to.equal(addr1.address);

        const assignedURI = await ticketManager.tokenURI(1);
        expect(assignedURI).to.equal(ticketURI);
    });

    it("Dovrebbe rimborsare e bruciare un biglietto", async function () {
        const eventId = 1;
        const ticketURI = "ipfs://ticketMetadata";

        await ticketManager.connect(owner).mintTicket(addr1.address, ticketURI, eventId);

        await ticketManager.connect(addr1).refundTicket(1);

        await expect(ticketManager.ownerOf(1)).to.be.reverted;
    });

    it("Dovrebbe verificare un biglietto", async function () {
        const eventId = 1;
        const ticketURI = "ipfs://ticketMetadata";

        await ticketManager.connect(owner).mintTicket(addr1.address, ticketURI, eventId);

        await ticketManager.connect(owner).markTicketAsVerified(1);

        const isVerified = await ticketManager.isTicketVerified(1);
        expect(isVerified).to.be.true;
    });

    it("Dovrebbe controllare se un biglietto è attivo", async function () {
        const eventId = 1;
        const ticketURI = "ipfs://ticketMetadata";

        await ticketManager.connect(owner).mintTicket(addr1.address, ticketURI, eventId);

        const isActive = await ticketManager.isTicketActive(1);
        expect(isActive).to.be.true;
    });
});
