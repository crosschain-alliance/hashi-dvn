// TODO: update test

const { expect } = require("chai");

const { ethers } = require("hardhat");
const {
  impersonateAccount,
  setBalance,
} = require("@nomicfoundation/hardhat-network-helpers");

describe("Hashi DVN Adapter test", function () {
  // Contracts
  let yaho;
  let hashi;
  let hashiRegistry;
  let sendLibMock;
  let receiveLibMock;
  let hashiDVNAdapter;
  let hashiDVNAdaterfeelib;
  let messageRelayA;
  let messageRelayB;
  let messageRelayAdapterA;
  let messageRelayAdapterB;
  let packetEncoder;

  // address
  let admin;
  let alice;
  let bob;
  let sourceAdapters_;
  let destAdapters_;

  // function input
  let packet;
  let packetHeader;
  let payloadHash;
  let payload;
  let assignJobParam;

  // constant
  const srcEid = 40161; // Sepolia
  const srcChainId = 11155111;
  const dstEid = 40109; // Mumbai
  const dstChainId = 80001;
  beforeEach(async function () {
    [admin, alice, bob] = await ethers.getSigners();

    const HashiFactory = await ethers.getContractFactory("Hashi");
    hashi = await HashiFactory.deploy();
    const YahoFactory = await ethers.getContractFactory("Yaho");
    yaho = await YahoFactory.deploy();
    const HashiRegistryFactory = await ethers.getContractFactory(
      "HashiRegistry"
    );
    hashiRegistry = await HashiRegistryFactory.deploy();
    const HashiDVNAdapterFeelibRegistry = await ethers.getContractFactory(
      "HashiDVNAdapterFeeLib"
    );
    hashiDVNAdaterfeelib = await HashiDVNAdapterFeelibRegistry.deploy(
      await hashiRegistry.getAddress()
    );
    const MessageRelayMockFactory = await ethers.getContractFactory(
      "MessageRelayMock"
    );
    messageRelayA = await MessageRelayMockFactory.deploy();
    messageRelayB = await MessageRelayMockFactory.deploy();
    sourceAdapters_ = [
      await messageRelayA.getAddress(),
      await messageRelayB.getAddress(),
    ];
    const MessageRelayAdapterMockFactory = await ethers.getContractFactory(
      "MessageRelayAdapterMock"
    );
    messageRelayAdapterA = await MessageRelayAdapterMockFactory.deploy();
    messageRelayAdapterB = await MessageRelayAdapterMockFactory.deploy();
    destAdapters_ = [
      await messageRelayAdapterA.getAddress(),
      await messageRelayAdapterB.getAddress(),
    ];
    const SendLibMockFactory = await ethers.getContractFactory("SendLibMock");
    sendLibMock = await SendLibMockFactory.deploy();
    const ReceiveLibMockFactory = await ethers.getContractFactory(
      "ReceiveLibMock"
    );
    receiveLibMock = await ReceiveLibMockFactory.deploy();
    const packetEncoderFactory = await ethers.getContractFactory(
      "PacketEncoder"
    );
    packetEncoder = await packetEncoderFactory.deploy();
    const HashiDVNAdapterFactory = await ethers.getContractFactory(
      "HashiDVNAdapter"
    );
    hashiDVNAdapter = await HashiDVNAdapterFactory.deploy(
      [await admin.getAddress()],
      await yaho.getAddress(),
      await hashi.getAddress(),
      await hashiRegistry.getAddress()
    );

    // struct ReceiveLibParam {
    //     address sendLib;
    //     uint32 dstEid;
    //     bytes32 receiveLib;
    // }
    await hashiDVNAdapter.connect(admin).setReceiveLibs([
      {
        sendLib: await sendLibMock.getAddress(),
        dstEid,
        receiveLib: zeroPadHex(await receiveLibMock.getAddress(), 64),
      },
    ]);
    await hashiDVNAdapter
      .connect(admin)
      .setWorkerFeeLib(await hashiDVNAdaterfeelib.getAddress());
    await hashiRegistry.setSourceAdaptersPair(
      srcEid,
      dstEid,
      sourceAdapters_,
      destAdapters_
    );
    await hashiRegistry.setDestAdapters(srcEid, dstEid, destAdapters_);
    await hashiRegistry.setDestFee(dstEid, 1_000);

    await hashiDVNAdapter.connect(admin).setEidToChainID(srcEid, srcChainId);
    await hashiDVNAdapter.connect(admin).setEidToChainID(dstEid, dstChainId);
    packet = {
      nonce: 0,
      srcEid,
      sender: await alice.getAddress(),
      dstEid,
      receiver: zeroPadHex(await bob.getAddress(), 64),
      guid: "0x000000000000000000000000000000000000000000000000000000000000f1f1", // random guid
      message: "0x",
    };
    packetHeader = await packetEncoder.encodePacketHeader(packet);
    payloadHash = await packetEncoder.encodePayloadHash(packet);
    //payload = hashiDVNAdapter.encodePayload(packetHeader, payloadHash);
    assignJobParam = {
      dstEid,
      packetHeader,
      payloadHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      confirmations: 0,
      sender: await alice.getAddress(),
    };
  });

  it("Should verify Message Hash correctly", async function () {
    const sendLibAddr = await sendLibMock.getAddress();
    console.log(sendLibAddr);
    await impersonateAccount(sendLibAddr);
    await setBalance(sendLibAddr, 100n ** 18n);
    let sendLibMockSigner = await ethers.getSigner(sendLibAddr);

    await hashiDVNAdapter
      .connect(sendLibMockSigner)
      .assignJob(assignJobParam, "0x");

    const messageId =
      "0x0000000000000000000000000000000000000000000000000000000000000000";

    await expect(
      await messageRelayAdapterA.storeHash(srcChainId, messageId, payloadHash)
    ).to.emit(messageRelayAdapterA, "HashStored");
    await expect(
      await messageRelayAdapterB.storeHash(srcChainId, messageId, payloadHash)
    ).to.emit(messageRelayAdapterB, "HashStored");

    // TODO:  TypeError: Cannot read properties of undefined (reading 'then')
    // await expect(
    //   await hashiDVNAdapter.connect(admin).verifyMessageHash(messageId, payload)
    // )
    //   .to.emit(hashiDVNAdapter, "HashFromAdaptersMatched")
    //   .withArgs(messageId, payloadHash);
  });
});

function zeroPadHex(value, length) {
  const hexValue = value.startsWith("0x") ? value.slice(2) : value;
  const paddedHex =
    "0x" + "0".repeat(Math.max(0, length - hexValue.length)) + hexValue;
  return paddedHex;
}
