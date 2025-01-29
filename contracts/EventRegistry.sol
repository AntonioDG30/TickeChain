// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Importiamo il contratto Pausable da OpenZeppelin per implementare funzionalità di sospensione del contratto
// Importiamo il contratto Ownable da OpenZeppelin per gestire la proprietà del contratto
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventRegistry
 * @dev Contratto per registrare e catalogare eventi creati da organizzatori.
 * Permette di elencare e filtrare eventi, garantendo accesso sicuro e meccanismi di emergenza.
 */
contract EventRegistry is Pausable, Ownable {

    // Struttura che rappresenta un evento, memorizzando i dettagli come nome, location, data, e creatore
    struct Event {
        string name;                // Nome dell'evento
        string location;            // Luogo dell'evento
        uint256 date;               // Data dell'evento (timestamp)
        address creator;            // Indirizzo del creatore dell'evento
    }

    // Array per memorizzare tutti gli eventi registrati
    Event[] private events;

    // Eventi per registrare le azioni principali (creazione, aggiornamento, eliminazione degli eventi)
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
        require(_date > block.timestamp, "La data dell'evento deve essere nel futuro"); // Verifica che la data sia nel futuro
        require(bytes(_name).length > 0, "Il nome dell'evento non puo' essere vuoto"); // Verifica che il nome dell'evento non sia vuoto
        require(bytes(_location).length > 0, "La posizione dell'evento non puo' essere vuota"); // Verifica che la location non sia vuota

        // Aggiungi il nuovo evento all'array degli eventi
        events.push(Event({
            name: _name,
            location: _location,
            date: _date,
            creator: msg.sender // Il creatore dell'evento è l'indirizzo che invia la transazione
        }));

        uint256 eventId = events.length - 1; // L'ID dell'evento è l'indice dell'array
        emit EventRegistered(eventId, _name, msg.sender); // Emmette l'evento che indica che l'evento è stato registrato
    }

    /**
     * @dev Elenca tutti gli eventi registrati.
     * @return Lista di tutti gli eventi.
     */
    function listEvents() external view returns (Event[] memory) {
        return events; // Restituisce l'array di eventi
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
            if (events[i].creator == _creator) { // Se l'evento è stato creato dall'utente specificato
                count++;
            }
        }

        // Crea un array per contenere solo gli eventi creati da _creator
        Event[] memory creatorEvents = new Event[](count);
        uint256 index = 0;

        // Aggiungi gli eventi creati dal creatore all'array creatorEvents
        for (uint256 i = 0; i < events.length; i++) {
            if (events[i].creator == _creator) { // Se l'evento è stato creato dall'utente specificato
                creatorEvents[index] = events[i];
                index++;
            }
        }

        return creatorEvents; // Restituisce gli eventi del creatore
    }

    /**
     * @dev Elimina un evento dal registro.
     * Solo il creatore dell'evento o il proprietario del contratto possono farlo.
     * @param _eventId ID dell'evento da eliminare.
     */
    function deleteEvent(uint256 _eventId) external whenNotPaused {
        require(_eventId < events.length, "Evento non esistente"); // Verifica che l'ID dell'evento sia valido
        Event memory eventToDelete = events[_eventId]; // Ottieni i dettagli dell'evento da eliminare

        // Verifica che solo il creatore dell'evento o il proprietario possano eliminarlo
        require(
            msg.sender == eventToDelete.creator || msg.sender == owner(),
            "Non autorizzato a eliminare l'evento"
        );

        // Elimina l'evento sostituendolo con l'ultimo elemento e riducendo la lunghezza dell'array
        events[_eventId] = events[events.length - 1];
        events.pop(); // Rimuove l'ultimo elemento dell'array (l'evento eliminato)

        emit EventDeleted(_eventId); // Emmette un evento che indica che l'evento è stato eliminato
    }

    /**
     * @dev Sospende il contratto, disabilitando le funzioni di modifica dello stato.
     */
    function pause() external onlyOwner {
        _pause(); // Chiamata alla funzione _pause() di Pausable che sospende il contratto
    }

    /**
     * @dev Riabilita il contratto, permettendo di nuovo le funzioni di modifica dello stato.
     */
    function unpause() external onlyOwner {
        _unpause(); // Chiamata alla funzione _unpause() di Pausable che riabilita il contratto
    }
}
