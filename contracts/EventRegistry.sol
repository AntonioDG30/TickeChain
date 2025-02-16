// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Importazione di contratti OpenZeppelin per sicurezza e gestione degli accessi
import "@openzeppelin/contracts/security/Pausable.sol";  // Permette di sospendere il contratto in caso di emergenza
import "@openzeppelin/contracts/access/Ownable.sol";     // Definisce un proprietario con privilegi amministrativi

/**
 * @title EventRegistry
 * @dev Contratto che gestisce un registro decentralizzato di eventi.
 * @dev Supporta la registrazione, visualizzazione, ricerca e cancellazione di eventi.
 */
contract EventRegistry is Pausable, Ownable {

    /// @notice Struttura dati per memorizzare le informazioni di un evento
    struct Event {
        string name;         // Nome dell'evento
        string location;     // Luogo dell'evento
        uint256 date;        // Data dell'evento in formato timestamp UNIX
        address creator;     // Indirizzo del creatore dell'evento
    }

    /// @notice Array dinamico che memorizza tutti gli eventi registrati
    Event[] private events;

    /// @notice Evento emesso quando un nuovo evento viene registrato
    /// @param eventId Identificativo univoco dell'evento
    /// @param name Nome dell'evento
    /// @param creator Indirizzo del creatore dell'evento
    event EventRegistered(uint256 indexed eventId, string name, address indexed creator);

    /// @notice Evento emesso quando un evento viene aggiornato
    /// @param eventId Identificativo univoco dell'evento
    /// @param name Nuovo nome dell'evento
    event EventUpdated(uint256 indexed eventId, string name);

    /// @notice Evento emesso quando un evento viene eliminato
    /// @param eventId Identificativo univoco dell'evento eliminato
    event EventDeleted(uint256 indexed eventId);

    /**
     * @notice Registra un nuovo evento nella blockchain.
     * @dev La funzione è protetta dal modifier `whenNotPaused`, quindi non può essere eseguita se il contratto è in pausa.
     * @param _name Nome dell'evento.
     * @param _location Luogo dell'evento.
     * @param _date Data dell'evento in formato timestamp UNIX (deve essere futura).
     */
    function registerEvent(
        string memory _name,
        string memory _location,
        uint256 _date
    ) external whenNotPaused {
        // Verifica che la data dell'evento sia nel futuro
        require(_date > block.timestamp, "La data dell'evento deve essere nel futuro");

        // Controlla che il nome dell'evento non sia vuoto
        require(bytes(_name).length > 0, "Il nome dell'evento non puo' essere vuoto");

        // Controlla che la posizione dell'evento non sia vuota
        require(bytes(_location).length > 0, "La posizione dell'evento non puo' essere vuota");

        // Aggiunge il nuovo evento all'array degli eventi registrati
        events.push(Event({
            name: _name,
            location: _location,
            date: _date,
            creator: msg.sender // L'utente che chiama la funzione diventa il creatore dell'evento
        }));

        // Calcola l'ID dell'evento come l'indice dell'array
        uint256 eventId = events.length - 1;

        // Emette un evento sulla blockchain per segnalare la registrazione dell'evento
        emit EventRegistered(eventId, _name, msg.sender);
    }

    /**
     * @notice Restituisce l'elenco di tutti gli eventi registrati.
     * @dev La funzione è `view`, quindi non modifica lo stato della blockchain.
     * @return Array di eventi registrati.
     */
    function listEvents() external view returns (Event[] memory) {
        return events;
    }

    /**
     * @notice Trova tutti gli eventi creati da un particolare utente.
     * @dev La funzione effettua due cicli per raccogliere e restituire gli eventi creati dall'utente specificato.
     * @param _creator Indirizzo del creatore degli eventi da cercare.
     * @return Array di eventi creati dall'utente specificato.
     */
    function findEventsByCreator(address _creator) external view returns (Event[] memory) {
        uint256 count = 0;

        // Primo ciclo: conta quanti eventi sono stati creati dall'utente
        for (uint256 i = 0; i < events.length; i++) {
            if (events[i].creator == _creator) { 
                count++;
            }
        }

        // Crea un nuovo array della dimensione corretta per contenere gli eventi dell'utente
        Event[] memory creatorEvents = new Event[](count);
        uint256 index = 0;

        // Secondo ciclo: popola l'array con gli eventi dell'utente
        for (uint256 i = 0; i < events.length; i++) {
            if (events[i].creator == _creator) { 
                creatorEvents[index] = events[i];
                index++;
            }
        }

        return creatorEvents;
    }

    /**
     * @notice Elimina un evento esistente.
     * @dev Solo il creatore dell'evento o il proprietario del contratto può eliminarlo.
     * @dev L'evento eliminato viene sostituito con l'ultimo elemento dell'array per ottimizzare il gas.
     * @param _eventId Identificativo univoco dell'evento da eliminare.
     */
    function deleteEvent(uint256 _eventId) external whenNotPaused {
        // Controlla che l'evento esista
        require(_eventId < events.length, "Evento non esistente");

        // Recupera i dati dell'evento da eliminare
        Event memory eventToDelete = events[_eventId];

        // Controlla che solo il creatore o il proprietario possano eliminare l'evento
        require(
            msg.sender == eventToDelete.creator || msg.sender == owner(),
            "Non autorizzato a eliminare l'evento"
        );

        // Sostituisce l'evento da eliminare con l'ultimo elemento dell'array per risparmiare gas
        events[_eventId] = events[events.length - 1];

        // Rimuove l'ultimo elemento dell'array (che ora è un duplicato)
        events.pop();

        // Emette un evento sulla blockchain per segnalare la cancellazione
        emit EventDeleted(_eventId);
    }

    /**
     * @notice Mette in pausa il contratto manualmente.
     * @dev Solo il proprietario può sospendere le operazioni.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Riattiva il contratto dopo una pausa.
     * @dev Solo il proprietario può riabilitare le operazioni.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
