// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.22;

contract Counter {
    uint256 public count;

    function setCounter(uint256 _newCount) public {
        count = _newCount;
    }
}
