// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.20;

interface IHashiDVNAdapter {
    struct DstConfigParam {
        uint32 dstEid;
        uint16 multiplierBps;
        uint256 gasLimit;
        bytes peer;
    }

    struct DstConfig {
        uint16 multiplierBps;
        uint256 gasLimit;
        bytes peer;
    }

    event DstConfigSet(DstConfigParam[] params);
    event HashFromAdaptersMatched(
        uint256 indexed messageId,
        bytes32 indexed hash
    );
    event LogError(string error);
}
