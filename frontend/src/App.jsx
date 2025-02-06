import React, { useState } from "react";
import WalletConnect from "./components/WalletConnect";
import EventList from "./components/EventList";
import RefundRequest from "./components/RefundRequest";

function App() {
  const [account, setAccount] = useState(null);

  return (
    <div className="container mt-4">
      <h1 className="text-center">TickeChain 🎟️</h1>
      <WalletConnect setAccount={setAccount} />
      {account && (
        <>
          <EventList account={account} />
          <RefundRequest account={account} />
        </>
      )}
    </div>
  );
}

export default App;
