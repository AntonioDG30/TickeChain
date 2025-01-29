// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventFactory
 * @dev Contratto per la creazione e gestione di eventi con transizioni di stato.
 * Include funzionalità di sicurezza come la sospensione e la gestione della proprietà.
 */
contract EventFactory is Pausable, Ownable {

    // Enum che rappresenta gli stati possibili di un evento
    enum EventState { CREATED, OPEN, CLOSED, CANCELLED }

    // Struttura per memorizzare i dettagli di un evento
    struct Event {
        string name;                // Nome dell'evento
        string location;           // Luogo dell'evento
        uint256 date;              // Data dell'evento (timestamp)
        uint256 price;             // Prezzo di un biglietto
        uint256 ticketsAvailable;  // Numero di biglietti disponibili
        address creator;           // Indirizzo del creatore dell'evento
        EventState state;          // Stato attuale dell'evento
    }

    uint256 private eventIdCounter;          // Contatore per assegnare ID univoci agli eventi
    mapping(uint256 => Event) public events; // Mappatura degli ID degli eventi ai dettagli degli eventi

    // Eventi per registrare le azioni
    event EventCreated(uint256 indexed eventId, string name, address creator);
    event EventUpdated(uint256 indexed eventId, string name);
    event EventDeleted(uint256 indexed eventId);
    event EventStateChanged(uint256 indexed eventId, EventState newState);

    /**
     * @dev Modificatore per garantire che solo il creatore dell'evento possa eseguire determinate azioni.
     * @param _eventId ID dell'evento per verificare la proprietà.
     */
    modifier onlyEventCreator(uint256 _eventId) {
        require(events[_eventId].creator == msg.sender, "Non sei il creatore dell'evento");
        _;
    }

    // Funzione per verificare se un evento è annullato
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


    /**
     * @dev Crea un nuovo evento con i dettagli specificati.
     * @param _name Nome dell'evento.
     * @param _location Luogo dell'evento.
     * @param _date Data dell'evento (timestamp).
     * @param _price Prezzo di un biglietto.
     * @param _ticketsAvailable Numero di biglietti disponibili.
     */
    function createEvent(
        string memory _name,
        string memory _location,
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
            date: _date,
            price: _price,
            ticketsAvailable: _ticketsAvailable,
            creator: msg.sender,
            state: EventState.CREATED
        });

        eventIdCounter++;
        emit EventCreated(eventId, _name, msg.sender);
    }

    /**
     * @dev Aggiorna i dettagli di un evento esistente.
     * @param _eventId ID dell'evento da aggiornare.
     * @param _name Nuovo nome dell'evento.
     * @param _location Nuovo luogo dell'evento.
     * @param _date Nuova data dell'evento (timestamp).
     * @param _price Nuovo prezzo di un biglietto.
     * @param _ticketsAvailable Nuovo numero di biglietti disponibili.
     */
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

    /**
     * @dev Elimina un evento esistente.
     * @param _eventId ID dell'evento da eliminare.
     */
    function deleteEvent(uint256 _eventId) external onlyEventCreator(_eventId) whenNotPaused {
        Event storage eventToDelete = events[_eventId];

        require(eventToDelete.state == EventState.CREATED, "L'evento deve essere nello stato CREATED");

        delete events[_eventId];

        emit EventDeleted(_eventId);
    }

    /**
     * @dev Cambia lo stato di un evento esistente.
     * @param _eventId ID dell'evento da aggiornare.
     * @param _newState Nuovo stato per l'evento.
     */
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

    /**
     * @dev Sospende il contratto, disabilitando le funzioni che modificano lo stato.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Riabilita il contratto, riattivando le funzioni che modificano lo stato.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
