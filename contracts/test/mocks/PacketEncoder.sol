// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import {Packet} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import {DVNAdapterMessageCodec} from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/dvn/adapters/libs/DVNAdapterMessageCodec.sol";
//struct Packet {
//     uint64 nonce;
//     uint32 srcEid;
//     address sender;
//     uint32 dstEid;
//     bytes32 receiver;
//     bytes32 guid;
//     bytes message;
// }

contract PacketEncoder {
    uint8 internal constant PACKET_VERSION = 1;

    function encode(
        bytes32 _receiveLib,
        bytes memory _packetHeader,
        bytes32 _payloadHash
    ) external pure returns (bytes memory payload) {
        return
            DVNAdapterMessageCodec.encode(
                _receiveLib,
                _packetHeader,
                _payloadHash
            );
    }

    function encodePacketHeader(
        Packet memory _packet
    ) external pure returns (bytes memory) {
        return
            abi.encodePacked(
                PACKET_VERSION,
                _packet.nonce,
                _packet.srcEid,
                bytes32(uint256(uint160(_packet.sender))),
                _packet.dstEid,
                _packet.receiver
            );
    }

    function encodePayload(
        Packet memory _packet
    ) public pure returns (bytes memory) {
        return abi.encodePacked(_packet.guid, _packet.message);
    }

    function encodePayloadHash(
        Packet memory _packet
    ) external pure returns (bytes32) {
        return keccak256(encodePayload(_packet));
    }
}
