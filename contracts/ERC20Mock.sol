// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Importiamo il contratto ERC20 dalla libreria OpenZeppelin per utilizzare tutte le funzionalità di ERC20.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ERC20Mock
 * @dev Contratto mock per simulare un token ERC-20 durante i test.
 * Questo contratto crea un token ERC-20 personalizzato con un'offerta iniziale di token,
 * utile per simulazioni nei test, come il trasferimento di fondi tra indirizzi o l'approvazione dei trasferimenti.
 */
contract ERC20Mock is ERC20 {

    /**
     * @dev Costruttore del contratto.
     * @param name Nome del token ERC-20 (es. "Test Token").
     * @param symbol Simbolo del token ERC-20 (es. "TTK").
     * @param initialSupply Quantità iniziale di token da mintare.
     * Il costruttore chiama il costruttore del contratto ERC20 per inizializzare il nome e simbolo del token.
     * Inoltre, esegue il minting (creazione) dell'offerta iniziale di token e li assegna al deployer del contratto.
     */
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        // La funzione _mint viene chiamata per emettere i token iniziali
        // Il "msg.sender" è l'indirizzo che distribuisce il contratto, quindi diventa il primo destinatario dei token
        _mint(msg.sender, initialSupply);  // Minta tutti i token al deployer
    }
}
