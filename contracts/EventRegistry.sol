// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventRegistry
 * @dev Contratto per registrare e catalogare eventi creati da organizzatori.
 * Permette di elencare e filtrare eventi, garantendo accesso sicuro e meccanismi di emergenza.
 */
contract EventRegistry is Pausable, Ownable {

    struct Event {
        string name;                // Nome dell'evento
        string location;           // Luogo dell'evento
        uint256 date;              // Data dell'evento (timestamp)
        address creator;           // Indirizzo del creatore dell'evento
    }

    // Array per memorizzare tutti gli eventi
    Event[] private events;

    // Eventi per registrare le azioni principali
    event EventRegistered(uint256 indexed eventId, string name, address indexed creator);
    event EventUpdated(uint256 indexed eventId, string name);
    event EventDeleted(uint256 indexed eventId);

    /**
     * @dev Registra un nuovo evento nel registro.
     * @param _name Nome dell'evento.
     * @param _location Luogo dell'evento.
     * @param _date Data dell'evento (timestamp).
     */
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

    /**
     * @dev Elenca tutti gli eventi registrati.
     * @return Lista di tutti gli eventi.
     */
    function listEvents() external view returns (Event[] memory) {
        return events;
    }

    /**
     * @dev Trova eventi creati da un determinato utente.
     * @param _creator Indirizzo del creatore.
     * @return Lista di eventi creati da quell'utente.
     */
    function findEventsByCreator(address _creator) external view returns (Event[] memory) {
        uint256 count = 0;

        // Conta il numero di eventi creati dal creatore specificato
        for (uint256 i = 0; i < events.length; i++) {
            if (events[i].creator == _creator) {
                count++;
            }
        }

        // Crea un array per contenere gli eventi del creatore
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

    /**
     * @dev Elimina un evento dal registro.
     * Solo il creatore dell'evento o il proprietario possono farlo.
     * @param _eventId ID dell'evento da eliminare.
     */
    function deleteEvent(uint256 _eventId) external whenNotPaused {
        require(_eventId < events.length, "Evento non esistente");
        Event memory eventToDelete = events[_eventId];

        require(
            msg.sender == eventToDelete.creator || msg.sender == owner(),
            "Non autorizzato a eliminare l'evento"
        );

        // Elimina l'evento sostituendolo con l'ultimo elemento e riducendo la lunghezza dell'array
        events[_eventId] = events[events.length - 1];
        events.pop();

        emit EventDeleted(_eventId);
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
