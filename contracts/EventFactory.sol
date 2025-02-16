// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28; 

// Importazione di contratti OpenZeppelin per sicurezza e gestione degli accessi
import "@openzeppelin/contracts/security/Pausable.sol";  // Fornisce la funzionalità di pausa al contratto
import "@openzeppelin/contracts/access/Ownable.sol";     // Consente di designare un proprietario con privilegi speciali

/**
 * @title EventFactory
 * @dev Contratto per la creazione e gestione di eventi sulla blockchain
 * @dev Supporta la gestione dello stato degli eventi, la pausa del contratto e un meccanismo di emergenza
 */
contract EventFactory is Pausable, Ownable {

    /// @notice Enumerazione per rappresentare gli stati possibili di un evento
    enum EventState { CREATED, OPEN, CLOSED, CANCELLED }

    /// @notice Struttura dati per memorizzare le informazioni di un evento
    struct Event {
        string name;              // Nome dell'evento
        string location;          // Luogo in cui si svolgerà l'evento
        string description;       // Descrizione dell'evento
        uint256 date;             // Data dell'evento (timestamp UNIX)
        uint256 price;            // Prezzo del biglietto in token ERC-20
        uint256 ticketsAvailable; // Numero totale di biglietti disponibili
        address creator;          // Indirizzo dell'organizzatore dell'evento
        EventState state;         // Stato corrente dell'evento
    }

    uint256 private eventIdCounter;          // Contatore per assegnare ID univoci agli eventi
    uint256 private cancelledEvents = 0;     // Numero di eventi annullati (utile per il Circuit Breaker)
    uint256 private lastResetTime = block.timestamp; // Timestamp dell'ultimo reset del contatore di annullamenti

    /// @notice Mappatura degli eventi, associando un eventId alla relativa struttura Event
    mapping(uint256 => Event) public events;

    /// @notice Evento emesso alla creazione di un nuovo evento
    /// @param eventId Identificativo univoco dell'evento
    /// @param name Nome dell'evento
    /// @param creator Indirizzo dell'organizzatore
    event EventCreated(uint256 indexed eventId, string name, address creator);

    /// @notice Evento emesso quando un evento viene aggiornato
    /// @param eventId Identificativo dell'evento aggiornato
    /// @param name Nuovo nome dell'evento
    event EventUpdated(uint256 indexed eventId, string name);

    /// @notice Evento emesso quando un evento viene eliminato
    /// @param eventId Identificativo dell'evento eliminato
    event EventDeleted(uint256 indexed eventId);

    /// @notice Evento emesso quando cambia lo stato di un evento
    /// @param eventId Identificativo dell'evento modificato
    /// @param newState Nuovo stato dell'evento
    event EventStateChanged(uint256 indexed eventId, EventState newState);

    /// @notice Evento emesso quando viene attivata la modalità di emergenza (Circuit Breaker)
    /// @param message Messaggio di emergenza
    event EmergencyStopActivated(string message);

    /**
     * @dev Modificatore che permette l'accesso solo al creatore di un evento specifico.
     * @param _eventId Identificativo dell'evento da verificare.
     */
    modifier onlyEventCreator(uint256 _eventId) {
        require(events[_eventId].creator == msg.sender, "Non sei il creatore dell'evento");
        _;  // Continua con l'esecuzione della funzione che utilizza questo modifier
    }

    /**
     * @notice Controlla se un evento è stato annullato.
     * @dev La funzione è `external` e `view`, quindi non modifica lo stato della blockchain.
     * @param eventId Identificativo univoco dell'evento.
     * @return `true` se l'evento è stato annullato, `false` altrimenti.
     */
    function isEventCancelled(uint256 eventId) external view returns (bool) {
        require(eventId < eventIdCounter, "Evento non esistente"); // Verifica che l'evento esista
        return events[eventId].state == EventState.CANCELLED;  // Controlla lo stato dell'evento
    }

    /**
     * @notice Controlla se un utente è il creatore di un determinato evento.
     * @dev La funzione è `external` e `view`, quindi non modifica lo stato della blockchain.
     * @param user Indirizzo dell'utente da verificare.
     * @param eventId Identificativo univoco dell'evento.
     * @return `true` se l'utente è il creatore dell'evento, `false` altrimenti.
     */
    function isEventCreator(address user, uint256 eventId) external view returns (bool) {
        require(eventId < eventIdCounter, "Evento non esistente"); // Verifica che l'evento esista
        return events[eventId].creator == user; // Confronta l'utente con il creatore registrato
    }

    /**
     * @notice Verifica se un evento è nello stato "OPEN" (quindi con biglietti disponibili per l'acquisto).
     * @dev La funzione è `external` e `view`, quindi non modifica lo stato della blockchain.
     * @param eventId Identificativo univoco dell'evento.
     * @return `true` se l'evento è aperto, `false` altrimenti.
     */
    function isEventOpen(uint256 eventId) external view returns (bool) {
        require(eventId < eventIdCounter, "Evento non esistente"); // Verifica che l'evento esista
        return events[eventId].state == EventState.OPEN; // Controlla se lo stato è OPEN
    }


        /**
     * @notice Crea un nuovo evento con i dettagli forniti.
     * @dev L'evento viene registrato sulla blockchain e inizialmente impostato nello stato `CREATED`.
     * @dev La funzione è protetta dal modifier `whenNotPaused`, quindi non può essere eseguita se il contratto è in pausa.
     * @param _name Nome dell'evento.
     * @param _location Luogo dell'evento.
     * @param _description Descrizione dell'evento.
     * @param _date Data dell'evento in formato timestamp UNIX (deve essere futura).
     * @param _price Prezzo del biglietto in token ERC-20.
     * @param _ticketsAvailable Numero totale di biglietti disponibili per l'evento.
     */
    function createEvent(
        string memory _name,
        string memory _location,
        string memory _description,
        uint256 _date,
        uint256 _price,
        uint256 _ticketsAvailable
    ) external whenNotPaused {
        // Controllo che la data dell'evento sia nel futuro
        require(_date > block.timestamp, "La data dell'evento deve essere nel futuro");

        // Verifica che ci siano biglietti disponibili
        require(_ticketsAvailable > 0, "Il numero di biglietti deve essere maggiore di zero");

        // Assegna un nuovo ID univoco all'evento
        uint256 eventId = eventIdCounter;

        // Memorizza i dettagli dell'evento nella mappatura
        events[eventId] = Event({
            name: _name,
            location: _location,
            description: _description,
            date: _date,
            price: _price,
            ticketsAvailable: _ticketsAvailable,
            creator: msg.sender, // L'utente che chiama la funzione diventa il creatore dell'evento
            state: EventState.CREATED // Stato iniziale dell'evento
        });

        // Incrementa il contatore per il prossimo evento
        eventIdCounter++;

        // Emette un evento sulla blockchain per segnalare la creazione dell'evento
        emit EventCreated(eventId, _name, msg.sender);
    }

    /**
     * @notice Modifica i dettagli di un evento già creato.
     * @dev Solo il creatore dell'evento può modificare i dettagli.
     * @dev L'evento deve essere ancora nello stato `CREATED` per poter essere modificato.
     * @dev La funzione è protetta dal modifier `whenNotPaused`, quindi non può essere eseguita se il contratto è in pausa.
     * @param _eventId Identificativo univoco dell'evento da modificare.
     * @param _name Nuovo nome dell'evento.
     * @param _location Nuova posizione dell'evento.
     * @param _date Nuova data dell'evento (deve essere futura).
     * @param _price Nuovo prezzo dei biglietti.
     * @param _ticketsAvailable Nuova quantità di biglietti disponibili.
     */
    function updateEvent(
        uint256 _eventId,
        string memory _name,
        string memory _location,
        uint256 _date,
        uint256 _price,
        uint256 _ticketsAvailable
    ) external onlyEventCreator(_eventId) whenNotPaused { 
        // Recupera i dati dell'evento dalla mappatura
        Event storage eventToUpdate = events[_eventId];

        // Verifica che l'evento sia ancora nello stato CREATED (non ancora aperto per la vendita)
        require(eventToUpdate.state == EventState.CREATED, "L'evento deve essere nello stato CREATED"); 

        // Verifica che la nuova data sia nel futuro
        require(_date > block.timestamp, "La data dell'evento deve essere nel futuro"); 

        // Verifica che il numero di biglietti sia valido
        require(_ticketsAvailable > 0, "Il numero di biglietti deve essere maggiore di zero");

        // Aggiorna i dati dell'evento con i nuovi valori forniti
        eventToUpdate.name = _name;
        eventToUpdate.location = _location;
        eventToUpdate.date = _date;
        eventToUpdate.price = _price;
        eventToUpdate.ticketsAvailable = _ticketsAvailable;

        // Emette un evento sulla blockchain per segnalare l'aggiornamento
        emit EventUpdated(_eventId, _name); 
    }

    /**
     * @notice Elimina un evento esistente.
     * @dev Solo il creatore dell'evento può eliminarlo.
     * @dev L'evento deve essere nello stato `CREATED` per poter essere eliminato.
     * @dev La funzione è protetta dal modifier `whenNotPaused`, quindi non può essere eseguita se il contratto è in pausa.
     * @param _eventId Identificativo univoco dell'evento da eliminare.
     */
    function deleteEvent(uint256 _eventId) external onlyEventCreator(_eventId) whenNotPaused { 
        // Recupera i dati dell'evento dalla mappatura
        Event storage eventToDelete = events[_eventId]; 

        // Verifica che l'evento sia ancora nello stato CREATED
        require(eventToDelete.state == EventState.CREATED, "L'evento deve essere nello stato CREATED"); 

        // Rimuove l'evento dalla mappatura
        delete events[_eventId]; 

        // Emette un evento sulla blockchain per segnalare l'eliminazione dell'evento
        emit EventDeleted(_eventId);
    }


        /**
     * @notice Modifica lo stato di un evento.
     * @dev Solo il creatore dell'evento può modificarne lo stato.
     * @dev La funzione è protetta dal modifier `whenNotPaused`, quindi non può essere eseguita se il contratto è in pausa.
     * @param _eventId Identificativo univoco dell'evento.
     * @param _newState Nuovo stato da assegnare all'evento.
     */
    function changeEventState(uint256 _eventId, EventState _newState) external onlyEventCreator(_eventId) whenNotPaused { 
        // Recupera i dati dell'evento dalla mappatura
        Event storage eventToUpdate = events[_eventId]; 

        // Controllo delle transizioni di stato valide
        require(
            (_newState == EventState.OPEN && eventToUpdate.state == EventState.CREATED) ||  // Passaggio da CREATED a OPEN
            (_newState == EventState.CLOSED && eventToUpdate.state == EventState.OPEN) ||  // Passaggio da OPEN a CLOSED
            (_newState == EventState.CANCELLED),  // Qualsiasi stato può passare a CANCELLED
            "Transizione di stato non valida"
        );

        // Aggiorna lo stato dell'evento
        eventToUpdate.state = _newState; 
        
        // Emette un evento sulla blockchain per segnalare la modifica dello stato
        emit EventStateChanged(_eventId, _newState); 
    }

    /**
     * @notice Decrementa il numero di biglietti disponibili per un evento.
     * @dev Può essere chiamata dal sistema per aggiornare la disponibilità dei biglietti dopo un acquisto.
     * @dev L'evento deve essere nello stato `OPEN` e ci devono essere biglietti disponibili.
     * @param eventId Identificativo univoco dell'evento.
     */
    function decreaseTicketCount(uint256 eventId) external {
        // Controlla che l'evento sia nello stato OPEN
        require(events[eventId].state == EventState.OPEN, "L'evento non e' aperto per l'acquisto");

        // Controlla che ci siano ancora biglietti disponibili
        require(events[eventId].ticketsAvailable > 0, "Biglietti esauriti");

        // Decrementa il numero di biglietti disponibili
        events[eventId].ticketsAvailable -= 1;
    }

    /**
     * @notice Annulla un evento e attiva il meccanismo di emergenza se troppi eventi vengono annullati.
     * @dev Solo il creatore dell'evento può annullarlo.
     * @dev Se troppi eventi vengono annullati in poco tempo, viene attivato l'`Emergency Stop` per protezione.
     * @param _eventId Identificativo univoco dell'evento da annullare.
     */
    function cancelEvent(uint256 _eventId) external whenNotPaused {
        // Controlla che solo il creatore dell'evento possa annullarlo
        require(events[_eventId].creator == msg.sender, "Solo il creatore puo' annullare l'evento");

        // Controlla che l'evento non sia già stato annullato
        require(events[_eventId].state != EventState.CANCELLED, "L'evento e' gia' annullato");

        // Imposta lo stato dell'evento come CANCELLED
        events[_eventId].state = EventState.CANCELLED;

        // Se è passato più di un'ora dall'ultimo reset, azzera il contatore degli eventi annullati
        if (block.timestamp - lastResetTime > 1 hours) {
            cancelledEvents = 0;
            lastResetTime = block.timestamp;
        }

        // Incrementa il contatore degli eventi annullati
        cancelledEvents++;

        // Se il numero di eventi annullati supera la soglia, attiva il Circuit Breaker
        if (cancelledEvents >= 3) {
            _pause(); // Sospende temporaneamente il contratto
            emit EmergencyStopActivated("Emergency Stop attivato! Troppi eventi annullati.");
        }
        
        // Emette un evento sulla blockchain per segnalare la modifica dello stato
        emit EventStateChanged(_eventId, EventState.CANCELLED);
    }


        /**
     * @notice Recupera i dettagli di un evento esistente.
     * @dev La funzione restituisce solo informazioni pubbliche e non modifica lo stato della blockchain.
     * @param _eventId Identificativo univoco dell'evento da consultare.
     * @return name Nome dell'evento.
     * @return location Luogo in cui si svolge l'evento.
     * @return date Data dell'evento in formato timestamp UNIX.
     * @return price Prezzo del biglietto in token ERC-20.
     * @return creator Indirizzo del creatore dell'evento.
     * @return state Stato attuale dell'evento.
     */
    function getEventDetails(uint256 _eventId) external view returns (
        string memory name, 
        string memory location, 
        uint256 date, 
        uint256 price, 
        address creator, 
        EventState state
    ) {
        // Verifica che l'evento esista
        require(_eventId < eventIdCounter, "Evento non esistente");

        // Recupera i dettagli dell'evento dalla mappatura
        Event storage eventInfo = events[_eventId];

        // Restituisce i dettagli richiesti
        return (
            eventInfo.name,
            eventInfo.location,
            eventInfo.date,
            eventInfo.price,
            eventInfo.creator,
            eventInfo.state
        );
    }

    /**
     * @notice Restituisce il numero totale di eventi creati.
     * @dev La funzione è `view`, quindi non modifica lo stato della blockchain.
     * @return Numero totale di eventi registrati fino a quel momento.
     */
    function getTotalEvents() external view returns (uint256) {
        return eventIdCounter;
    }

    /**
     * @notice Attiva la modalità di emergenza (Emergency Stop).
     * @dev Solo il proprietario del contratto può attivarla.
     * @dev Blocca tutte le funzioni che sono protette dal modifier `whenNotPaused`.
     */
    function emergencyStop() external onlyOwner {
        _pause();
    }

    /**
     * @notice Riprende le operazioni dopo un'emergenza.
     * @dev Solo il proprietario del contratto può riattivare le operazioni.
     * @dev Riabilita tutte le funzioni che erano bloccate da `whenNotPaused`.
     */
    function resumeOperations() external onlyOwner {
        _unpause();
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
