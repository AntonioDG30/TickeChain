// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventRegistry is Pausable, Ownable {

    struct Event {
        string name;                
        string location;            
        uint256 date;              
        address creator;            
    }

    Event[] private events;

    event EventRegistered(uint256 indexed eventId, string name, address indexed creator);
    event EventUpdated(uint256 indexed eventId, string name);
    event EventDeleted(uint256 indexed eventId);

    function registerEvent(
        string memory _name,
        string memory _location,
        uint256 _date
    ) external whenNotPaused {
        require(_date > block.timestamp, "La data dell'evento deve essere nel futuro"); 
        require(bytes(_name).length > 0, "Il nome dell'evento non puo' essere vuoto"); 
        require(bytes(_location).length > 0, "La posizione dell'evento non puo' essere vuota");

        events.push(Event({
            name: _name,
            location: _location,
            date: _date,
            creator: msg.sender 
        }));

        uint256 eventId = events.length - 1; 
        emit EventRegistered(eventId, _name, msg.sender); 
    }

    function listEvents() external view returns (Event[] memory) {
        return events;
    }

    function findEventsByCreator(address _creator) external view returns (Event[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < events.length; i++) {
            if (events[i].creator == _creator) { 
                count++;
            }
        }

        Event[] memory creatorEvents = new Event[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < events.length; i++) {
            if (events[i].creator == _creator) { 
                creatorEvents[index] = events[i];
                index++;
            }
        }

        return creatorEvents; 
    }

    function deleteEvent(uint256 _eventId) external whenNotPaused {
        require(_eventId < events.length, "Evento non esistente"); 
        Event memory eventToDelete = events[_eventId]; 

        require(
            msg.sender == eventToDelete.creator || msg.sender == owner(),
            "Non autorizzato a eliminare l'evento"
        );

        events[_eventId] = events[events.length - 1];
        events.pop(); 

        emit EventDeleted(_eventId); 
    }

    function pause() external onlyOwner {
        _pause(); 
    }

    function unpause() external onlyOwner {
        _unpause();
}
