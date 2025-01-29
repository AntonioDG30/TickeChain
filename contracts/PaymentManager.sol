// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PaymentManager
 * @dev Contratto per gestire pagamenti e rimborsi tramite token ERC-20.
 * Implementa il pattern Pull Payment per garantire sicurezza nelle transazioni.
 */
contract PaymentManager is Pausable, Ownable {
    IERC20 public paymentToken; // Token ERC-20 utilizzato per i pagamenti

    // Mapping per tenere traccia dei fondi depositati dagli utenti
    mapping(address => uint256) private balances;

    // Eventi per registrare le transazioni
    event FundsDeposited(address indexed user, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);
    event RefundProcessed(address indexed user, uint256 amount);

    /**
     * @dev Costruttore del contratto.
     * @param _paymentToken Indirizzo del contratto del token ERC-20 da utilizzare.
     */
    constructor(address _paymentToken) {
        require(_paymentToken != address(0), "Indirizzo del token non valido");
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @dev Permette agli utenti di depositare fondi nel contratto.
     * @param _amount Quantità di token da depositare.
     */
    function depositFunds(uint256 _amount) external whenNotPaused {
        require(_amount > 0, "L'importo deve essere maggiore di zero");

        // Trasferiamo i token dal mittente al contratto
        require(
            paymentToken.transferFrom(msg.sender, address(this), _amount),
            "Trasferimento dei token fallito"
        );

        // Aggiorniamo il saldo dell'utente
        balances[msg.sender] += _amount;

        emit FundsDeposited(msg.sender, _amount);
    }

    /**
     * @dev Permette agli utenti di ritirare i propri fondi.
     * @param _amount Quantità di token da ritirare.
     */
    function withdrawFunds(uint256 _amount) external whenNotPaused {
        require(_amount > 0, "L'importo deve essere maggiore di zero");
        require(balances[msg.sender] >= _amount, "Fondi insufficienti");

        // Riduciamo il saldo dell'utente
        balances[msg.sender] -= _amount;

        // Trasferiamo i token all'utente
        require(
            paymentToken.transfer(msg.sender, _amount),
            "Trasferimento dei token fallito"
        );

        emit FundsWithdrawn(msg.sender, _amount);
    }

    /**
     * @dev Processa un rimborso a un utente specifico.
     * Solo il proprietario del contratto può eseguire questa funzione.
     * @param _user Indirizzo dell'utente da rimborsare.
     * @param _amount Quantità di token da rimborsare.
     */
    function processRefund(address _user, uint256 _amount) external onlyOwner whenNotPaused {
        require(_user != address(0), "Indirizzo utente non valido");
        require(_amount > 0, "L'importo deve essere maggiore di zero");

        // Verifica che il contratto abbia abbastanza fondi nel token ERC-20
        uint256 contractBalance = paymentToken.balanceOf(address(this));
        require(contractBalance >= _amount, "Fondi del contratto insufficienti");

        // 🔹 Aggiungiamo l'importo al saldo dell'utente prima del rimborso
        balances[_user] += _amount;

        // Trasferiamo i token all'utente
        require(
            paymentToken.transfer(_user, _amount),
            "Trasferimento dei token fallito"
        );

        emit RefundProcessed(_user, _amount);
    }



    /**
     * @dev Restituisce il saldo di un utente.
     * @param _user Indirizzo dell'utente.
     * @return Saldo dell'utente.
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
