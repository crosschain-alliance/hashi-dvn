require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {},
    localhosteth: {
      url: 'http://127.0.0.1:8545',
      // for fork testing only
      accounts: [`0x${process.env.ANVIL_PRIVATE_KEY}`],
    },
    localhostgno: {
      url: 'http://127.0.0.1:8550',
      // for fork testing only
      accounts: [`0x${process.env.ANVIL_PRIVATE_KEY}`],
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_ALCHEMY_KEY}`,
      accounts: [`0x${process.env.DEPLOYER_PRIV_KEY}`],
    },
  },
  solidity: {
    version: "0.8.22",

    settings: {
      optimizer: {
        enabled: true,
      },
      viaIR: true,
    },
  },
};
