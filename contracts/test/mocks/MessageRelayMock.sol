// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.20;

import {IMessageRelay} from "../../hashi/interfaces/IMessageRelay.sol";

contract MessageRelayMock is IMessageRelay {
    event MessageRelayed(address indexed emitter, uint256 indexed messageId);

    function relayMessages(
        uint256[] memory messageIds,
        address adapter
    ) external payable returns (bytes32 receipts) {
        for (uint256 i = 0; i < messageIds.length; i++) {
            emit MessageRelayed(address(this), messageIds[i]);
        }

        return keccak256(abi.encode(messageIds, adapter));
    }
}
