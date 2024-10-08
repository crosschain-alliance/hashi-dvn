const { createWalletClient, http, publicActions } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { chainConfig } = require("../../../config");


class Multiclient {
    constructor({ chains, privateKey, rpcUrls }) {
      this._clients = chains.reduce((_acc, _chain) => {
        const rpcUrl = rpcUrls[_chain.name]
        _acc[_chain.name] =   createWalletClient({
          account: privateKeyToAccount(privateKey),
          transport: http(rpcUrl),
          chain: _chain.type
        }).extend(publicActions)
        return _acc
      }, {})
    }

    getAddress(chainName) {
        switch (chainName) {
          case "gnosis":
            return chainConfig.chainAddress.gnosis ? chainConfig.chainAddress.gnosis : null;
          case "ethereum":
            return chainConfig.chainAddress.ethereum ? chainConfig.chainAddress.ethereum : null;
          case "localhosteth":
            // for fork testing
            return chainConfig.chainAddress.ethereum ? chainConfig.chainAddress.ethereum : null;
          case "localhostgno":
            // for fork testing
            return chainConfig.chainAddress.gnosis ? chainConfig.chainAddress.gnosis : null;
          case "localhostsep":
            // for fork testing
            return chainConfig.chainAddress.sepolia ? chainConfig.chainAddress.sepolia : null;
          case "localhostmumbai":
            // for fork testing
            return chainConfig.chainAddress.chiado ? chainConfig.chainAddress.mumbai : null;
          case "sepolia":
            return chainConfig.chainAddress.sepolia ? chainConfig.chainAddress.sepolia : null;
          case "polygonMumbai":
            return chainConfig.chainAddress.mumbai ? chainConfig.chainAddress.mumbai : null;
          default:
            return null;
        }
      }
  }


  module.exports = { Multiclient };