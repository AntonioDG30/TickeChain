const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentManager", function () {
    let PaymentManager, paymentManager, owner, addr1, addr2;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        PaymentManager = await ethers.getContractFactory("PaymentManager");
        paymentManager = await PaymentManager.deploy();
        await paymentManager.waitForDeployment();
    });

    it("Dovrebbe permettere il deposito di fondi (simulato)", async function () {
        const depositAmount = ethers.parseEther("1.0");
        
        await paymentManager.connect(owner).depositFunds({ value: depositAmount });
        
        const balance = await paymentManager.getBalance(owner.address);
        expect(balance).to.equal(depositAmount);
    });

    it("Dovrebbe eseguire un rimborso (simulato)", async function () {
        const depositAmount = ethers.parseEther("1.0");
        await paymentManager.connect(owner).depositFunds({ value: depositAmount });
        
        const refundAmount = ethers.parseEther("0.5");
        await paymentManager.connect(owner).processRefund(addr1.address, refundAmount);
        
        const balanceAfterRefund = await ethers.provider.getBalance(addr1.address);
        expect(Number(balanceAfterRefund)).to.be.greaterThan(Number(refundAmount));
    });

    it("Dovrebbe rilasciare i fondi al creatore dell'evento (simulato)", async function () {
        const depositAmount = ethers.parseEther("2.0");
        await paymentManager.connect(owner).depositFunds({ value: depositAmount });
        
        const releaseAmount = ethers.parseEther("1.5");
        await paymentManager.connect(owner).releaseFundsToCreator(addr2.address, releaseAmount);
        
        const balanceAfterRelease = await ethers.provider.getBalance(addr2.address);
        expect(Number(balanceAfterRelease)).to.be.greaterThan(Number(releaseAmount));
    });

    it("Dovrebbe restituire il saldo di un utente (simulato)", async function () {
        const depositAmount = ethers.parseEther("1.0");
        await paymentManager.connect(owner).depositFunds({ value: depositAmount });
        
        const balance = await paymentManager.getBalance(owner.address);
        expect(balance).to.equal(depositAmount);
    });

    it("Dovrebbe attivare e disattivare Emergency Stop", async function () {
        await paymentManager.emergencyStop();
        expect(await paymentManager.paused()).to.be.true;
        
        await paymentManager.resumeOperations();
        expect(await paymentManager.paused()).to.be.false;
    });
});
