require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: "0.8.28",
  networks: {
    ganache: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: [
        "ed9baf3b0cb67ea16f39aa019b8be3d9b41a0c56d8a21bb79ffc8ba267153e83", 
        "166ae1b9f529283e128abad021d6d1949771bc1a09757e01c0a8817263700372",
        "65bd6eb3ad9042cf6ed892b7b70fc84b59fd9f813a3872e046d857c722da4612",
        "d8f6deaac973724315679b0d24ed0673e58833cfaf15a95cdfb734af17e01a1c",
        "c23d6210a24492729a0138f58c20f5133cb6fabb05663080ace377bdea2e79b8",
      ],
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
};
