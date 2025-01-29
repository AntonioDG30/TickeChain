// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Importiamo il contratto Pausable da OpenZeppelin per implementare funzionalità di sospensione del contratto
// Importiamo il contratto Ownable da OpenZeppelin per gestire la proprietà del contratto
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventFactory
 * @dev Contratto per la creazione e gestione di eventi con transizioni di stato.
 * Include funzionalità di sicurezza come la sospensione e la gestione della proprietà.
 * L'evento può passare tra vari stati come "CREATO", "APERTO", "CHIUSO" e "ANNULLATO".
 */
contract EventFactory is Pausable, Ownable {

    // Enum che rappresenta gli stati possibili di un evento
    enum EventState { CREATED, OPEN, CLOSED, CANCELLED }

    // Struttura per memorizzare i dettagli di un evento
    struct Event {
        string name;                // Nome dell'evento
        string location;            // Luogo dell'evento
        uint256 date;               // Data dell'evento (timestamp in secondi)
        uint256 price;              // Prezzo di un biglietto per l'evento
        uint256 ticketsAvailable;   // Numero di biglietti disponibili
        address creator;            // Indirizzo del creatore dell'evento
        EventState state;           // Stato attuale dell'evento (CREATO, APERTO, CHIUSO, ANNULLATO)
    }

    uint256 private eventIdCounter;          // Contatore per assegnare ID univoci agli eventi
    mapping(uint256 => Event) public events; // Mappatura che collega gli ID degli eventi ai dettagli dell'evento

    // Eventi per registrare le azioni di creazione, aggiornamento, eliminazione e cambio stato dell'evento
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
        _; // Continua l'esecuzione della funzione
    }

    /**
     * @dev Funzione che verifica se un evento è stato annullato.
     * @param eventId ID dell'evento da verificare.
     * @return bool Se l'evento è annullato, restituisce true, altrimenti false.
     */
    function isEventCancelled(uint256 eventId) external view returns (bool) {
        require(eventId < eventIdCounter, "Evento non esistente");
        return events[eventId].state == EventState.CANCELLED; // Verifica lo stato dell'evento
    }

    /**
     * @dev Funzione che verifica se un dato utente è il creatore di un evento.
     * @param user Indirizzo dell'utente da verificare.
     * @param eventId ID dell'evento.
     * @return bool Se l'utente è il creatore dell'evento, restituisce true, altrimenti false.
     */
    function isEventCreator(address user, uint256 eventId) external view returns (bool) {
        require(eventId < eventIdCounter, "Evento non esistente");
        return events[eventId].creator == user; // Confronta l'indirizzo dell'utente con quello del creatore dell'evento
    }

    /**
     * @dev Funzione che verifica se un evento è aperto (stato OPEN).
     * @param eventId ID dell'evento da verificare.
     * @return bool Se l'evento è aperto, restituisce true, altrimenti false.
     */
    function isEventOpen(uint256 eventId) external view returns (bool) {
        require(eventId < eventIdCounter, "Evento non esistente");
        return events[eventId].state == EventState.OPEN; // Verifica se l'evento è nello stato OPEN
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
    ) external whenNotPaused { // Solo quando il contratto non è in pausa
        require(_date > block.timestamp, "La data dell'evento deve essere nel futuro"); // Verifica che la data dell'evento sia nel futuro
        require(_ticketsAvailable > 0, "Il numero di biglietti deve essere maggiore di zero"); // Verifica che siano disponibili biglietti

        uint256 eventId = eventIdCounter; // Ottiene l'ID dell'evento corrente
        events[eventId] = Event({
            name: _name,
            location: _location,
            date: _date,
            price: _price,
            ticketsAvailable: _ticketsAvailable,
            creator: msg.sender, // L'indirizzo che crea l'evento è il creatore
            state: EventState.CREATED // Inizialmente lo stato dell'evento è "CREATO"
        });

        eventIdCounter++; // Incrementa il contatore degli eventi
        emit EventCreated(eventId, _name, msg.sender); // Emmette un evento che indica che l'evento è stato creato
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
    ) external onlyEventCreator(_eventId) whenNotPaused { // Solo il creatore dell'evento può aggiornarlo
        Event storage eventToUpdate = events[_eventId]; // Ottiene il riferimento all'evento da aggiornare

        require(eventToUpdate.state == EventState.CREATED, "L'evento deve essere nello stato CREATED"); // L'evento deve essere nello stato "CREATO"
        require(_date > block.timestamp, "La data dell'evento deve essere nel futuro"); // Verifica che la data sia nel futuro
        require(_ticketsAvailable > 0, "Il numero di biglietti deve essere maggiore di zero"); // Verifica che siano disponibili biglietti

        // Aggiorna i dettagli dell'evento
        eventToUpdate.name = _name;
        eventToUpdate.location = _location;
        eventToUpdate.date = _date;
        eventToUpdate.price = _price;
        eventToUpdate.ticketsAvailable = _ticketsAvailable;

        emit EventUpdated(_eventId, _name); // Emmette un evento che indica che l'evento è stato aggiornato
    }

    /**
     * @dev Elimina un evento esistente.
     * @param _eventId ID dell'evento da eliminare.
     */
    function deleteEvent(uint256 _eventId) external onlyEventCreator(_eventId) whenNotPaused { // Solo il creatore può eliminare l'evento
        Event storage eventToDelete = events[_eventId]; // Ottiene il riferimento all'evento da eliminare

        require(eventToDelete.state == EventState.CREATED, "L'evento deve essere nello stato CREATED"); // Verifica che l'evento sia nello stato "CREATO"

        delete events[_eventId]; // Elimina l'evento dalla mappatura

        emit EventDeleted(_eventId); // Emmette un evento che indica che l'evento è stato eliminato
    }

    /**
     * @dev Cambia lo stato di un evento esistente.
     * @param _eventId ID dell'evento da aggiornare.
     * @param _newState Nuovo stato per l'evento.
     */
    function changeEventState(uint256 _eventId, EventState _newState) external onlyEventCreator(_eventId) whenNotPaused { // Solo il creatore può cambiare lo stato
        Event storage eventToUpdate = events[_eventId]; // Ottiene il riferimento all'evento da aggiornare

        // Verifica che la transizione di stato sia valida
        require(
            (_newState == EventState.OPEN && eventToUpdate.state == EventState.CREATED) ||
            (_newState == EventState.CLOSED && eventToUpdate.state == EventState.OPEN) ||
            (_newState == EventState.CANCELLED),
            "Transizione di stato non valida"
        );

        eventToUpdate.state = _newState; // Imposta il nuovo stato per l'evento
        emit EventStateChanged(_eventId, _newState); // Emmette un evento che indica che lo stato dell'evento è cambiato
    }

    /**
     * @dev Sospende il contratto, disabilitando le funzioni che modificano lo stato.
     */
    function pause() external onlyOwner { // Solo il proprietario può sospendere il contratto
        _pause();
    }

    /**
     * @dev Riabilita il contratto, riattivando le funzioni che modificano lo stato.
     */
    function unpause() external onlyOwner { // Solo il proprietario può riabilitare il contratto
        _unpause();
    }
}
