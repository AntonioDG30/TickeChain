// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Importazione di contratti OpenZeppelin per sicurezza e gestione degli accessi
import "@openzeppelin/contracts/security/Pausable.sol";  // Permette di sospendere il contratto in caso di emergenza
import "@openzeppelin/contracts/access/Ownable.sol";     // Definisce un proprietario con privilegi amministrativi

/**
 * @title PaymentManager
 * @dev Contratto per la gestione dei pagamenti e dei rimborsi per gli eventi.
 * @dev Supporta depositi, prelievi, rimborsi e il rilascio di fondi ai creatori di eventi.
 */
contract PaymentManager is Pausable, Ownable {
    
    /// @notice Mappatura degli indirizzi degli utenti ai loro saldi in token ETH
    mapping(address => uint256) private balances;

    /// @notice Evento emesso quando un utente deposita fondi
    /// @param user Indirizzo dell'utente che deposita i fondi
    /// @param amount Importo depositato in wei
    event FundsDeposited(address indexed user, uint256 amount);

    /// @notice Evento emesso quando un utente preleva fondi
    /// @param user Indirizzo dell'utente che preleva i fondi
    /// @param amount Importo prelevato in wei
    event FundsWithdrawn(address indexed user, uint256 amount);

    /// @notice Evento emesso quando viene processato un rimborso a un utente
    /// @param user Indirizzo dell'utente rimborsato
    /// @param amount Importo rimborsato in wei
    event RefundProcessed(address indexed user, uint256 amount);

    /// @notice Evento emesso quando i fondi vengono rilasciati al creatore di un evento
    /// @param eventCreator Indirizzo del creatore dell'evento
    /// @param amount Importo trasferito in wei
    event FundsReleased(address indexed eventCreator, uint256 amount);

    /// @notice Evento di debug per registrare informazioni su rimborsi e bilanci
    /// @param message Messaggio di debug
    /// @param contractBalance Saldo del contratto in wei
    /// @param refundAmount Importo del rimborso in wei
    event DebugLog(string message, uint256 contractBalance, uint256 refundAmount);

    /// @notice Evento emesso quando viene attivato l'`Emergency Stop`
    /// @param message Messaggio di emergenza
    event EmergencyStopActivated(string message);

    /**
     * @notice Permette a un utente di depositare fondi nel contratto.
     * @dev La funzione è protetta dal modifier `whenNotPaused`, quindi non può essere eseguita se il contratto è in pausa.
     */
    function depositFunds() external payable whenNotPaused {
        // Aggiunge i fondi al saldo dell'utente
        balances[msg.sender] += msg.value;

        // Emette un evento per registrare il deposito
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Esegue un rimborso a un utente specificato.
     * @dev Solo il proprietario del contratto può eseguire un rimborso.
     * @dev Se i fondi sono insufficienti, viene attivato l'`Emergency Stop`.
     * @param _user Indirizzo dell'utente che deve ricevere il rimborso.
     * @param _amount Importo da rimborsare in wei.
     */
    function processRefund(address _user, uint256 _amount) external whenNotPaused {
        uint256 contractBalance = address(this).balance;

        // Registra un log di debug per il rimborso
        emit DebugLog("Tentativo di rimborso", contractBalance, _amount);

        // Verifica che il contratto abbia abbastanza fondi per il rimborso
        require(contractBalance >= _amount, "Fondi insufficienti per il rimborso");

        // Esegue il trasferimento dei fondi all'utente
        (bool success, ) = payable(_user).call{value: _amount}("");
        
        // Se il trasferimento fallisce, attiva l'`Emergency Stop`
        if (!success) {
            _pause();
            emit EmergencyStopActivated("Emergency Stop attivato! Fondi insufficienti.");
        }

        // Emette un evento per segnalare il rimborso
        emit RefundProcessed(_user, _amount);
    }

    /**
     * @notice Rilascia i fondi accumulati al creatore di un evento.
     * @dev Può essere chiamata per pagare il creatore di un evento dopo la vendita dei biglietti.
     * @param _eventCreator Indirizzo del creatore dell'evento.
     * @param _amount Importo da trasferire in wei.
     */
    function releaseFundsToCreator(address _eventCreator, uint256 _amount) external whenNotPaused {
        // Verifica che l'indirizzo del creatore dell'evento sia valido
        require(_eventCreator != address(0), "Indirizzo del creatore non valido");

        // Controlla che il contratto abbia abbastanza fondi per il pagamento
        require(address(this).balance >= _amount, "Fondi insufficienti");

        // Esegue il trasferimento al creatore dell'evento
        (bool success, ) = payable(_eventCreator).call{value: _amount}("");
        
        // Verifica che il trasferimento sia avvenuto con successo
        require(success, "Transfer fallito");

        // Emette un evento per segnalare il trasferimento dei fondi
        emit FundsReleased(_eventCreator, _amount);
    }

    /**
     * @notice Restituisce il saldo di un utente.
     * @dev La funzione è `view`, quindi non modifica lo stato della blockchain.
     * @param _user Indirizzo dell'utente.
     * @return Il saldo dell'utente in wei.
     */
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }

    /**
     * @notice Attiva la modalità di emergenza (Emergency Stop).
     * @dev Solo il proprietario del contratto può attivarla.
     * @dev Blocca tutte le funzioni che sono protette dal modifier `whenNotPaused`.
     */
    function emergencyStop() external onlyOwner {
        _pause();
    }

    /**
     * @notice Riprende le operazioni dopo un'emergenza.
     * @dev Solo il proprietario del contratto può riattivare le operazioni.
     * @dev Riabilita tutte le funzioni che erano bloccate da `whenNotPaused`.
     */
    function resumeOperations() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Mette in pausa il contratto manualmente.
     * @dev Solo il proprietario può sospendere le operazioni.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Riattiva il contratto dopo una pausa.
     * @dev Solo il proprietario può riabilitare le operazioni.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
