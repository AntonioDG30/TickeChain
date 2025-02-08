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

    uint256 private ticketIdCounter;
    mapping(uint256 => uint256) public ticketToEventId;
    mapping(uint256 => bool) public refundedTickets;


    // Eventi per registrare le azioni principali: creazione, trasferimento, validazione e rimborso dei biglietti
    event TicketMinted(uint256 indexed ticketId, address indexed owner, string uri, uint256 eventId);
    event TicketTransferred(uint256 indexed ticketId, address indexed from, address indexed to);
    event TicketValidated(uint256 indexed ticketId);
    event TicketRefunded(uint256 indexed ticketId, address indexed owner);
    
    constructor() ERC721("TickeChain NFT", "TKT") {}

    function mintTicket(address _to, string memory _uri, uint256 eventId) external whenNotPaused {
        uint256 ticketId = ticketIdCounter;
        _safeMint(_to, ticketId);
        _setTokenURI(ticketId, _uri);
        ticketToEventId[ticketId] = eventId;
        ticketIdCounter++;

        emit TicketMinted(ticketId, _to, _uri, eventId);
    }

    function refundTicket(uint256 _ticketId) external whenNotPaused {
        require(ownerOf(_ticketId) == msg.sender, "Solo il proprietario puo' rimborsare il biglietto");
        require(!refundedTickets[_ticketId], "Il biglietto e' gia' stato rimborsato");

        refundedTickets[_ticketId] = true;
        _burn(_ticketId);

        emit TicketRefunded(_ticketId, msg.sender);
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
