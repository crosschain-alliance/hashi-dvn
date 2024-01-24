// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.20;

import {HashiRegistry} from "../HashiRegistry.sol";

interface IHashiDVNAdapterFeeLib {
    function getFeeOnSend(
        uint32 dstId
    ) external payable returns (uint256 totalFee);

    function getFee(uint32 dstId) external view returns (uint256 fee);
}
