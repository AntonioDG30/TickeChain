// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract EventFactory is Pausable, Ownable {

    enum EventState { CREATED, OPEN, CLOSED, CANCELLED }

    struct Event {
        string name;
        string location;
        string description;  
        uint256 date;
        uint256 price;
        uint256 ticketsAvailable;
        address creator;
        EventState state;
    }


    uint256 private eventIdCounter;          
    uint256 private cancelledEvents = 0;
    uint256 private lastResetTime = block.timestamp;
    mapping(uint256 => Event) public events;

    event EventCreated(uint256 indexed eventId, string name, address creator);
    event EventUpdated(uint256 indexed eventId, string name);
    event EventDeleted(uint256 indexed eventId);
    event EventStateChanged(uint256 indexed eventId, EventState newState);
    event EmergencyStopActivated(string message);


    modifier onlyEventCreator(uint256 _eventId) {
        require(events[_eventId].creator == msg.sender, "Non sei il creatore dell'evento");
        _; 
    }

    
    function isEventCancelled(uint256 eventId) external view returns (bool) {
        require(eventId < eventIdCounter, "Evento non esistente");
        return events[eventId].state == EventState.CANCELLED;  
    }

    function isEventCreator(address user, uint256 eventId) external view returns (bool) {
        require(eventId < eventIdCounter, "Evento non esistente");
        return events[eventId].creator == user;
    }

    function isEventOpen(uint256 eventId) external view returns (bool) {
        require(eventId < eventIdCounter, "Evento non esistente");
        return events[eventId].state == EventState.OPEN;
    }

    function createEvent(
        string memory _name,
        string memory _location,
        string memory _description,
        uint256 _date,
        uint256 _price,
        uint256 _ticketsAvailable
    ) external whenNotPaused {
        require(_date > block.timestamp, "La data dell'evento deve essere nel futuro");
        require(_ticketsAvailable > 0, "Il numero di biglietti deve essere maggiore di zero");

        uint256 eventId = eventIdCounter;
        events[eventId] = Event({
            name: _name,
            location: _location,
            description: _description,
            date: _date,
            price: _price,
            ticketsAvailable: _ticketsAvailable,
            creator: msg.sender,
            state: EventState.CREATED
        });

        eventIdCounter++;
        emit EventCreated(eventId, _name, msg.sender);
    }

    function updateEvent(
        uint256 _eventId,
        string memory _name,
        string memory _location,
        uint256 _date,
        uint256 _price,
        uint256 _ticketsAvailable
    ) external onlyEventCreator(_eventId) whenNotPaused { 
        Event storage eventToUpdate = events[_eventId];

        require(eventToUpdate.state == EventState.CREATED, "L'evento deve essere nello stato CREATED"); 
        require(_date > block.timestamp, "La data dell'evento deve essere nel futuro"); 
        require(_ticketsAvailable > 0, "Il numero di biglietti deve essere maggiore di zero");

        eventToUpdate.name = _name;
        eventToUpdate.location = _location;
        eventToUpdate.date = _date;
        eventToUpdate.price = _price;
        eventToUpdate.ticketsAvailable = _ticketsAvailable;

        emit EventUpdated(_eventId, _name); 
    }

    function deleteEvent(uint256 _eventId) external onlyEventCreator(_eventId) whenNotPaused { 
        Event storage eventToDelete = events[_eventId]; 

        require(eventToDelete.state == EventState.CREATED, "L'evento deve essere nello stato CREATED"); 

        delete events[_eventId]; 

        emit EventDeleted(_eventId);
    }

    function changeEventState(uint256 _eventId, EventState _newState) external onlyEventCreator(_eventId) whenNotPaused { 
        Event storage eventToUpdate = events[_eventId]; 

        require(
            (_newState == EventState.OPEN && eventToUpdate.state == EventState.CREATED) ||
            (_newState == EventState.CLOSED && eventToUpdate.state == EventState.OPEN) ||
            (_newState == EventState.CANCELLED),
            "Transizione di stato non valida"
        );

        eventToUpdate.state = _newState; 
        emit EventStateChanged(_eventId, _newState); 
    }

    function decreaseTicketCount(uint256 eventId) external {
        require(events[eventId].state == EventState.OPEN, "L'evento non e' aperto per l'acquisto");
        require(events[eventId].ticketsAvailable > 0, "Biglietti esauriti");

        events[eventId].ticketsAvailable -= 1;
    }

    function cancelEvent(uint256 _eventId) external whenNotPaused {
        require(events[_eventId].creator == msg.sender, "Solo il creatore puo' annullare l'evento");
        require(events[_eventId].state != EventState.CANCELLED, "L'evento e' gia' annullato");

        events[_eventId].state = EventState.CANCELLED;

        if (block.timestamp - lastResetTime > 1 hours) {
            cancelledEvents = 0;
            lastResetTime = block.timestamp;
        }

        cancelledEvents++;

        if (cancelledEvents >= 3) {
            _pause();
            emit EmergencyStopActivated("Emergency Stop attivato! Troppi eventi annullati.");
        }
        
        emit EventStateChanged(_eventId, EventState.CANCELLED);
    }

    function getEventDetails(uint256 _eventId) external view returns (string memory, string memory, uint256, uint256, address, EventState) {
        require(_eventId < eventIdCounter, "Evento non esistente");
        Event storage eventInfo = events[_eventId];

        return (
            eventInfo.name,
            eventInfo.location,
            eventInfo.date,
            eventInfo.price,
            eventInfo.creator,
            eventInfo.state
        );
    }

    function getTotalEvents() external view returns (uint256) {
        return eventIdCounter;
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
