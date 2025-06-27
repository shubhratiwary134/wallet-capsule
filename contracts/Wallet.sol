// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract Wallet {
    address public owner;
    struct Safe {
        uint amount;
        uint unlockTime;
    }
    uint public maxLimit = 5 ether;
    mapping(address => Safe[]) public userSafes;
    event Deposited(address indexed sender, uint amount, uint timestamp);
    event Withdrawn(address indexed sender, uint amount, uint timestamp);
    constructor() {
        owner = msg.sender;
    }
    receive() external payable {
        require(
            msg.value > 0 && msg.value <= maxLimit,
            "Higher than the limit of none ether sent."
        );
        require(userSafes[msg.sender].length < 20, "Too many safes created");
        userSafes[msg.sender].push(Safe(msg.value, block.timestamp + 120));
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }
    fallback() external payable {
        revert("Invalid function call,REVERTED");
    }
    function deposit(uint lockTime) external payable {
        require(
            msg.value > 0 && msg.value <= maxLimit,
            "Higher than the limit of none ether sent."
        );
        require(userSafes[msg.sender].length < 20, "Too many safes created");
        userSafes[msg.sender].push(Safe(msg.value, block.timestamp + lockTime));
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }
    function withdraw(uint amount, uint safeIndex) external {
        require(
            safeIndex < userSafes[msg.sender].length,
            "The Safe does not exist."
        );
        Safe storage safe = userSafes[msg.sender][safeIndex];
        require(
            amount <= safe.amount,
            "The amount asked for the withdraw is more than the balance."
        );
        require(block.timestamp >= safe.unlockTime, "The safe is still locked");
        safe.amount = safe.amount - amount;
        if (safe.amount == 0) {
            uint last = userSafes[msg.sender].length - 1;
            if (last != safeIndex) {
                userSafes[msg.sender][safeIndex] = userSafes[msg.sender][last];
            }
            userSafes[msg.sender].pop();
        }
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "The transaction was not complete");
        emit Withdrawn(msg.sender, amount, block.timestamp);
    }
    function getSafes() external view returns (Safe[] memory) {
        return userSafes[msg.sender];
    }
    function getParticularSafe(
        uint safeIndex
    ) external view returns (Safe memory) {
        return userSafes[msg.sender][safeIndex];
    }
}
