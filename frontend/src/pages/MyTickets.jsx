import React, { useEffect, useState } from "react";
import { ticketManagerContract, paymentManagerContract, eventFactoryContract, provider } from "../utils/contracts";
import { Card, Button } from "react-bootstrap";
import { ethers } from "ethers";


const MyTickets = ({ account }) => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchUserTickets = async () => {
      try {
        console.log("📡 Recupero biglietti NFT posseduti dall'utente...");
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        const totalTickets = await ticketManagerContract.balanceOf(userAddress);
        let userTickets = [];

        for (let i = 0; i < totalTickets; i++) {
          const ticketId = i; // Iteriamo sugli ID
          const owner = await ticketManagerContract.ownerOf(ticketId);

          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            const tokenURI = await ticketManagerContract.tokenURI(ticketId);
            userTickets.push({ id: ticketId.toString(), uri: tokenURI });
          }
        }

        setTickets(userTickets);
        console.log("✅ Biglietti recuperati:", userTickets);
      } catch (error) {
        console.error("❌ Errore nel recupero dei biglietti:", error);
      }
    };

    fetchUserTickets();
  }, [account]);
  
  const refundTicket = async (ticketId) => {
    console.log(`🔄 Tentativo di rimborso per il biglietto ID: ${ticketId}`);

    try {
        // ✅ Ottiene il signer dall'oggetto provider (MetaMask)
        const signer = await provider.getSigner();

        // ✅ Recupera l'indirizzo dell'utente connesso
        const userAddress = await signer.getAddress();

        // ✅ Crea istanze dei contratti con il signer per eseguire transazioni
        const ticketManagerWithSigner = ticketManagerContract.connect(signer);
        const eventFactoryWithSigner = eventFactoryContract.connect(signer);
        const paymentManagerWithSigner = paymentManagerContract.connect(signer);

        console.log("📡 Connessione al contratto TicketManager:", ticketManagerWithSigner);

        // ✅ Recupera l'ID dell'evento associato al biglietto tramite TicketManager.sol
        const eventId = await ticketManagerWithSigner.ticketToEventId(ticketId);
        console.log("🎟️ Evento associato al biglietto:", eventId.toString());

        // ✅ Recupera i dettagli dell'evento dall'EventFactory, incluso il prezzo
        const eventDetails = await eventFactoryWithSigner.events(eventId);
        console.log("📋 Dettagli dell'evento:", {
          eventId: eventId?.toString() || "N/A", // Usa "N/A" se undefined
          name: eventDetails?.name || "N/A",
          location: eventDetails?.location || "N/A",
          date: eventDetails?.date ? new Date(Number(eventDetails.date) * 1000).toLocaleString() : "N/A",
          priceWei: eventDetails?.price ? eventDetails.price.toString() : "N/A",
          priceEth: eventDetails?.price ? ethers.formatEther(eventDetails.price) : "N/A",
          ticketsAvailable: eventDetails?.ticketsAvailable ? eventDetails.ticketsAvailable.toString() : "N/A",
          status: eventDetails?.status ? eventDetails.status.toString() : "N/A"
        });
      
      
      
      

        // ✅ Estrae il prezzo grezzo (in wei) dell'evento
        const rawPrice = eventDetails.price.toString();
        console.log("💰 Prezzo grezzo (dal contratto) in wei:", rawPrice);

        // ✅ Converte il prezzo in un valore utilizzabile
        const price = ethers.parseUnits(rawPrice, "wei");
        console.log("💰 Prezzo corretto in wei:", price.toString());
        console.log("💰 Prezzo corretto in ETH:", ethers.formatEther(price));

        // ✅ Controlla se l'evento è stato annullato tramite EventFactory.sol
        const isCancelled = await eventFactoryWithSigner.isEventCancelled(eventId);
        console.log("🛑 Stato dell'evento annullato:", isCancelled);

        // ✅ Se l'evento non è annullato, interrompe l'operazione e avvisa l'utente
        if (!isCancelled) {
            alert("❌ Questo evento non è stato annullato, il rimborso non è disponibile.");
            return;
        }

        // ✅ Se l'evento è annullato, avvia il processo di rimborso tramite PaymentManager.sol
        const refundTx = await paymentManagerWithSigner.processRefund(userAddress, price, { gasLimit: 300000 });
      
        // ✅ Attende la conferma della transazione di rimborso
        await refundTx.wait();
        console.log("✅ Rimborso completato!");
        alert("✅ Rimborso effettuato con successo!");

        // ✅ Dopo il rimborso, il biglietto viene "bruciato" (eliminato dall'utente)
        const burnTx = await ticketManagerWithSigner.refundTicket(ticketId);
        
        // ✅ Attende la conferma della transazione di bruciatura del biglietto
        await burnTx.wait();
        console.log("🔥 Biglietto bruciato!");
        alert("🔥 Biglietto eliminato dal tuo portafoglio!");

        // ✅ Aggiorna la lista dei biglietti rimuovendo quello rimborsato
        //setTickets((prevTickets) => prevTickets.filter((t) => t.id !== ticketId.toString()));

    } catch (error) {
        // ❌ Se qualcosa va storto, mostra un errore in console e un messaggio all'utente
        console.error("❌ Errore durante il rimborso:", error);
        alert("❌ Rimborso fallito!");
    }
};

     

  return (
    <div className="mt-4">
      <h2 className="text-center">🎫 I tuoi Biglietti</h2>
      <div className="row">
        {tickets.length > 0 ? (
          tickets.map((ticket) => (
            <div className="col-md-4" key={ticket.id}>
              <Card className="mb-3">
                <Card.Body>
                  <Card.Title>🎟️ Biglietto #{ticket.id}</Card.Title>
                  <Card.Text>🔗 <a href={ticket.uri} target="_blank" rel="noopener noreferrer">Vedi metadati</a></Card.Text>
                  <Button onClick={() => refundTicket(ticket.id)}>
                      🔄 Richiedi Rimborso
                  </Button>
                </Card.Body>
              </Card>
            </div>
          ))
        ) : (
          <p className="text-center">❌ Nessun biglietto acquistato.</p>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
