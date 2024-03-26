const { abi: HashiDVNAdapterABI } = require("../../abi/HashiDVNAdapter.json");
const {
  abi: MessageRelayAdapterABI,
} = require("../../abi/MockMessageRelayAdapter.json");
const {
  zeroPadHex,
  PacketSerializer,
  getDVNMessage,
} = require("../utils/encoding");

// Handle the event listeners and call contracts on destination chain
// call HashiMessageRelayAdapter.storeHash
// call HashiDVNAdapter.verifyMessageHash
class HashiDVNSender {
  constructor(
    viemClient,
    sourceChain,
    destChain,
    MessageRelayedEventListener,
    DVNEventListener,
  ) {
    this.viemClient = viemClient;
    this.sourceChain = sourceChain;
    this.destChain = destChain;
    this.messageRelayedEventListener = MessageRelayedEventListener;
    this.dvnEventListener = DVNEventListener;
    this.messageRelayedEventListener.handleCallback =
      this.handleEventUpdate.bind(this);
    this.dvnEventListener.handleCallback = this.handleEventUpdate.bind(this);
    this.hashiIdsAndHashArray = []; // [{id, messageHash}]
    this.dvnPacketsArray = []; // [{packet, packetHeader, payloadHash }]
  }

  // callback function called by event listener
  async handleEventUpdate() {
    this.hashiIdsAndHashArray =
      this.messageRelayedEventListener.messageRelayedIdsAndHash;
    this.dvnPacketsArray = this.dvnEventListener.packets;

    // matching Hashi MessageRelay Adapter Event and HashiDVNAdapter event
    if (this.hashiIdsAndHashArray.length == this.dvnPacketsArray.length)
      this.storeHashAndVerify();
  }

  // Two operations:
  // a. store hash on message relay adapter
  // b. call verifyMessageHash on Hashi DVN Adapter
  async storeHashAndVerify() {
    const sourceAddresses = this.viemClient.getAddress(this.sourceChain);
    const destAddresses = this.viemClient.getAddress(this.destChain);
    const destChainClient = this.viemClient.getClient(this.destChain);

    for (let i = 0; i < this.dvnPacketsArray.length; i++) {
      const { request: writestoreHash } =
        await destChainClient.simulateContract({
          address: destAddresses.messageAdapter,
          abi: MessageRelayAdapterABI,
          // storeHash(uint256 domain, uint256 id, bytes32 hash)
          functionName: "storeHash",
          args: [
            zeroPadHex(sourceAddresses.chainId.toString(), 64),
            this.hashiIdsAndHashArray[i]["id"],
            this.dvnPacketsArray[i]["payloadHash"],
          ],
        });

      const txStoreHash = await destChainClient.writeContract(writestoreHash);
      console.log(`call storeHash on MessageRelay Adapter: ${txStoreHash} on ${this.destChain}`);

      // reconstruct the DVNAdapter message needed to verify 
      const encodedMessage = getDVNMessage(
        zeroPadHex(destAddresses.receive302, 64),
        this.dvnPacketsArray[i]["payloadHash"],
        this.dvnPacketsArray[i]["packetHeader"],
      );

      // verify message hash of the id, message pair
      const { result, request: writeVerifyMessageHash } =
        await destChainClient.simulateContract({
          address: destAddresses.hashiDVNAdapter,
          abi: HashiDVNAdapterABI,
          // storeHash(uint256 domain, uint256 id, bytes32 hash)
          functionName: "verifyMessageHash",
          args: [this.hashiIdsAndHashArray[i]["id"], encodedMessage],
        });
      const txVerifyMessageHash = await destChainClient.writeContract(
        writeVerifyMessageHash,
      );
      console.log(
        `call verifyMessageHash on HashiDVNAdapter ${txVerifyMessageHash}  on ${this.destChain}`,
      );

      // remove the id and packet pair
      this.dvnPacketsArray.splice(i, 1);
      this.hashiIdsAndHashArray.splice(i, 1);
    }
  }
}

exports.HashiDVNSender = HashiDVNSender;
