const { gnosis, optimism, mainnet } = require("viem/chains");

const { createWalletClient, http, publicActions } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { chainConfig } = require("../../../config");

class ViemClient {
  constructor(privateKey) {
    this.account = privateKeyToAccount(privateKey);
  }

  getAddress(chainName) {
    switch (chainName) {
      case "localhosteth":
        return chainConfig.chainAddress.ethereum;
      case "gnosis":
        return chainConfig.chainAddress.gnosis;
      case "optimism":
        return chainConfig.chainAddress.optimism;
      case "localhostgno":
        // for testing only
        return chainConfig.chainAddress.gnosis;
    }
  }

  getClient(chainName) {
    switch (chainName) {
      case "localhosteth":
        return createWalletClient({
          account: this.account,
          chain: mainnet,
          transport: http("http://127.0.0.1:8545"),
        }).extend(publicActions);
      case "gnosis":
        return createWalletClient({
          account: this.account,
          chain: gnosis,
          transport: http(),
        }).extend(publicActions);
      case "optimism":
        return createWalletClient({
          account: this.account,
          chain: optimism,
          transport: http("http://127.0.0.1:8545"),
        }).extend(publicActions);
      case "localhostgno":
        return createWalletClient({
          account: this.account,
          chain: gnosis,
          transport: http("http://127.0.0.1:8550"),
        }).extend(publicActions);
    }
  }
}

module.exports = { ViemClient };
