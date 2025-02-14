// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentManager is Pausable, Ownable {
    mapping(address => uint256) private balances;

    event FundsDeposited(address indexed user, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);
    event RefundProcessed(address indexed user, uint256 amount);
    event FundsReleased(address indexed eventCreator, uint256 amount);
    event DebugLog(string message, uint256 contractBalance, uint256 refundAmount);
    event EmergencyStopActivated(string message);

    function depositFunds() external payable whenNotPaused {
        balances[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    function processRefund(address _user, uint256 _amount) external onlyOwner whenNotPaused {
        uint256 contractBalance = address(this).balance;
        emit DebugLog("Tentativo di rimborso", contractBalance, _amount);

        require(contractBalance >= _amount, "Fondi insufficienti per il rimborso");

        (bool success, ) = payable(_user).call{value: _amount}("");
        if (!success) {
            _pause();
            emit EmergencyStopActivated("Emergency Stop attivato! Fondi insufficienti.");
        }

        emit RefundProcessed(_user, _amount);
    }

    function releaseFundsToCreator(address _eventCreator, uint256 _amount) external whenNotPaused {
        require(_eventCreator != address(0), "Indirizzo del creatore non valido");
        require(address(this).balance >= _amount, "Fondi insufficienti");

        (bool success, ) = payable(_eventCreator).call{value: _amount}("");
        require(success, "Transfer fallito");

        emit FundsReleased(_eventCreator, _amount);
    }

    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }

    function emergencyStop() external onlyOwner {
        _pause();
    }

    function resumeOperations() external onlyOwner {
        _unpause();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
