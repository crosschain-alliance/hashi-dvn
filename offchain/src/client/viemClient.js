const { gnosis, optimism, mainnet, sepolia, gnosisChiado } = require("viem/chains");

const { createWalletClient, http, publicActions } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { chainConfig } = require("../../../config");

class ViemClient {
  constructor(privateKey) {
    this.account = privateKeyToAccount(privateKey);
  }

  getAddress(chainName) {
    switch (chainName) {
      case "gnosis":
        return chainConfig.chainAddress.gnosis;
      case "ethereum":
        return chainConfig.chainAddress.ethereum;
      case "localhosteth":
        // for fork testing
        return chainConfig.chainAddress.ethereum;
      case "localhostgno":
        // for fork testing
        return chainConfig.chainAddress.gnosis;
      case "sepolia":
        return chainConfig.chainAddress.sepolia;
      case "chiado":
        return chainConfig.chainAddress.chiado;
    }
  }

  getClient(chainName) {
    switch (chainName) {
      case "gnosis":
        return createWalletClient({
          account: this.account,
          chain: gnosis,
          transport: http(),
        }).extend(publicActions);
      case "ethereum":
        return createWalletClient({
          account: this.account,
          chain: mainnet,
          transport: http(),
        }).extend(publicActions);
      case "localhosteth":
        // for fork testing only
        return createWalletClient({
          account: this.account,
          chain: mainnet,
          transport: http("http://127.0.0.1:8545"),
        }).extend(publicActions);
      case "localhostgno":
        // for fork testing only
        return createWalletClient({
          account: this.account,
          chain: gnosis,
          transport: http("http://127.0.0.1:8550"),
        }).extend(publicActions);
      case "sepolia":
        return createWalletClient({
          account: this.account,
          chain: sepolia,
          transport: http(),
        }).extend(publicActions);
      case "chiado":
          return createWalletClient({
            account: this.account,
            chain: gnosisChiado,
            transport: http(),
          }).extend(publicActions)
    }
  }
}

module.exports = { ViemClient };
