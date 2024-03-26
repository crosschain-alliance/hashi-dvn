// The encoder presently types according to ethereum addresses, this is to make it clear that zexecutor presently only supports the EVM.
// A production deployment would likely want to support other address types as well.
// modified from https://github.com/0xpaladinsecurity/zexecutor/blob/main/src/encoding.ts

const { pad, slice, keccak256, encodePacked } = require("viem");

const PACKET_VERSION_OFFSET = 0;
const NONCE_OFFSET = 1;
//    path
const SRC_CHAIN_OFFSET = 9;
const SRC_ADDRESS_OFFSET = 13;
const DST_CHAIN_OFFSET = 45;
const DST_ADDRESS_OFFSET = 49;
// payload (guid + message)
const GUID_OFFSET = 81; // keccak256(nonce + path)
const MESSAGE_OFFSET = 113;

exports.trim0x = function (str) {
  return str.replace(/^0x/, "");
};

exports.getDVNMessage = function getDVNMessage(
  receiveLib,
  payloadHash,
  packetHeader,
) {
  //receiceLib, payloadHash, packetHeader
  const RECEIVELIB_OFFSET = 0; // 32 bytes
  const PAYLOADHASH_OFFSET = 32; // 32 bytes
  const PACKETHEADER_OFFSET = 64; // 81 bytes

  const buffer = Buffer.alloc(145); // 145 bytes
  buffer.write(exports.trim0x(receiveLib), "hex");
  buffer.write(exports.trim0x(payloadHash), PAYLOADHASH_OFFSET, "hex");
  buffer.write(exports.trim0x(packetHeader), PACKETHEADER_OFFSET, "hex");

  return "0x" + buffer.toString("hex");
};
class PacketSerializer {
  static serialize(packet) {
    return PacketV1Codec.encode(packet);
  }

  static deserialize(bytesLike) {
    let codec;
    // if (bytesLike instanceof Uint8Array) {
    //   codec = PacketV1Codec.fromBytes(bytesLike);
    // } else {
    //   codec = PacketV1Codec.from(bytesLike);
    // }
    codec = new PacketV1Codec(bytesLike);
    return codec.toPacket();
  }

  static getHeader(bytesLike) {
    let codec;
    // if (bytesLike instanceof Uint8Array) {
    //   codec = PacketV1Codec.fromBytes(bytesLike);
    // } else {
    //   codec = PacketV1Codec.from(bytesLike);
    // }
    codec = new PacketV1Codec(bytesLike);
    return codec.header();
  }

  static getPayloadHash(bytesLike) {
    let codec;
    // if (bytesLike instanceof Uint8Array) {
    //   codec = PacketV1Codec.fromBytes(bytesLike);
    // } else {
    //   codec = PacketV1Codec.from(bytesLike);
    // }
    codec = new PacketV1Codec(bytesLike);
    return codec.payloadHash();
  }
}

function packetToMessageOrigin(packet) {
  return {
    srcEid: packet.srcEid,
    sender: packet.sender,
    nonce: packet.nonce,
  };
}

class PacketV1Codec {
  constructor(payloadEncoded) {
    this.buffer = Buffer.from(exports.trim0x(payloadEncoded), "hex");
  }

  /**
   * encode packet to hex string
   */
  static encode(packet) {
    const message = exports.trim0x(packet.message);
    const buffer = Buffer.alloc(MESSAGE_OFFSET + message.length / 2);
    buffer.writeUInt8(packet.version, PACKET_VERSION_OFFSET);
    buffer.writeBigUInt64BE(BigInt(packet.nonce), NONCE_OFFSET);
    buffer.writeUInt32BE(packet.srcEid, SRC_CHAIN_OFFSET);
    buffer.write(
      exports.trim0x(pad(packet.sender)),
      SRC_ADDRESS_OFFSET,
      32,
      "hex",
    );
    buffer.writeUInt32BE(packet.dstEid, DST_CHAIN_OFFSET);
    buffer.write(
      exports.trim0x(pad(packet.receiver)),
      DST_ADDRESS_OFFSET,
      32,
      "hex",
    );
    buffer.write(exports.trim0x(packet.guid), GUID_OFFSET, 32, "hex");
    buffer.write(message, MESSAGE_OFFSET, message.length / 2, "hex");
    return "0x" + buffer.toString("hex");
  }

  version() {
    return this.buffer.readUInt8(PACKET_VERSION_OFFSET);
  }

  nonce() {
    return this.buffer.readBigUint64BE(NONCE_OFFSET);
  }

  srcEid() {
    return this.buffer.readUint32BE(SRC_CHAIN_OFFSET);
  }

  sender() {
    return (
      "0x" +
      this.buffer.slice(SRC_ADDRESS_OFFSET, DST_CHAIN_OFFSET).toString("hex")
    );
  }

  senderAddressB20() {
    return bytes32ToEthAddress(this.sender());
  }

  dstEid() {
    return this.buffer.readUint32BE(DST_CHAIN_OFFSET);
  }

  receiver() {
    return (
      "0x" + this.buffer.slice(DST_ADDRESS_OFFSET, GUID_OFFSET).toString("hex")
    );
  }

  receiverAddressB20() {
    return bytes32ToEthAddress(this.receiver());
  }

  guid() {
    return (
      "0x" + this.buffer.slice(GUID_OFFSET, MESSAGE_OFFSET).toString("hex")
    );
  }

  message() {
    return "0x" + this.buffer.slice(MESSAGE_OFFSET).toString("hex");
  }

  payloadHash() {
    return keccak256(this.payload());
  }

  payload() {
    return "0x" + this.buffer.slice(GUID_OFFSET).toString("hex");
  }

  header() {
    return "0x" + this.buffer.slice(0, GUID_OFFSET).toString("hex");
  }

  headerHash() {
    return keccak256(this.header());
  }

  toPacket() {
    return {
      version: this.version(),
      nonce: this.nonce(),
      srcEid: this.srcEid(),
      sender: this.senderAddressB20(),
      dstEid: this.dstEid(),
      receiver: this.receiverAddressB20(),
      guid: this.guid(),
      message: this.message(),
      // derived
      payload: this.payload(),
    };
  }
}

function calculateGuid(packetHead) {
  return keccak256(
    encodePacked(
      ["uint64", "uint32", "bytes32", "uint32", "bytes32"],
      [
        packetHead.nonce,
        packetHead.srcEid,
        pad(packetHead.sender),
        packetHead.dstEid,
        pad(packetHead.receiver),
      ],
    ),
  );
}

function bytes32ToEthAddress(addr) {
  const result = slice(addr, 12, 32);
  if (pad(result) !== addr) {
    throw new Error(`Dirty bytes in address: ${addr}, is this an evm address?`);
  }
  return result;
}

function zeroPadHex(value, length) {
  const hexValue = value.startsWith("0x") ? value.slice(2) : value;
  const paddedHex =
    "0x" + "0".repeat(Math.max(0, length - hexValue.length)) + hexValue;
  return paddedHex;
}

exports.PacketSerializer = PacketSerializer;
exports.packetToMessageOrigin = packetToMessageOrigin;
exports.calculateGuid = calculateGuid;
exports.zeroPadHex = zeroPadHex;
