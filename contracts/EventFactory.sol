// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventFactory is Pausable, Ownable {

    enum EventState { CREATED, OPEN, CLOSED, CANCELLED }

    struct Event {
        string name;
        string location;
        uint256 date;
        uint256 price;
        uint256 ticketsAvailable;
        address creator;
        EventState state;
    }

    uint256 private eventIdCounter;
    mapping(uint256 => Event) public events;

    event EventCreated(uint256 indexed eventId, string name, address creator);
    event EventUpdated(uint256 indexed eventId, string name);
    event EventDeleted(uint256 indexed eventId);
    event EventStateChanged(uint256 indexed eventId, EventState newState);

    modifier onlyEventCreator(uint256 _eventId) {
        require(events[_eventId].creator == msg.sender, "Not the event creator");
        _;
    }

    function createEvent(
        string memory _name,
        string memory _location,
        uint256 _date,
        uint256 _price,
        uint256 _ticketsAvailable
    ) external whenNotPaused {
        require(_date > block.timestamp, "Event date must be in the future");
        require(_ticketsAvailable > 0, "Tickets must be greater than zero");

        uint256 eventId = eventIdCounter;
        events[eventId] = Event({
            name: _name,
            location: _location,
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

        require(eventToUpdate.state == EventState.CREATED, "Event must be in CREATED state");
        require(_date > block.timestamp, "Event date must be in the future");
        require(_ticketsAvailable > 0, "Tickets must be greater than zero");

        eventToUpdate.name = _name;
        eventToUpdate.location = _location;
        eventToUpdate.date = _date;
        eventToUpdate.price = _price;
        eventToUpdate.ticketsAvailable = _ticketsAvailable;

        emit EventUpdated(_eventId, _name);
    }

    function deleteEvent(uint256 _eventId) external onlyEventCreator(_eventId) whenNotPaused {
        Event storage eventToDelete = events[_eventId];

        require(eventToDelete.state == EventState.CREATED, "Event must be in CREATED state");

        delete events[_eventId];

        emit EventDeleted(_eventId);
    }

    function changeEventState(uint256 _eventId, EventState _newState) external onlyEventCreator(_eventId) whenNotPaused {
        Event storage eventToUpdate = events[_eventId];

        require(
            (_newState == EventState.OPEN && eventToUpdate.state == EventState.CREATED) ||
            (_newState == EventState.CLOSED && eventToUpdate.state == EventState.OPEN) ||
            (_newState == EventState.CANCELLED),
            "Invalid state transition"
        );

        eventToUpdate.state = _newState;
        emit EventStateChanged(_eventId, _newState);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
