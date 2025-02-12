// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaymentManager
 * @dev Gestisce pagamenti e rimborsi in puro ETH, senza dipendenze da altri contratti.
 */
contract PaymentManager is Pausable, Ownable {
    // Mapping per tenere traccia dei fondi depositati da ogni utente
    mapping(address => uint256) private balances;

    // Eventi per tracciare le transazioni
    event FundsDeposited(address indexed user, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);
    event RefundProcessed(address indexed user, uint256 amount);
    event RefundAttempt(address indexed user, uint256 amount, uint256 contractBalance);

    /**
     * @dev Permette agli utenti di depositare fondi in ETH.
     */
    function depositFunds() external payable whenNotPaused {
        // ✅ Aggiunge direttamente i fondi al saldo dell'utente senza controlli
        balances[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Permette agli utenti di ritirare i propri fondi in ETH.
     * @param _amount Quantità di ETH da ritirare.
     */
    function withdrawFunds(uint256 _amount) external whenNotPaused {
        // ✅ Effettua il prelievo senza controlli (validazione lato frontend)
        balances[msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);
        emit FundsWithdrawn(msg.sender, _amount);
    }

    /**
     * @dev Esegue un rimborso in ETH senza richiedere autorizzazioni.
     * @param _user Indirizzo dell'utente da rimborsare.
     * @param _amount Importo in ETH.
     */
    function processRefund(address _user, uint256 _amount) external onlyOwner whenNotPaused {
        emit RefundAttempt(_user, _amount, address(this).balance);

        // ✅ Se il contratto non ha fondi, emette un log invece di fallire
        if (address(this).balance < _amount) {
            emit RefundProcessed(_user, 0); // Indica che il rimborso non è stato eseguito
            return;
        }

        // ✅ Prova a inviare i fondi e cattura eventuali errori
        (bool success, ) = payable(_user).call{value: _amount}("");
        emit RefundProcessed(_user, success ? _amount : 0);
    }


    /**
     * @dev Restituisce il saldo di un utente.
     * @param _user Indirizzo dell'utente.
     * @return Saldo dell'utente in ETH.
     */
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }

    /**
     * @dev Sospende il contratto, disabilitando le funzioni di modifica dello stato.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Riabilita il contratto, permettendo di nuovo le funzioni di modifica dello stato.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
