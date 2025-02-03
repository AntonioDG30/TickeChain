require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: "0.8.28",
  networks: {
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
      accounts: [
        "c980ea8d10cc70f1fe4177584ea871747bd837277e0f7b24dd0bb8011097f2a3", 
        "e92bbb72d4358a1109f98a13faba6dfb64d623028e1e1bfaff58a2a110649b9d",
        "2d2c67e5d0bdcb11c5bfba0225520f87548af740c3ecdc8d75ac44669386737b",
        "e5168d4d69890a587db48b17f1d2486486edcdf7aaf35e93f2815297a29c9b6a",
        "811a7edeba9bd3752749fcef45091e252fb8f3dd4751a563384d1915c0d2c921",
      ],
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
};
