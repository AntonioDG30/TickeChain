// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Importiamo il contratto ERC721URIStorage da OpenZeppelin per utilizzare lo standard ERC-721 con supporto per URI (metadati) dei token
// Importiamo Pausable per la possibilità di sospendere il contratto in situazioni di emergenza
// Importiamo Ownable per gestire la proprietà del contratto (ad esempio, per sospendere o riabilitare il contratto)
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Importiamo il contratto EventFactory per interagire con gli eventi creati
import "./EventFactory.sol";

/**
 * @title TicketManager
 * @dev Gestisce i biglietti NFT utilizzando lo standard ERC-721. Include funzioni per emissione,
 * trasferimento, verifica e rimborso dei biglietti.
 */
contract TicketManager is ERC721URIStorage, Pausable, Ownable {

    // Variabile per tenere traccia dell'ID univoco per i biglietti
    uint256 private ticketIdCounter; 

    // Riferimento al contratto EventFactory per interagire con gli eventi
    EventFactory public eventFactory;

    // Mappatura per tenere traccia dei biglietti rimborsati
    mapping(uint256 => bool) public refundedTickets;

    // Eventi per registrare le azioni principali: creazione, trasferimento, validazione e rimborso dei biglietti
    event TicketMinted(uint256 indexed ticketId, address indexed owner, string uri);
    event TicketTransferred(uint256 indexed ticketId, address indexed from, address indexed to);
    event TicketValidated(uint256 indexed ticketId);
    event TicketRefunded(uint256 indexed ticketId, address indexed owner);

    /**
     * @dev Costruttore del contratto.
     * @param _name Nome del token ERC-721 (es. "TickeChain NFT").
     * @param _symbol Simbolo del token ERC-721 (es. "TCK").
     * @param _eventFactory Indirizzo del contratto EventFactory per gestire gli eventi.
     */
    constructor(string memory _name, string memory _symbol, address _eventFactory) ERC721(_name, _symbol) {
        eventFactory = EventFactory(_eventFactory); // Inizializza il contratto EventFactory per interagire con gli eventi
    }

    /**
     * @dev Emette un nuovo biglietto NFT.
     * @param _to Indirizzo del destinatario del biglietto.
     * @param _uri URI con i metadati del biglietto (tipicamente link a JSON con i dettagli del biglietto).
     * @param eventId ID dell'evento per cui viene emesso il biglietto.
     */
    function mintTicket(address _to, string memory _uri, uint256 eventId) external whenNotPaused {
        // Verifica che l'evento sia ancora disponibile per l'acquisto
        require(eventFactory.isEventOpen(eventId), "L'evento non e' piu disponibile per l'acquisto");
        
        // Incrementa il contatore per ottenere un nuovo ID per il biglietto
        uint256 ticketId = ticketIdCounter;

        // Emissione del biglietto NFT (utilizzando la funzione _safeMint di ERC721)
        _safeMint(_to, ticketId);

        // Impostiamo il token URI, che punta ai metadati del biglietto
        _setTokenURI(ticketId, _uri);

        // Incrementa l'ID del biglietto per il prossimo ticket
        ticketIdCounter++;

        // Emmette l'evento TicketMinted per tracciare l'emissione del biglietto
        emit TicketMinted(ticketId, _to, _uri);
    }

    /**
     * @dev Trasferisce un biglietto NFT a un altro indirizzo.
     * @param _from Indirizzo del mittente (proprietario del biglietto).
     * @param _to Indirizzo del destinatario del biglietto.
     * @param _ticketId ID del biglietto da trasferire.
     */
    function transferTicket(address _from, address _to, uint256 _ticketId) external whenNotPaused {
        // Verifica che il mittente possieda il biglietto da trasferire
        require(ownerOf(_ticketId) == _from, "Il mittente non possiede il biglietto");

        // Verifica che il chiamante sia autorizzato a trasferire il biglietto
        require(msg.sender == _from || isApprovedForAll(_from, msg.sender) || getApproved(_ticketId) == msg.sender, "Non autorizzato");

        // Esegui il trasferimento del biglietto
        _transfer(_from, _to, _ticketId);

        // Emmette l'evento TicketTransferred per tracciare il trasferimento del biglietto
        emit TicketTransferred(_ticketId, _from, _to);
    }

    /**
     * @dev Valida un biglietto NFT. Solo il proprietario può farlo.
     * @param _ticketId ID del biglietto da validare.
     */
    function validateTicket(uint256 _ticketId) external whenNotPaused {
        // Verifica che il chiamante sia il proprietario del biglietto
        require(ownerOf(_ticketId) == msg.sender, "Solo il proprietario puo' validare il biglietto");

        // Emmette l'evento TicketValidated per tracciare che il biglietto è stato validato
        emit TicketValidated(_ticketId);
    }

    /**
     * @dev Rimborsa un biglietto NFT e lo rende inutilizzabile.
     * @param _ticketId ID del biglietto da rimborsare.
     */
    function refundTicket(uint256 _ticketId) external whenNotPaused {
        // Verifica che il chiamante sia il proprietario del biglietto
        require(ownerOf(_ticketId) == msg.sender, "Solo il proprietario puo' rimborsare il biglietto");

        // Verifica che il biglietto non sia già stato rimborsato
        require(!refundedTickets[_ticketId], "Il biglietto e' gia' stato rimborsato");

        // Segna il biglietto come rimborsato
        refundedTickets[_ticketId] = true;

        // Brucia il biglietto (lo rende inutilizzabile)
        _burn(_ticketId);

        // Emmette l'evento TicketRefunded per tracciare che il biglietto è stato rimborsato
        emit TicketRefunded(_ticketId, msg.sender);
    }

    /**
     * @dev Sospende il contratto, disabilitando le funzioni di modifica dello stato.
     */
    function pause() external onlyOwner {
        _pause(); // Chiama la funzione _pause() ereditata dal contratto Pausable per sospendere il contratto
    }

    /**
     * @dev Riabilita il contratto, permettendo di nuovo le funzioni di modifica dello stato.
     */
    function unpause() external onlyOwner {
        _unpause(); // Chiama la funzione _unpause() ereditata dal contratto Pausable per riabilitare il contratto
    }
}
