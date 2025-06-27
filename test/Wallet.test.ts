import { ethers } from "hardhat";
import { expect } from "chai";
import type { Wallet } from "../typechain-types";

describe("Wallet Contract", function () {
  let wallet: Wallet;
  let owner: any;
  let user1: any;

  beforeEach(async () => {
    [owner, user1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    wallet = (await Factory.deploy()) as Wallet;
    await wallet.waitForDeployment();
  });

  it("sets the correct owner", async () => {
    expect(await wallet.owner()).to.equal(owner.address);
  });

  it("allows deposit via deposit() and stores a safe", async () => {
    const lockTime = 120;
    const amount = ethers.parseEther("1.0");

    await expect(
      wallet.connect(user1).deposit(lockTime, { value: amount })
    ).to.emit(wallet, "Deposited");

    const safes = await wallet.connect(user1).getSafes();
    expect(safes.length).to.equal(1);
    expect(safes[0].amount).to.equal(amount);

    const safe = await wallet.connect(user1).getParticularSafe(0);
    const block = await ethers.provider.getBlock("latest");
    if (!block) throw new Error("Unable to fetch block");
    expect(safe.unlockTime).to.be.approximately(block.timestamp + lockTime, 2);
  });

  it("rejects deposits exceeding maxLimit", async () => {
    const big = ethers.parseEther("10.0");
    await expect(
      wallet.connect(user1).deposit(120, { value: big })
    ).to.be.revertedWith("Higher than the limit of none ether sent.");
  });

  it("handles receive() fallback for direct ETH", async () => {
    const amount = ethers.parseEther("0.5");

    await expect(
      user1.sendTransaction({ to: wallet.target, value: amount })
    ).to.emit(wallet, "Deposited");

    const safes = await wallet.connect(user1).getSafes();
    expect(safes[0].amount).to.equal(amount);
  });

  it("reverts on invalid function call (fallback)", async () => {
    await expect(
      user1.sendTransaction({
        to: wallet.target,
        data: "0x12345678",
        value: ethers.parseEther("0.1"),
      })
    ).to.be.revertedWith("Invalid function call,REVERTED");
  });

  it("enforces max 20 safes per user", async () => {
    const amt = ethers.parseEther("0.01");
    for (let i = 0; i < 20; i++) {
      await wallet.connect(user1).deposit(1, { value: amt });
    }
    await expect(
      wallet.connect(user1).deposit(1, { value: amt })
    ).to.be.revertedWith("Too many safes created");
  });

  it("enforces lock time before withdrawal", async () => {
    await wallet
      .connect(user1)
      .deposit(300, { value: ethers.parseEther("0.2") });
    await expect(
      wallet.connect(user1).withdraw(ethers.parseEther("0.2"), 0)
    ).to.be.revertedWith("The safe is still locked");
  });

  it("allows full withdrawal after unlock", async () => {
    const amt = ethers.parseEther("0.3");
    await wallet.connect(user1).deposit(1, { value: amt });

    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    const before = await ethers.provider.getBalance(user1.address);
    const tx = await wallet.connect(user1).withdraw(amt, 0);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction receipt is null");
    const gas = receipt.cumulativeGasUsed * receipt.gasPrice;
    const after = await ethers.provider.getBalance(user1.address);

    expect(after - before + gas).to.equal(amt);
    expect(await wallet.connect(user1).getSafes()).to.be.empty;
  });

  it("supports partial withdrawal", async () => {
    const amt = ethers.parseEther("1.0");
    await wallet.connect(user1).deposit(1, { value: amt });

    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    const part = ethers.parseEther("0.4");
    await wallet.connect(user1).withdraw(part, 0);
    const safe = (await wallet.connect(user1).getSafes())[0];
    expect(safe.amount).to.equal(amt - part);
  });

  it("errors when withdrawing more than safe balance", async () => {
    await wallet.connect(user1).deposit(1, { value: ethers.parseEther("0.2") });
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    await expect(
      wallet.connect(user1).withdraw(ethers.parseEther("0.3"), 0)
    ).to.be.revertedWith(
      "The amount asked for the withdraw is more than the balance."
    );
  });

  it("errors on invalid safe index", async () => {
    await expect(
      wallet.connect(user1).withdraw(ethers.parseEther("0.1"), 0)
    ).to.be.revertedWith("The Safe does not exist.");
  });

  it("reorders pending safes correctly after full withdraw", async () => {
    await wallet.connect(user1).deposit(1, { value: ethers.parseEther("0.5") });
    await wallet.connect(user1).deposit(1, { value: ethers.parseEther("0.2") });

    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    await wallet.connect(user1).withdraw(ethers.parseEther("0.5"), 0);
    const safes = await wallet.connect(user1).getSafes();
    expect(safes.length).to.equal(1);
    expect(safes[0].amount).to.equal(ethers.parseEther("0.2"));
  });
});
