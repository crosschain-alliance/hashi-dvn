// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.22;

import {OracleAdapter} from "../hashi/OracleAdapter.sol";

contract MessageRelayAdapterMock is OracleAdapter {
    function storeHash(uint256 domain, uint256 id, bytes32 hash) external {
        _storeHash(domain, id, hash);
    }
}
