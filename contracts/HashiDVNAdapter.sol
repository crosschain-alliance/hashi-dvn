// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.22;

import {DVNAdapterBase} from "./layerzero-v2/messagelib/uln/dvn/adapters/DVNAdapterBase.sol";
import {HashiRegistry} from "./HashiRegistry.sol";
import {Yaho} from "./hashi/Yaho.sol";
import {Hashi} from "./hashi/Hashi.sol";
import {Message} from "./hashi/interfaces/IMessageDispatcher.sol";
import {IOracleAdapter} from "./hashi/interfaces/IOracleAdapter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract HashiDVNAdapter is DVNAdapterBase {
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

    mapping(uint32 dstEid => DstConfig config) public dstConfig;
    mapping(uint32 dstEid => uint256 chainId) public eidToChainId;

    Yaho yaho;
    Hashi hashi;
    HashiRegistry hashiRegistry;

    event DstConfigSet(DstConfigParam[] params);
    event HashFromAdaptersMatched(
        uint256 indexed messageId,
        bytes32 indexed hash
    );
    event LogError(string error);

    constructor(
        address _sendLib,
        address _receiveLib,
        address[] memory _admins,
        address _yaho,
        address _hashi,
        address _hashiRegistry,
        address initialOwner
    ) DVNAdapterBase(_sendLib, _receiveLib, _admins) Ownable(initialOwner) {
        yaho = Yaho(_yaho);
        hashi = Hashi(_hashi);
        hashiRegistry = HashiRegistry(_hashiRegistry);
    }

    /// @notice sets configuration (`dstEid`, `multiplierBps`, `gasLimit` and `peer`) for destination chains
    /// @param _params array of chain configurations
    function setDstConfig(
        DstConfigParam[] calldata _params
    ) external onlyAdmin {
        for (uint256 i = 0; i < _params.length; i++) {
            DstConfigParam calldata param = _params[i];

            dstConfig[param.dstEid] = DstConfig({
                multiplierBps: param.multiplierBps,
                gasLimit: param.gasLimit,
                peer: param.peer
            });
        }

        emit DstConfigSet(_params);
    }

    /// @notice sets mapping for LayerZero's EID to ChainID
    /// @param eid eid of LayerZero
    /// @param chainID chainID of EIP155
    function setEidToChainID(uint32 eid, uint256 chainID) external onlyOwner {
        eidToChainId[eid] = chainID;
    }

    /// @notice function called by SendLib from source chain when a new job is assigned by user
    /// @param _param param for AssignJob
    /// @param _options options includes Security and Executor
    function assignJob(
        AssignJobParam calldata _param,
        bytes calldata _options
    ) external payable override onlySendLib returns (uint256 fee) {
        DstConfig memory config = dstConfig[_param.dstEid];

        // In _param.packetHeader, there is no message field. In order to construct the message for Hashi, we need to encode payload with packet header
        // Hashi's message (bytes) = DVN's payload (bytes)
        bytes memory message = _encodePayload(
            _param.packetHeader,
            _param.payloadHash
        );

        (
            uint32 _srcEid,
            uint32 _dstEid,
            bytes32 _receiver
        ) = _decodePacketHeader(_param.packetHeader);

        require(_param.dstEid == _dstEid, "Dst Eid MisMatch!");

        // Construct Hashi Message type
        Message memory HashiMessage = Message({
            to: address(uint160(uint(_receiver))),
            toChainId: eidToChainId[_dstEid],
            data: message
        });

        Message[] memory messageArray = new Message[](1);
        messageArray[0] = HashiMessage;

        // Get an array of available Hashi adapters for source -> dest chain
        HashiRegistry.AdapterPair[] memory sourceAdaptersPair = hashiRegistry
            .getSourceAdaptersPair(_srcEid, _dstEid);

        // Pass the message to Hashi adapters by calling Yaho contract
        address[] memory sourceAdapters = new address[](
            sourceAdaptersPair.length
        );
        address[] memory destAdapters = new address[](
            sourceAdaptersPair.length
        );

        for (uint256 i = 0; i < sourceAdaptersPair.length; i++) {
            sourceAdapters[i] = (sourceAdaptersPair[i].sourceAdapter);
            destAdapters[i] = (sourceAdaptersPair[i].destAdapter);
        }

        yaho.dispatchMessagesToAdapters(
            messageArray,
            sourceAdapters,
            destAdapters
        );

        fee = hashiRegistry.getDestFee(_dstEid);

        return fee;
    }

    /// @notice encode payload from packet header and payload hash
    /// @param _packetHeader packet header
    /// @param _payloadHash payload hash
    function encodePayload(
        bytes memory _packetHeader,
        bytes32 _payloadHash
    ) external pure returns (bytes memory) {
        return _encodePayload(_packetHeader, _payloadHash);
    }

    /// @notice get Fee from Hashi Registry contract and fee Lib
    /// @dev Function called by LayerZero contract
    function getFee(
        uint32 _dstEid,
        uint64 /*confirmations*/,
        address _sender,
        bytes calldata /*options*/
    ) external view override returns (uint256 fee) {
        DstConfig storage config = dstConfig[_dstEid];
        fee = hashiRegistry.getDestFee(_dstEid);
        if (address(feeLib) != address(0)) {
            fee = feeLib.getFee(
                _dstEid,
                _sender,
                defaultMultiplierBps,
                config.multiplierBps,
                fee
            );
        }
    }

    /// @notice Function called by Hashi DVN on destination chain
    ///         1. Check if message hash from Hashi adapters are the same w.r.t. the same messageId
    ///         2. If same, call receiveLib to verify the payload w.r.t the messageId
    ///         messageId of the message from Hashi should be the same as payload's packet from LZ
    /// @param messageId messageId from Hashi `MessageRelayed` event from source chain
    /// @param _payload payload of the packet
    function verifyMessageHash(
        bytes32 messageId,
        bytes memory _payload
    ) external onlyOwner {
        (bytes memory packetHeader, bytes32 payloadHash) = _decodePayload(
            _payload
        );

        (
            uint32 _srcEid,
            uint32 _dstEid,
            bytes32 _receiver
        ) = _decodePacketHeader(packetHeader);

        address[] memory destAdapters = hashiRegistry.getDestAdapters(
            _srcEid,
            _dstEid
        );

        bytes32 reportedHash = 0x0;
        IOracleAdapter[] memory oracleAdapters = new IOracleAdapter[](
            destAdapters.length
        );
        for (uint56 i = 0; i < destAdapters.length; i++) {
            oracleAdapters[i] = IOracleAdapter(destAdapters[i]);
        }

        uint256 sourceChainId = eidToChainId[_srcEid];
        try
            hashi.getHash(sourceChainId, uint256(messageId), oracleAdapters)
        returns (bytes32 hash) {
            reportedHash = hash;
            emit HashFromAdaptersMatched(uint256(messageId), hash);
        } catch Error(string memory error) {
            emit LogError(error);
        }

        if (reportedHash != 0x0) {
            _verify(_payload);
        }
    }

    /// @notice decode data from packetHeader
    // bytes packetHeader = abi.encodePacked(
    //     PACKET_VERSION, //uint8 1-2
    //     _packet.nonce, //uint64 3-18
    //     _packet.srcEid, //uint32 18-25
    //     _packet.sender.toBytes32(),  //bytes32 26-89
    //     _packet.dstEid, //uint32 90-97
    //     _packet.receiver //bytes32 98-161
    // );
    /// @param packetHeader packet header from endpoint
    function _decodePacketHeader(
        bytes memory packetHeader
    ) internal pure returns (uint32 srcEid, uint32 dstEid, bytes32 receiver) {
        assembly {
            srcEid := mload(add(packetHeader, 13)) // 8 + 64 + 32
            dstEid := mload(add(packetHeader, 49)) // 8 + 64 + 32 +256 + 32
            receiver := mload(add(packetHeader, 81)) // 8 + 64 + 32 +256 + 32 + 256
        }
    }
}
