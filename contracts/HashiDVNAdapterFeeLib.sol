// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.20;

import {HashiRegistry} from "./HashiRegistry.sol";
import {IHashiDVNAdapterFeeLib} from "./interfaces/IHashiDVNAdapterFeeLib.sol";

/// @title HashiDVNAdapterFeeLib get fee from HashiRegistry
/// @author zeng
/// @notice Hashi don't support dynamic fee query, fee for specific path is stored in fee variable
/// @dev call getDestFee from HashiRegistry
contract HashiDVNAdapterFeeLib is IHashiDVNAdapterFeeLib {
    address private _hashiRegistry;

    constructor(address hashiRegistry) {
        _hashiRegistry = hashiRegistry;
    }

    function getFeeOnSend(
        uint32 dstId
    ) external payable returns (uint256 totalFee) {
        totalFee = HashiRegistry(_hashiRegistry).getDestFee(dstId);
    }

    function getFee(uint32 dstId) external view returns (uint256 fee) {
        fee = HashiRegistry(_hashiRegistry).getDestFee(dstId);
    }
}
