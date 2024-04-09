const { parseEventLogs, parseAbi } = require("viem");
const { abi: HashiDVNAdapterABI } = require("../../abi/HashiDVNAdapter.json");
const { zeroPadHex, getDVNMessage } = require("../utils/encoding");

// Handle the event listeners and call HashiDVNAdapter on destination chain
// call HashiDVNAdapter.verifyMessageHash
class HashiDVNSender {
  constructor(viemClient, destChain, DVNEventListener) {
    this.destChain = destChain;
    this.destAddresses = viemClient.getAddress(this.destChain);
    this.destChainClient = viemClient._clients[this.destChain];
    this.dvnEventListener = DVNEventListener;
    this.dvnEventListener.handleCallback = this.handleEventUpdate.bind(this);
    this.dvnPacketsArray = []; // [{packet, packetHeader, payloadHash }]
  }

  // callback function called by event listener
  async handleEventUpdate() {
    this.dvnPacketsArray = this.dvnEventListener.packets;
    console.log("packet ", this.dvnPacketsArray)
    await this.VerifyMessageHash();
  }

  // call verifyMessageHash on Hashi DVN Adapter
  // delete the packet if it is verified
  // retry if fail to verify, remove the packet if fail after 5 times
  async VerifyMessageHash() {
    const PAYLOAD_VERIFIED =
      "0x2cb0eed7538baeae4c6fde038c0fd0384d27de0dd55a228c65847bda6aa1ab56";


    for (let i = 0; i < this.dvnPacketsArray.length; i++) {
      // reconstruct the DVNAdapter message needed to verify
      const encodedMessage = getDVNMessage(
        zeroPadHex(this.destAddresses.receive302, 64),
        this.dvnPacketsArray[i]["payloadHash"],
        this.dvnPacketsArray[i]["packetHeader"],
      );
      const messageId = zeroPadHex(this.dvnPacketsArray[i]["messageId"], 64);

      let retry = true;
      let retryCount = 0;
      while (retry && retryCount <= 5) {
        try {
          const { request: writeVerifyMessageHash } =
            await this.destChainClient.simulateContract({
              address: this.destAddresses.hashiDVNAdapter,
              abi: HashiDVNAdapterABI,
              functionName: "verifyMessageHash",
              args: [messageId, encodedMessage],
            });
          const txVerifyMessageHash = await this.destChainClient.writeContract(
            writeVerifyMessageHash,
          );

          console.log(
            `call verifyMessageHash on HashiDVNAdapter: ${txVerifyMessageHash} on ${this.destChain}`,
          );

          // Check if the transaction has emit event PayloadVerified from receiveLib302

          const verifyMessageHashReceipt =
            await this.destChainClient.getTransactionReceipt({
              hash: txVerifyMessageHash,
            });

          for (let i = 0; i < verifyMessageHashReceipt.logs.length; i++) {
            if (
              verifyMessageHashReceipt.logs[i].topics[0] == PAYLOAD_VERIFIED
            ) {
              const parsedEvent = parseEventLogs({
                abi: parseAbi([
                  "event PayloadVerified(address dvn, bytes header, uint256 confirmations, bytes32 proofHash)",
                ]),
                logs: verifyMessageHashReceipt.logs,
              });

              if (parsedEvent[0].args.dvn == this.destAddresses.hashiDVNAdapter)
                console.log(
                  `Hashi DVN has verified the message of ID ${messageId}`,
                );
            }
          }

          retry = false;
        } catch (error) {
          retryCount += 1;
          if (retryCount == 5) {
            console.log(`fail to verify message of ID ${messageId}`);
            this.dvnPacketsArray.splice(i, 1);
          }
          console.log(error);
          console.log("Retrying in 10 seconds...");
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      }

      //  remove the packet from array
      this.dvnPacketsArray.splice(i, 1);
    }
  }
}

module.exports = {HashiDVNSender};
