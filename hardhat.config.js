require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.28",
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545", // URL RPC fornito da Ganache
      chainId: 1337, // Chain ID di Ganache
      accounts: [
        "aff8413b1717fce7a6a3f731978507686e5b01c4ffddcc2524c66e43d04358a4", 
        "519be3a5b3cab1db6831299d2077109dd19837493c2a57d50f86edd467ac3fcf",
        "45ea66e4b490e5a1a7b9b91d3c960fc4f46f052e22280e41ef07aed241ba9844",
        "f5ec374a7f87aecd09f29dca09eb746532b91d8287b4a7c93917c8e068bc9836",
        "55846ad1215c9f1f71779f3c508d44be195b0a99abfe383d3eb0c2268b64ee9a",
      ], 
    },
  },
};
