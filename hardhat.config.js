require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {},
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.SEPOLIA_ALCHEMY_KEY}`,
      accounts: [`0x${process.env.DEPLOYER_PRIV_KEY}`],
    },
  },
  solidity: {
    version: "0.8.22",

    settings: {
      viaIR: true,
    },
  },
};
