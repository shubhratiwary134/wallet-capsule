// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract Wallet {
    address public owner;
    mapping(address => uint) public trackEth;
    event Deposited(address indexed sender, uint amount, uint timestamp);
    event Withdrawn(address indexed sender, uint amount, uint timestamp);
    constructor() {
        owner = msg.sender;
    }
    function deposit() external payable {
        require(msg.value > 0, "Caller of the function must send some WEI.");
        trackEth[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value, block.timestamp);
    }
    function withdraw(uint amount) external {
        require(
            amount <= trackEth[msg.sender],
            "The amount asked for the withdraw is more than the deposited"
        );
        trackEth[msg.sender] -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "The transaction was not complete");
        emit Withdrawn(msg.sender, amount, block.timestamp);
    }
}
