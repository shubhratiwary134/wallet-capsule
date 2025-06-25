// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract Wallet {
    address public owner;
    mapping(address => uint) public trackEth;
    constructor() {
        owner = msg.sender;
    }
    function deposit() external payable {
        require(msg.value > 0, "Caller of the function must send some WEI.");
        trackEth[msg.sender] += msg.value;
    }
}
