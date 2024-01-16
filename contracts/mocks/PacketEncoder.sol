// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.22;

import {Packet} from "../layerzero-v2/protocol/interfaces/ISendLib.sol";

contract PacketEncoder {
    uint8 internal constant PACKET_VERSION = 1;

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
