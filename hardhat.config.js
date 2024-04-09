require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {},
    localhostsep: {
      url: 'http://127.0.0.1:8545',
      // for fork testing only
      accounts: [`0x${process.env.PRIV_KEY}`],
    },
    localhostchia: {
      url: 'http://127.0.0.1:8550',
      // for fork testing only
      accounts: [`0x${process.env.PRIV_KEY}`],
    },
    localhostmumbai:{
      url: 'http://127.0.0.1:8550',
      // for fork testing only
      accounts: [`0x${process.env.PRIV_KEY}`],
    },

    sepolia: {
      url: `${process.env.SEPOLIA_RPC_URL}`,
      accounts: [`0x${process.env.PRIV_KEY}`],
    },
    chiado: {
      url: "https://rpc.chiadochain.net",
      accounts: [`0x${process.env.PRIV_KEY}`]
    },
    mumbai: {
      url: `${process.env.MUMBAI_RPC_URL}`,
      accounts: [`0x${process.env.PRIV_KEY}`]
    }
  },
  etherscan: {
    apiKey: {
      sepolia: `${process.env.ETHERSCAN_API_KEY}`,
      polygonMumbai: 'S2TGWK2YQHJWGXM43H418D9ABDFPSJIBDP'
    },
    chiado: [
      {
        network: "chiado",
        chainId: 10200,
        urls: {
          apiURL: "https://gnosis-chiado.blockscout.com/api",
          browserURL: "https://gnosis-chiado.blockscout.com/"
        },
        apiKey: "39586131-6d66-4566-a7cb-361aea905809"
      }
    ]
  
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
