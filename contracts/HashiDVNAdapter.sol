// SPDX-License-Identifier: LZBL-1.2

pragma solidity ^0.8.20;

import {DVNAdapterBase} from "./layerzero-v2/messagelib/uln/dvn/adapters/DVNAdapterBase.sol";
import {DVNAdapterMessageCodec} from "./layerzero-v2/messagelib/uln/dvn/adapters/libs/DVNAdapterMessageCodec.sol";
import {Yaho} from "./hashi/Yaho.sol";
import {Hashi} from "./hashi/Hashi.sol";
import {Message} from "./hashi/interfaces/IMessageDispatcher.sol";
import {IOracleAdapter} from "./hashi/interfaces/IOracleAdapter.sol";
import {IHashiDVNAdapter} from "./interfaces/IHashiDVNAdapter.sol";
import {IHashiDVNAdapterFeeLib} from "./interfaces/IHashiDVNAdapterFeeLib.sol";
import {HashiRegistry} from "./HashiRegistry.sol";

/// @title HashiDVNAdapter integrates Hashi with LayerZero-v2 DVN
/// @author zeng
/// @notice HashiDVNAdapter can be configured by developers into their security stack for verification
/// @dev HashiDVNAdapter leverages security from multiple Hashi Adapters (configured in HashiRegistry.sol)
/// @dev Message hash is passed through Hashi adapters and is compared with the matching LayerZero v2 payload Hash for verification
contract HashiDVNAdapter is DVNAdapterBase, IHashiDVNAdapter {
    Yaho yaho;
    Hashi hashi;
    HashiRegistry hashiRegistry;

    mapping(uint32 dstEid => DstConfig config) public dstConfig;
    mapping(uint32 dstEid => uint256 chainId) public eidToChainId;

    constructor(
        address[] memory _admins,
        address _yaho,
        address _hashi,
        address _hashiRegistry
    ) DVNAdapterBase(msg.sender, _admins, 0) {
        yaho = Yaho(_yaho);
        hashi = Hashi(_hashi);
        hashiRegistry = HashiRegistry(_hashiRegistry);
    }

    // ========================= OnlyAdmin =========================
    /// @notice sets configuration (`dstEid`, `multiplierBps`, `gasLimit` and `peer`) for destination chains
    /// @param _params array of chain configurations
    function setDstConfig(
        DstConfigParam[] calldata _params
    ) external onlyRole(ADMIN_ROLE) {
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
    /// @param eid LayerZero v2 destination endpoint id
    /// @param chainID chainID from EIP155 https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    function setEidToChainID(
        uint32 eid,
        uint256 chainID
    ) external onlyRole(ADMIN_ROLE) {
        require(eid != 0, "invalid eid");
        require(chainID != 0, "invalid chainId");
        eidToChainId[eid] = chainID;
    }

    // ========================= OnlyMessageLib =========================
    /// @notice function called by SendLib from source chain when a new job is assigned by user
    /// @param _param param for AssignJob
    /// @param _options options includes Security and Executor
    function assignJob(
        AssignJobParam calldata _param,
        bytes calldata _options
    ) external payable override onlyAcl(_param.sender) returns (uint256 fee) {
        DstConfig memory config = dstConfig[_param.dstEid];

        // In _param.packetHeader, there is no message field. In order to construct the message for Hashi, we need to encode payload with packet header
        // Hashi's message (bytes) = DVN's payload (bytes)
        // receiverLib = _getAndAssertReceiveLib(sendLib, dstEid)
        bytes32 receiveLib = _getAndAssertReceiveLib(msg.sender, _param.dstEid);

        bytes memory message = _encode(
            receiveLib,
            _param.packetHeader,
            _param.payloadHash
        );

        (
            uint64 nonce,
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

        // Pass the message to Hashi adapters by calling Yaho contract
        yaho.dispatchMessagesToAdapters(
            messageArray,
            sourceAdapters,
            destAdapters
        );

        // get fee from Feelib
        fee = IHashiDVNAdapterFeeLib(workerFeeLib).getFeeOnSend(_param.dstEid);

        return fee;
    }

    /// @notice get Fee from Hashi Registry contract and fee Lib
    /// @dev Function called by LayerZero contract
    /// @param _dstEid LayerZero v2 destination endpoint Id
    /// @return fee for specific dstEid
    function getFee(
        uint32 _dstEid,
        uint64 /*confirmations*/,
        address /*_sender*/,
        bytes calldata /*options*/
    ) external view override returns (uint256 fee) {
        fee = IHashiDVNAdapterFeeLib(workerFeeLib).getFee(_dstEid);
    }

    /// @notice Function called by Hashi DVN on destination chain, with two steps of verification
    ///         1. Check if message hash from Hashi adapters are the same w.r.t. the same messageId
    ///         2. If same, call receiveLib to verify the payload w.r.t the messageId
    ///         Verification true ifhash of the message from Hashi is the same as packet's payload from LZ
    /// @param messageId messageId from Hashi `MessageRelayed` event from source chain
    /// @param message payload of the packet
    function verifyMessageHash(
        bytes32 messageId,
        bytes calldata message
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        (
            address receiveLib,
            bytes memory packetHeader,
            bytes32 payloadHash
        ) = DVNAdapterMessageCodec.decode(message);

        (
            uint64 nonce,
            uint32 _srcEid,
            uint32 _dstEid,
            bytes32 _receiver
        ) = _decodePacketHeader(packetHeader);

        address[] memory destAdapters = hashiRegistry.getDestAdapters(
            _srcEid,
            _dstEid
        );
        require(destAdapters.length != 0, "no Hashi adapters available");

        bytes32 reportedHash = 0x0;

        IOracleAdapter[] memory oracleAdapters = new IOracleAdapter[](
            destAdapters.length
        );

        for (uint56 i = 0; i < destAdapters.length; i++) {
            oracleAdapters[i] = IOracleAdapter(destAdapters[i]);
        }
        uint256 sourceChainId = eidToChainId[_srcEid];

        /// call Hashi.getHash() to get the agreed Hash from hashi adapters
        try
            hashi.getHash(sourceChainId, uint256(messageId), oracleAdapters)
        returns (bytes32 hash) {
            reportedHash = hash;
            /// 1st verification from Hashi passed
            emit HashFromAdaptersMatched(uint256(messageId), hash);
        } catch Error(string memory error) {
            emit LogError(error);
        }

        /// 2nd verification from LZ payload passed
        if (payloadHash == reportedHash) {
            _decodeAndVerify(message);
            emit MessageVerified(nonce, reportedHash);
        } else {
            revert HashiMismatch();
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
    )
        internal
        pure
        returns (uint64 nonce, uint32 srcEid, uint32 dstEid, bytes32 receiver)
    {
        assembly {
            nonce := mload(add(packetHeader, 9)) // 8 + 64
            srcEid := mload(add(packetHeader, 13)) // 8 + 64 + 32
            dstEid := mload(add(packetHeader, 49)) // 8 + 64 + 32 +256 + 32
            receiver := mload(add(packetHeader, 81)) // 8 + 64 + 32 +256 + 32 + 256
        }
    }
}
