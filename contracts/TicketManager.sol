// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketManager is ERC721URIStorage, Pausable, Ownable {
    uint256 private ticketCounter;  
    uint256 private failedMintAttempts = 0; 

    mapping(uint256 => uint256) public ticketToEventId;
    mapping(uint256 => bool) public refundedTickets;
    mapping(uint256 => bool) public activeTickets;
    mapping(uint256 => bool) public verifiedTickets; 


    event TicketMinted(uint256 indexed ticketId, address indexed owner, string uri, uint256 eventId);
    event TicketRefunded(uint256 indexed ticketId, address indexed owner);
    event EmergencyStopActivated(string message);
    event TicketVerified(uint256 indexed ticketId, address verifier);


    constructor() ERC721("TickeChain NFT", "TKT") {
        ticketCounter = 1;
    }

    function mintTicket(address _to, string memory _uri, uint256 _eventId) external whenNotPaused {
        require(_to != address(0), "Indirizzo destinatario non valido");
        require(bytes(_uri).length > 0, "URI non valido");

        uint256 ticketId = ticketCounter;
        ticketCounter++;

        if (_exists(ticketId)) {
            failedMintAttempts++;
            if (failedMintAttempts >= 5) {
                _pause();
                emit EmergencyStopActivated("Emergency Stop attivato! Troppi errori di minting.");
            }
            return;
        }

        _safeMint(_to, ticketId);
        _setTokenURI(ticketId, _uri);
        ticketToEventId[ticketId] = _eventId;
        activeTickets[ticketId] = true;

        emit TicketMinted(ticketId, _to, _uri, _eventId);
    }

    function refundTicket(uint256 _ticketId) external whenNotPaused {
        require(ownerOf(_ticketId) == msg.sender, "Non sei il proprietario");
        require(!refundedTickets[_ticketId], "Biglietto gia' rimborsato");

        refundedTickets[_ticketId] = true;
        activeTickets[_ticketId] = false; 
        _burn(_ticketId);

        emit TicketRefunded(_ticketId, msg.sender);
    }

    function markTicketAsVerified(uint256 _ticketId) external whenNotPaused {
        require(ownerOf(_ticketId) != address(0), "Il biglietto non esiste");
        require(!verifiedTickets[_ticketId], "Il biglietto e' gia' stato verificato!");

        verifiedTickets[_ticketId] = true;
        emit TicketVerified(_ticketId, msg.sender);
    }

    function isTicketVerified(uint256 _ticketId) external view returns (bool) {
        return verifiedTickets[_ticketId];
    }

    function getTotalMintedTickets() external view returns (uint256) {
        return ticketCounter - 1; 
    }

    function isTicketActive(uint256 _ticketId) external view returns (bool) {
        return activeTickets[_ticketId];
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
