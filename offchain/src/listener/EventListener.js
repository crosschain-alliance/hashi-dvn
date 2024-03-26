const { parseEventLogs, parseAbi } = require("viem");
require("dotenv").config();

const { abi: MessageRelayABI } = require("../../abi/MockMessageRelay.json");
const { abi: EndpointV2ABI } = require("../../abi/EndpointV2.json");
const { abi: YahoABI } = require("../../abi/Yaho.json");
const { PacketSerializer } = require("../utils/encoding");

class MessageRelayedEventListener {
  constructor(viemClient, sourceChain, destChain) {
    this.viemClient = viemClient;
    this.unwatch = null;
    this.sourceChain = sourceChain;
    this.destChain = destChain;
    this.sourceAddresses = this.viemClient.getAddress(this.sourceChain);
    this.destAddresses = this.viemClient.getAddress(this.destChain);
    this.sourceChainClient = this.viemClient.getClient(this.sourceChain);
    this.destChainClient = this.viemClient.getClient(this.destChain);
    this.messageRelayedIds = [];
    this.messageRelayedIdsAndHash = [];
  }

  async start() {
    console.log(`Listening Hashi Message Relay on ${this.sourceChain}...`);

    this.unwatch = this.sourceChainClient.watchContractEvent({
      address: this.sourceAddresses.mockMessageRelay,
      abi: MessageRelayABI,
      event: "MessageRelayed",
      onLogs: async (logs) => {
        await this.processLogs(logs);
      },
    });

    return this.stop.bind(this);
  }

  async processLogs(log) {
    this.messageRelayedIds.push(log[0].topics[2]); // messageId

    const messageHash = await this.sourceChainClient.readContract({
      address: this.sourceAddresses.yaho,
      abi: YahoABI,
      functionName: "hashes",
      args: [log[0].topics[2]],
    });
    this.messageRelayedIdsAndHash.push({
      id: log[0].topics[2],
      messageHash: messageHash,
    });

    this.handleCallback();
  }

  handleCallback() {}

  stop() {
    if (this.unwatch) {
      this.unwatch(); // Stop watching the contract event
    }

    console.log("Event listener stopped.");
  }
}

class DVNEventListener {
  constructor(viemClient, sourceChain, destChain) {
    this.viemClient = viemClient;
    this.unwatch = null;
    this.sourceChain = sourceChain;
    this.destChain = destChain;
    this.sourceAddresses = this.viemClient.getAddress(this.sourceChain);
    this.destAddresses = this.viemClient.getAddress(this.destChain);
    this.sourceChainClient = this.viemClient.getClient(this.sourceChain);
    this.destChainClient = this.viemClient.getClient(this.destChain);
    this.packets = [];
  }

  async start() {
    console.log(`Listening DVN event on ${this.sourceChain}...`);

    this.unwatch = this.sourceChainClient.watchContractEvent({
      address: this.sourceAddresses.endpoint,
      abi: EndpointV2ABI,
      event: "PacketSent",
      // event PacketSent(bytes encodedPayload, bytes options, address sendLibrary);
      onLogs: async (logs) => {
        await this.processLogs(logs);
      },
    });
    return this.stop.bind(this);
  }

  async processLogs(log) {
    // get all the logs from this transaction

    const transaction = await this.sourceChainClient.getTransactionReceipt({
      hash: log[0].transactionHash,
    });

    let isHashiDVNAssigned = false;

    for (let i = 0; i < transaction.logs.length; i++) {
      // event signtaure
      const DVN_FEE_PAID =
        "0x07ea52d82345d6e838192107d8fd7123d9c2ec8e916cd0aad13fd2b60db24644";
      const PACKET_SENT =
        "0x1ab700d4ced0c005b164c0f789fd09fcbb0156d4c2041b8a3bfbcd961cd1567f";

      if (transaction.logs[i].topics[0] == DVN_FEE_PAID) {
        const parsedEvent = parseEventLogs({
          abi: parseAbi([
            "event DVNFeePaid(address[] requiredDVNs, address[] optionalDVNs, uint256[] fees)",
          ]),
          logs: transaction.logs,
        });
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
            console.log("Hashi DVN Adapter fee");
            isHashiDVNAssigned = true;
            break;
          }
        }
      }

      if (transaction.logs[i].topics[0] == PACKET_SENT && isHashiDVNAssigned) {
        console.log("Hashi DVN Adapter is assigned");
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
        this.packets.push({
          packet: packet,
          packetHeader: packetHeader,
          payloadHash: payloadHash,
          encodedPayload: encodedPayload,
        });
      }
    }

    this.handleCallback();
  }

  handleCallback() {}

  stop() {
    if (this.unwatch) {
      this.unwatch(); // Stop watching the contract event
    }

    console.log("Event listener stopped.");
  }
}

module.exports = { MessageRelayedEventListener, DVNEventListener };
