// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Importiamo il contratto IERC20 per interagire con i token ERC-20
// Importiamo Pausable per abilitare la possibilità di sospendere il contratto
// Importiamo Ownable per la gestione del contratto da parte di un unico proprietario
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Importiamo il contratto EventFactory.sol per interagire con gli eventi creati
import "./EventFactory.sol";

/**
 * @title PaymentManager
 * @dev Contratto per gestire pagamenti e rimborsi tramite token ERC-20.
 * Implementa il pattern Pull Payment per garantire sicurezza nelle transazioni.
 * Questo contratto permette agli utenti di depositare, ritirare fondi e ricevere rimborsi.
 */
contract PaymentManager is Pausable, Ownable {
    // Il token ERC-20 utilizzato per le transazioni (pagamenti e rimborsi)
    IERC20 public paymentToken; 

    // Riferimento al contratto EventFactory per la gestione degli eventi
    EventFactory public eventFactory;

    // Mapping per tenere traccia dei fondi depositati da ogni utente
    mapping(address => uint256) private balances;

    // Eventi per registrare le transazioni di deposito, ritiro e rimborso
    event FundsDeposited(address indexed user, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);
    event RefundProcessed(address indexed user, uint256 amount);

    /**
     * @dev Costruttore del contratto.
     * @param _paymentToken Indirizzo del contratto del token ERC-20 da utilizzare.
     * @param _eventFactory Indirizzo del contratto EventFactory per gestire gli eventi.
     */
    constructor(address _paymentToken, address _eventFactory) {
        // Verifica che gli indirizzi passati non siano nulli
        require(_paymentToken != address(0), "Indirizzo del token non valido");
        require(_eventFactory != address(0), "Indirizzo del contratto EventFactory non valido");
        
        // Inizializza il token di pagamento e il contratto EventFactory
        paymentToken = IERC20(_paymentToken);
        eventFactory = EventFactory(_eventFactory);  // Inizializza EventFactory
    }

    /**
     * @dev Permette agli utenti di depositare fondi nel contratto.
     * @param _amount Quantità di token da depositare.
     */
    function depositFunds(uint256 _amount) external whenNotPaused {
        // Verifica che l'importo sia maggiore di zero
        require(_amount > 0, "L'importo deve essere maggiore di zero");

        uint256 userBalance = balances[msg.sender]; // Ottiene il saldo dell'utente prima del deposito

        // Trasferisce i token dal chiamante al contratto
        require(
            paymentToken.transferFrom(msg.sender, address(this), _amount),
            "Trasferimento dei token fallito"
        );

        // Aggiunge l'importo al saldo dell'utente
        balances[msg.sender] = userBalance + _amount;

        // Emmette un evento di deposito
        emit FundsDeposited(msg.sender, _amount);
    }

    /**
     * @dev Permette agli utenti di ritirare i propri fondi.
     * @param _amount Quantità di token da ritirare.
     */
    function withdrawFunds(uint256 _amount) external whenNotPaused {
        // Verifica che l'importo sia maggiore di zero e che l'utente abbia abbastanza fondi
        require(_amount > 0, "L'importo deve essere maggiore di zero");
        require(balances[msg.sender] >= _amount, "Fondi insufficienti");

        // Riduce il saldo dell'utente prima di trasferire i fondi
        balances[msg.sender] -= _amount;

        // Trasferisce i token all'utente
        require(
            paymentToken.transfer(msg.sender, _amount),
            "Trasferimento dei token fallito"
        );

        // Emmette un evento di prelievo
        emit FundsWithdrawn(msg.sender, _amount);
    }

    /**
     * @dev Processa un rimborso a un utente specifico.
     * Solo il proprietario del contratto può eseguire questa funzione.
     * @param _user Indirizzo dell'utente da rimborsare.
     * @param _amount Quantità di token da rimborsare.
     * @param eventId ID dell'evento associato al rimborso.
     */
    function processRefund(address _user, uint256 _amount, uint256 eventId) external onlyOwner whenNotPaused {
        // Verifica che l'indirizzo dell'utente non sia nullo e che l'importo sia maggiore di zero
        require(_user != address(0), "Indirizzo utente non valido");
        require(_amount > 0, "L'importo deve essere maggiore di zero");

        // Verifica se l'evento è stato annullato
        require(eventFactory.isEventCancelled(eventId), "L'evento non e' stato annullato");

        // Verifica che il contratto abbia abbastanza fondi per il rimborso
        uint256 contractBalance = paymentToken.balanceOf(address(this));
        if (contractBalance < _amount) {
            revert("Fondi del contratto insufficienti");
        }

        // Aggiorna il saldo dell'utente prima di trasferire i fondi
        balances[_user] += _amount;

        // Trasferisce i fondi all'utente
        require(
            paymentToken.transfer(_user, _amount),
            "Trasferimento dei token fallito"
        );

        // Emmette un evento di rimborso
        emit RefundProcessed(_user, _amount);
    }

    /**
     * @dev Restituisce il saldo di un utente.
     * @param _user Indirizzo dell'utente.
     * @return Saldo dell'utente.
     */
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user]; // Restituisce il saldo dell'utente
    }

    /**
     * @dev Sospende il contratto, disabilitando le funzioni di modifica dello stato.
     */
    function pause() external onlyOwner {
        _pause(); // Chiama la funzione _pause() ereditata dal contratto Pausable
    }

    /**
     * @dev Riabilita il contratto, permettendo di nuovo le funzioni di modifica dello stato.
     */
    function unpause() external onlyOwner {
        _unpause(); // Chiama la funzione _unpause() ereditata dal contratto Pausable
    }
}
