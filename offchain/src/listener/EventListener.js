const { parseEventLogs, parseAbi } = require("viem");
require("dotenv").config();

const { abi: EndpointV2ABI } = require("../../abi/EndpointV2.json");
const { PacketSerializer } = require("../utils/encoding");

// Listen to PacketSent and DVNFeePaid event from an Oapp
// store the packet from the event
class DVNEventListener {
  constructor(viemClient, sourceChain) {
    this.unwatch = null;
    this.sourceChain = sourceChain;
    this.sourceAddresses = viemClient.getAddress(this.sourceChain);
    this.sourceChainClient = viemClient._clients[this.sourceChain];
    this.packets = [];
    // packets = [{
    //   messageId : bytes32,//bigInt
    //   encodedPayload : bytes,
    //   packet : struct{},
    //   packetHeader : bytes,
    //   payloadHash : bytes32 ,
    // }]
  }

  async start() {
    console.log(`Listening Packet Sent event on contract ${this.sourceAddresses.endpoint} on ${this.sourceChain}...`);

    this.unwatch = this.sourceChainClient.watchContractEvent({
      address: this.sourceAddresses.endpoint,
      abi: EndpointV2ABI,
      event: "PacketSent",
      // event PacketSent(bytes encodedPayload, bytes options, address sendLibrary);
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
    // Event signatures
    const DVN_FEE_PAID =
      "0x07ea52d82345d6e838192107d8fd7123d9c2ec8e916cd0aad13fd2b60db24644";
    const PACKET_SENT =
      "0x1ab700d4ced0c005b164c0f789fd09fcbb0156d4c2041b8a3bfbcd961cd1567f";
    const MESSAGE_DISPATCHED =
      "0xe2f8f20ddbedfce5eb59a8b930077e7f4906a01300b9318db5f90d1c96c7b6d4";
    const MESSAGE_RELAYED =
      "0x1ec56558159131145cca16f5f6dfa0cb00baed662a177d318d8bcb00b751820d";

    // get all the logs from this transaction
    const transaction = await this.sourceChainClient.getTransactionReceipt({
      hash: log[0].transactionHash,
    });

    let isHashiDVNAssigned = false;

    // Check if Hashi DVN get assigned
    for (let i = 0; i < transaction.logs.length; i++) {
      if (transaction.logs[i].topics[0] == DVN_FEE_PAID) {
        const parsedEvent = parseEventLogs({
          abi: parseAbi([
            "event DVNFeePaid(address[] requiredDVNs, address[] optionalDVNs, uint256[] fees)",
          ]),
          logs: transaction.logs,
        });

        // check whether Hashi DVN is in required or optional DVN list
        for (let i = 0; i < parsedEvent[0].args.requiredDVNs.length; i++) {
          if (
            parsedEvent[0].args.requiredDVNs[i] ==
            this.sourceAddresses.hashiDVNAdapter
          ) {
            console.log("Hashi DVN Adapter fee paid");
            isHashiDVNAssigned = true;
            break;
          }
        }
        for (let i = 0; i < parsedEvent[0].args.optionalDVNs.length; i++) {
          if (
            parsedEvent[0].args.requiredDVNs[i] ==
            this.sourceAddresses.hashiDVNAdapter
          ) {
            console.log("Hashi DVN Adapter fee paid");
            isHashiDVNAssigned = true;
            break;
          }
        }
      }
    }

    if (isHashiDVNAssigned) {
      const lastPacketsLength = this.packets.length;

      // Push the packet into array
      for (let i = 0; i < transaction.logs.length; i++) {
        const currentPacketsLength = this.packets.length;

        if (transaction.logs[i].topics[0] == PACKET_SENT) {
          const parsed = parseEventLogs({
            abi: parseAbi([
              "event PacketSent(bytes encodedPayload, bytes options, address sendLibrary)",
            ]),
            logs: transaction.logs,
          });
          const encodedPayload = parsed[0].args.encodedPayload;
          const packet = PacketSerializer.deserialize(encodedPayload);
          const packetHeader = PacketSerializer.getHeader(encodedPayload);
          const payloadHash = PacketSerializer.getPayloadHash(encodedPayload);

          // if this tx is new
          if (lastPacketsLength == currentPacketsLength) {
            this.packets.push({
              packet: packet,
              packetHeader: packetHeader,
              payloadHash: payloadHash,
              encodedPayload: encodedPayload,
            });
          } else {
            // If haven't collected enough key-value pairs from the event
            let lastPacketValue = this.packets[currentPacketsLength - 1];
            this.packets[currentPacketsLength - 1] = {
              ...lastPacketValue,
              packet: packet,
              packetHeader: packetHeader,
              payloadHash: payloadHash,
              encodedPayload: encodedPayload,
            };
          }
        }
        if (transaction.logs[i].topics[0] == MESSAGE_RELAYED) {
          const parsed = parseEventLogs({
            abi: parseAbi([
              "event MessageRelayed(address indexed emitter, uint256 indexed messageId)",
            ]),
            logs: transaction.logs,
          });
          const messageId = parsed[0].args.messageId;

          // if this tx is new
          if (lastPacketsLength == currentPacketsLength) {
            this.packets.push({
              messageId: messageId.toString(16),
            });
          } else {
            // If haven't collected enough key-value pairs from the event
            let lastPacketValue = this.packets[currentPacketsLength - 1];

            this.packets[currentPacketsLength - 1] = {
              ...lastPacketValue,
              messageId: messageId.toString(16),
            };
          }
        }
      }
    }
    await this.handleCallback();
  }

  async handleCallback() {}
  stop() {
    if (this.unwatch) {
      this.unwatch(); // Stop watching the contract event
    }
    console.log("DVN Event listener stopped.");
  }
}

module.exports = { DVNEventListener };
