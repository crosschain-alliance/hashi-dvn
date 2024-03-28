require("dotenv").config();

const { ViemClient } = require("../client/viemClient");
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
    this.viemClient = viemClient;
    this.unwatch = null;
    this.sourceChain = sourceChain;
    this.destChain = destChain;
    this.sourceAddresses = this.viemClient.getAddress(this.sourceChain);
    this.destAddresses = this.viemClient.getAddress(this.destChain);
    this.sourceChainClient = this.viemClient.getClient(this.sourceChain);
    this.destChainClient = this.viemClient.getClient(this.destChain);
  }

  async start() {
    console.log(`Listening Hashi Message Relay on ${this.sourceChain}...`);

    this.unwatch = this.sourceChainClient.watchContractEvent({
      address: this.sourceAddresses.mockMessageRelay,
      abi: MessageRelayABI,
      event: "MessageRelayed",
      onLogs: async (logs) => {
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
    const chainId = zeroPadHex(this.sourceAddresses.chainId.toString(), 64);
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

  const viemClient = new ViemClient(`0x${process.env.PRIV_KEY}`);

  const messageRelayedEventListener = new HashiRelayerMock(
    viemClient,
    sourceChain,
    destChain,
  );
  await messageRelayedEventListener.start();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
