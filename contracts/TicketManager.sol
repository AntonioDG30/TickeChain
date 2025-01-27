// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TicketManager
 * @dev Gestisce i biglietti NFT utilizzando lo standard ERC-721. Include funzioni per emissione,
 * trasferimento, verifica e rimborso dei biglietti.
 */
contract TicketManager is ERC721URIStorage, Pausable, Ownable {
    
    uint256 private ticketIdCounter; // Contatore per assegnare ID univoci ai biglietti

    // Mapping per tenere traccia dei rimborsi
    mapping(uint256 => bool) public refundedTickets;

    // Eventi per registrare le azioni principali
    event TicketMinted(uint256 indexed ticketId, address indexed owner, string uri);
    event TicketTransferred(uint256 indexed ticketId, address indexed from, address indexed to);
    event TicketValidated(uint256 indexed ticketId);
    event TicketRefunded(uint256 indexed ticketId, address indexed owner);

    /**
     * @dev Costruttore del contratto.
     * @param _name Nome del token ERC-721.
     * @param _symbol Simbolo del token ERC-721.
     */
    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    /**
     * @dev Emette un nuovo biglietto NFT.
     * @param _to Indirizzo del destinatario del biglietto.
     * @param _uri URI con i metadati del biglietto.
     */
    function mintTicket(address _to, string memory _uri) external onlyOwner whenNotPaused {
        uint256 ticketId = ticketIdCounter;
        _safeMint(_to, ticketId);
        _setTokenURI(ticketId, _uri);
        ticketIdCounter++;

        emit TicketMinted(ticketId, _to, _uri);
    }

    /**
     * @dev Trasferisce un biglietto NFT a un altro indirizzo.
     * @param _from Indirizzo del mittente.
     * @param _to Indirizzo del destinatario.
     * @param _ticketId ID del biglietto da trasferire.
     */
    function transferTicket(address _from, address _to, uint256 _ticketId) external whenNotPaused {
        require(ownerOf(_ticketId) == _from, "Il mittente non possiede il biglietto");
        require(msg.sender == _from || isApprovedForAll(_from, msg.sender) || getApproved(_ticketId) == msg.sender, "Non autorizzato");

        _transfer(_from, _to, _ticketId);
        emit TicketTransferred(_ticketId, _from, _to);
    }

    /**
     * @dev Valida un biglietto NFT. Solo il proprietario puo' farlo.
     * @param _ticketId ID del biglietto da validare.
     */
    function validateTicket(uint256 _ticketId) external whenNotPaused {
        require(ownerOf(_ticketId) == msg.sender, "Solo il proprietario puo' validare il biglietto");
        emit TicketValidated(_ticketId);
    }

    /**
     * @dev Rimborsa un biglietto NFT e lo rende inutilizzabile.
     * @param _ticketId ID del biglietto da rimborsare.
     */
    function refundTicket(uint256 _ticketId) external whenNotPaused {
        require(ownerOf(_ticketId) == msg.sender, "Solo il proprietario puo' rimborsare il biglietto");
        require(!refundedTickets[_ticketId], "Il biglietto e' gia' stato rimborsato");

        refundedTickets[_ticketId] = true;
        _burn(_ticketId);

        emit TicketRefunded(_ticketId, msg.sender);
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