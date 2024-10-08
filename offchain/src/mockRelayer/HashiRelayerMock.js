require("dotenv").config();
const {mainnet, gnosis, sepolia, polygonMumbai} = require("viem/chains");
const { Multiclient } = require("../client/ViemClient");
const { abi: MessageRelayABI } = require("../../abi/MockMessageRelay.json");
const {
  abi: MessageRelayAdapterABI,
} = require("../../abi/MockMessageRelayAdapter.json");
const { abi: YahoABI } = require("../../abi/Yaho.json");
const { zeroPadHex } = require("../utils/encoding");

// Listen to MessageRelayed from Hashi Message Relay
// Store id and messageHash of the message
class HashiRelayerMock {
  constructor(viemClient, sourceChain, destChain) {
    this.unwatch = null;
    this.sourceChain = sourceChain;
    this.destChain = destChain;
    this.sourceAddresses = viemClient.getAddress(this.sourceChain);
    this.destAddresses = viemClient.getAddress(this.destChain);
    this.sourceChainClient = viemClient._clients[this.sourceChain];

    this.destChainClient = viemClient._clients[this.destChain];
    console.log("Dest client ", this.destChainClient)
  }

  async start() {
    console.log(`Listening Hashi Message Relay  ${ this.sourceAddresses.messageRelay} on ${this.sourceChain}...`);
    this.unwatch = this.sourceChainClient.watchContractEvent({
      address: this.sourceAddresses.messageRelay,
      abi: MessageRelayABI,
      event: "MessageRelayed",
      onLogs: async (logs) => {
        console.log("new message relayed")
        try {
          await this.processLogs(logs);
        } catch (error) {
          console.log(error);
        }
      },
    });

    return this.stop.bind(this);
  }

  async processLogs(log) {
    const messageId = zeroPadHex(log[0].topics[2].toString(), 64);
    const chainId = this.sourceAddresses.chainId;
    let messageHash;
    try {
      messageHash = await this.sourceChainClient.readContract({
        address: this.sourceAddresses.yaho,
        abi: YahoABI,
        functionName: "hashes",
        args: [messageId],
      });

      const { result, request: writestoreHash } =
        await this.destChainClient.simulateContract({
          address: this.destAddresses.messageAdapter,
          abi: MessageRelayAdapterABI,
          functionName: "storeHash",
          args: [chainId, messageId, messageHash],
        });

      const txWriteStoreHash =
        await this.destChainClient.writeContract(writestoreHash);
      console.log(
        `Write store hash tx for messageID ${messageId} and messageHash ${messageHash} sent  ${txWriteStoreHash}`,
      );
    } catch (error) {
      console.log("Hashi Relayer Error ", error);
    }
  }

  stop() {
    if (this.unwatch) {
      this.unwatch(); // Stop watching the contract event
    }

    console.log("Hashi Relayer listener stopped.");
  }
}

async function main() {
  const sourceChain = process.env.SOURCE_CHAIN;
  const destChain = process.env.DESTINATION_CHAIN;

  const chains = [
    { name: "ethereum", type: mainnet},
    { name: "gnosis" , type: gnosis},
    { name: "sepolia" , type: sepolia},
    { name: "polygonMumbai", type: polygonMumbai }
  ];
  const rpcUrls = {

    "ethereum": `${process.env.ETH_RPC_URL}`,
    "gnosis": `${process.env.GNO_RPC_URL}`,
    "sepolia": `${process.env.SEPOLIA_RPC_URL}`,
    "polygonMumbai": `${process.env.MUMBAI_RPC_URL}`
  }

  const multiclient = new Multiclient({chains,privateKey: `0x${process.env.PRIVATE_KEY}` ,rpcUrls})


  const messageRelayedEventListener = new HashiRelayerMock(
    multiclient,
    sourceChain,
    destChain,
  );
  await messageRelayedEventListener.start();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
