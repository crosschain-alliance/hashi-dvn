// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Hashi Registry contract to record source<->dest adapters pair address, and their fee
/// @author zeng
/// @notice set and get fee for specific route required by Hashi adapters
/// @dev
contract HashiRegistry is Ownable {
    struct AdapterPair {
        address sourceAdapter;
        address destAdapter;
    }

    mapping(uint32 sourceEid => mapping(uint32 destEid => AdapterPair[] adapters)) sourceAdaptersPair;
    mapping(uint32 destEid => mapping(uint32 sourceEid => address[] adapters)) destAdapters;
    mapping(uint32 destEid => uint256 fee) hashiFee;

    event NewFeeSet(uint32 indexed destEid, uint256 indexed fee);
    event NewSourceAdaptersPairSet(
        uint32 indexed sourceEid,
        uint32 indexed destEid,
        address indexed sourceAdapters,
        address destAdapters
    );
    event NewDestAdaptersPairSet(
        uint32 indexed sourceEid,
        uint32 indexed destEid,
        address indexed destAdapters
    );

    /// @notice called by HashiDVNAdapter contract from source chain
    /// @param sourceEid LZ v2 source chain endpoint id
    /// @param destEid LZ v2 destination chain endpoint id
    function getSourceAdaptersPair(
        uint32 sourceEid,
        uint32 destEid
    ) external view returns (AdapterPair[] memory) {
        return sourceAdaptersPair[sourceEid][destEid];
    }

    /// @notice set source adapters pair, only called by owner
    /// @param sourceEid LZ v2 source chain endpoint id
    /// @param destEid LZ v2 destination chain endpoint id
    /// @param _sourceAdapters an array of source chain Hashi message relay adapters
    /// @param _destAdapters an array of destination chain Hashi adapter corresponding to the source chain message relay adapters
    ///         The index of _sourceAdapters and _destAdapters should be the same for a pair of adapter
    function setSourceAdaptersPair(
        uint32 sourceEid,
        uint32 destEid,
        address[] calldata _sourceAdapters,
        address[] calldata _destAdapters
    ) external onlyOwner {
        require(
            _sourceAdapters.length == _destAdapters.length,
            "Adapters length mismatch !"
        );
        uint256 len = _sourceAdapters.length;
        for (uint256 i = 0; i < len; i++) {
            sourceAdaptersPair[sourceEid][destEid].push(
                AdapterPair(_sourceAdapters[i], _destAdapters[i])
            );
            emit NewSourceAdaptersPairSet(
                sourceEid,
                destEid,
                _sourceAdapters[i],
                _destAdapters[i]
            );
        }
    }

    /// @notice called by HashiDVNAdapter contract from destination chain
    /// @param sourceEid LZ v2 source chain endpoint id
    /// @param destEid LZ v2 destination chain endpoint id
    function getDestAdapters(
        uint32 sourceEid,
        uint32 destEid
    ) external view returns (address[] memory) {
        return destAdapters[destEid][sourceEid];
    }

    /// @notice set dest adapters pair, only called by owner
    /// @param sourceEid LZ v2 source chain endpoint id
    /// @param destEid LZ v2 destination chain endpoint id
    /// @param _destAdapters an array of destination chain Hashi Adapters, that will be called using Hashi.getHash
    function setDestAdapters(
        uint32 sourceEid,
        uint32 destEid,
        address[] calldata _destAdapters
    ) external onlyOwner {
        require(
            _destAdapters.length != 0,
            "Destination Adapters should not be empty!"
        );

        uint256 len = _destAdapters.length;
        for (uint256 i = 0; i < len; i++) {
            destAdapters[destEid][sourceEid].push(_destAdapters[i]);
            emit NewDestAdaptersPairSet(sourceEid, destEid, _destAdapters[i]);
        }
    }

    /// @notice get destination fee for sending message hash through Hashi adapters
    /// @param destEid LZ v2 destination chain endpoint id
    /// TODO calculate actual gas used for each adapters
    function getDestFee(uint32 destEid) external view returns (uint256 fee) {
        return hashiFee[destEid];
    }

    /// @notice set fee for destination adapters, only called by owner
    /// @param destEid LZ v2 destination chain endpoint id
    /// @param fee fee for using Hashi adapters to relay message hash to destination chain
    function setDestFee(uint32 destEid, uint256 fee) external onlyOwner {
        hashiFee[destEid] = fee;
        emit NewFeeSet(destEid, fee);
    }
}
