// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Importazione dei contratti OpenZeppelin per la gestione di NFT, sicurezza e accesso amministrativo
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";  // Estensione ERC-721 per la gestione degli URI dei token
import "@openzeppelin/contracts/security/Pausable.sol";  // Permette di sospendere il contratto in caso di emergenza
import "@openzeppelin/contracts/access/Ownable.sol";  // Definisce un proprietario con privilegi amministrativi

/**
 * @title TicketManager
 * @dev Contratto per la gestione di biglietti NFT su blockchain Ethereum.
 * @dev Supporta la creazione, il rimborso, la verifica e la sospensione dei biglietti.
 */
contract TicketManager is ERC721URIStorage, Pausable, Ownable {
    
    /// @notice Contatore globale per assegnare ID univoci ai biglietti
    uint256 private ticketCounter;  

    /// @notice Contatore per tenere traccia degli errori di minting
    uint256 private failedMintAttempts = 0; 

    /// @notice Mappatura che associa un biglietto a un ID evento
    mapping(uint256 => uint256) public ticketToEventId;

    /// @notice Mappatura che registra i biglietti rimborsati
    mapping(uint256 => bool) public refundedTickets;

    /// @notice Mappatura che tiene traccia dei biglietti attivi (non rimborsati)
    mapping(uint256 => bool) public activeTickets;

    /// @notice Mappatura che tiene traccia dei biglietti verificati per l'accesso all'evento
    mapping(uint256 => bool) public verifiedTickets;  

    /// @notice Evento emesso alla creazione di un nuovo biglietto NFT
    /// @param ticketId ID del biglietto
    /// @param owner Indirizzo del proprietario del biglietto
    /// @param uri URI associato al biglietto
    /// @param eventId ID dell'evento associato
    event TicketMinted(uint256 indexed ticketId, address indexed owner, string uri, uint256 eventId);

    /// @notice Evento emesso quando un biglietto viene rimborsato e bruciato
    /// @param ticketId ID del biglietto rimborsato
    /// @param owner Indirizzo del proprietario del biglietto
    event TicketRefunded(uint256 indexed ticketId, address indexed owner);

    /// @notice Evento emesso quando viene attivata la modalità di emergenza (Emergency Stop)
    /// @param message Messaggio di emergenza
    event EmergencyStopActivated(string message);

    /// @notice Evento emesso quando un biglietto viene verificato all'ingresso dell'evento
    /// @param ticketId ID del biglietto verificato
    /// @param verifier Indirizzo dell'utente che ha verificato il biglietto
    event TicketVerified(uint256 indexed ticketId, address verifier);

    /**
     * @notice Costruttore del contratto.
     * @dev Inizializza il nome e il simbolo dell'NFT e imposta il contatore dei biglietti a 1.
     */
    constructor() ERC721("TickeChain NFT", "TKT") {
        ticketCounter = 1;
    }

    /**
     * @notice Crea un nuovo biglietto NFT associato a un evento.
     * @dev La funzione è protetta dal modifier `whenNotPaused`, quindi non può essere eseguita se il contratto è in pausa.
     * @param _to Indirizzo del destinatario del biglietto.
     * @param _uri URI che rappresenta i metadati del biglietto.
     * @param _eventId ID dell'evento a cui è associato il biglietto.
     */
    function mintTicket(address _to, string memory _uri, uint256 _eventId) external whenNotPaused {
        // Verifica che l'indirizzo del destinatario sia valido
        require(_to != address(0), "Indirizzo destinatario non valido");

        // Verifica che l'URI non sia vuoto
        require(bytes(_uri).length > 0, "URI non valido");

        // Assegna un nuovo ID al biglietto
        uint256 ticketId = ticketCounter;
        ticketCounter++;

        // Controlla se il biglietto esiste già (caso improbabile, ma per sicurezza)
        if (_exists(ticketId)) {
            failedMintAttempts++;
            // Se ci sono troppi errori di minting, attiva l'Emergency Stop
            if (failedMintAttempts >= 5) {
                _pause();
                emit EmergencyStopActivated("Emergency Stop attivato! Troppi errori di minting.");
            }
            return;
        }

        // Minta il nuovo biglietto NFT e assegna l'URI
        _safeMint(_to, ticketId);
        _setTokenURI(ticketId, _uri);

        // Associa il biglietto all'evento
        ticketToEventId[ticketId] = _eventId;
        activeTickets[ticketId] = true;

        // Emette un evento per segnalare la creazione del biglietto
        emit TicketMinted(ticketId, _to, _uri, _eventId);
    }

    /**
     * @notice Rimborsa un biglietto e lo brucia.
     * @dev Solo il proprietario del biglietto può richiedere il rimborso.
     * @dev Il biglietto viene invalidato e rimosso dalla blockchain.
     * @param _ticketId ID del biglietto da rimborsare.
     */
    function refundTicket(uint256 _ticketId) external whenNotPaused {
        // Controlla che il chiamante sia il proprietario del biglietto
        require(ownerOf(_ticketId) == msg.sender, "Non sei il proprietario");

        // Controlla che il biglietto non sia già stato rimborsato
        require(!refundedTickets[_ticketId], "Biglietto gia' rimborsato");

        // Segna il biglietto come rimborsato e lo disattiva
        refundedTickets[_ticketId] = true;
        activeTickets[_ticketId] = false; 

        // Brucia il biglietto, rimuovendolo dalla blockchain
        _burn(_ticketId);

        // Emette un evento per segnalare il rimborso
        emit TicketRefunded(_ticketId, msg.sender);
    }

    /**
     * @notice Segna un biglietto come verificato.
     * @dev Un biglietto può essere verificato solo una volta.
     * @param _ticketId ID del biglietto da verificare.
     */
    function markTicketAsVerified(uint256 _ticketId) external whenNotPaused {
        // Controlla che il biglietto esista
        require(ownerOf(_ticketId) != address(0), "Il biglietto non esiste");

        // Controlla che il biglietto non sia già stato verificato
        require(!verifiedTickets[_ticketId], "Il biglietto e' gia' stato verificato!");

        // Segna il biglietto come verificato
        verifiedTickets[_ticketId] = true;

        // Emette un evento per segnalare la verifica del biglietto
        emit TicketVerified(_ticketId, msg.sender);
    }

    /**
     * @notice Controlla se un biglietto è stato verificato.
     * @param _ticketId ID del biglietto da controllare.
     * @return `true` se il biglietto è stato verificato, `false` altrimenti.
     */
    function isTicketVerified(uint256 _ticketId) external view returns (bool) {
        return verifiedTickets[_ticketId];
    }

    /**
     * @notice Restituisce il numero totale di biglietti NFT mintati.
     * @return Il numero totale di biglietti creati.
     */
    function getTotalMintedTickets() external view returns (uint256) {
        return ticketCounter - 1; 
    }

    /**
     * @notice Controlla se un biglietto è attivo (non rimborsato).
     * @param _ticketId ID del biglietto da controllare.
     * @return `true` se il biglietto è attivo, `false` altrimenti.
     */
    function isTicketActive(uint256 _ticketId) external view returns (bool) {
        return activeTickets[_ticketId];
    }

        /**
     * @notice Attiva la modalità di emergenza (Emergency Stop).
     * @dev Solo il proprietario del contratto può attivarla.
     * @dev Blocca tutte le funzioni protette dal modifier `whenNotPaused`.
     */
    function emergencyStop() external onlyOwner {
        _pause();  // Mette in pausa il contratto, impedendo l'esecuzione di alcune funzioni
    }

    /**
     * @notice Riprende le operazioni dopo un'emergenza.
     * @dev Solo il proprietario del contratto può riattivare le operazioni.
     * @dev Riabilita tutte le funzioni che erano bloccate da `whenNotPaused`.
     */
    function resumeOperations() external onlyOwner {
        _unpause();  // Riattiva il contratto, consentendo l'esecuzione delle funzioni bloccate
    }

    /**
     * @notice Mette in pausa il contratto manualmente.
     * @dev Solo il proprietario può sospendere le operazioni.
     */
    function pause() external onlyOwner {
        _pause();  // Sospende le operazioni del contratto
    }

    /**
     * @notice Riattiva il contratto dopo una pausa.
     * @dev Solo il proprietario può riabilitare le operazioni.
     */
    function unpause() external onlyOwner {
        _unpause();  // Riabilita le operazioni del contratto
    }

}
