const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketManager", function () {
  let TicketManager, ticketManager, owner, addr1, addr2;

  beforeEach(async function () {
    TicketManager = await ethers.getContractFactory("TicketManager");
    [owner, addr1, addr2] = await ethers.getSigners();
    ticketManager = await TicketManager.deploy("EventTicket", "ETK");
    await ticketManager.waitForDeployment();
  });

  it("Dovrebbe permettere al proprietario di emettere un biglietto", async function () {
    await ticketManager.mintTicket(addr1.address, "https://example.com/ticket1");
    const ownerOfTicket = await ticketManager.ownerOf(0);
    expect(ownerOfTicket).to.equal(addr1.address);
  });
});
