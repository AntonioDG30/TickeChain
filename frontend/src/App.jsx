import React, { useState } from "react";
import WalletConnect from "./components/WalletConnect";
import EventList from "./components/EventList";

function App() {
  const [account, setAccount] = useState(null);

  return (
    <div className="container mt-4">
      <h1 className="text-center">TickeChain 🎟️</h1>
      <WalletConnect setAccount={setAccount} />
      {account && <EventList account={account} />}
    </div>
  );
}

export default App;
