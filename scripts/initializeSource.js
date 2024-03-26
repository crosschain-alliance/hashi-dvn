const hre = require("hardhat");
const { chainConfig } = require("../config");

async function initializeSource() {
  const [owner] = await ethers.getSigners();
  const sourceChainAddress = chainConfig.chainAddress.ethereum;
  const destChainAddress = chainConfig.chainAddress.gnosis;
  const sourceEid = sourceChainAddress.endpointId;
  const dstEid = destChainAddress.endpointId;

  const hashiDVN = await hre.ethers.getContractAt(
    "HashiDVNAdapter",
    sourceChainAddress.hashiDVNAdapter,
    owner,
  );
  const setReceiveLibs = await hashiDVN.setReceiveLibs([
    [
      sourceChainAddress.send302,
      dstEid,
      zeroPadHex(destChainAddress.receive302, 64),
    ],
  ]);
  console.log("Set ReceiveLib for HashiDVNAdapter ", setReceiveLibs.hash);
  const sourceEidToChainID = await hashiDVN.setEidToChainID(
    sourceChainAddress.endpointId,
    sourceChainAddress.chainId,
  );
  const destEidToChainID = await hashiDVN.setEidToChainID(
    destChainAddress.endpointId,
    destChainAddress.chainId,
  );

  const setWorkerFeelib = await hashiDVN.setWorkerFeeLib(
    sourceChainAddress.hashiDVNFeeLib,
  );
  console.log("Workfer fee lib set ", setWorkerFeelib.hash);

  const hashiRegistry = await hre.ethers.getContractAt(
    "HashiRegistry",
    sourceChainAddress.hashiRegistry,
    owner,
  );
  const setDestAdaptersPair = await hashiRegistry.setDestAdapters(
    dstEid,
    sourceEid,
    [sourceChainAddress.messageAdapter],
  );
  console.log("destination adapters pair set ", setDestAdaptersPair.hash);

  const setSourceAdaptersPair = await hashiRegistry.setSourceAdaptersPair(
    sourceEid,
    dstEid,
    [sourceChainAddress.messageRelay],
    [destChainAddress.messageAdapter],
  );
  console.log("SourceAdaptersPair set ", setSourceAdaptersPair.hash);

  const setDestFee = await hashiRegistry.setDestFee(dstEid, 0);
  console.log("Dest Fee set ", setDestFee.hash);

  const oApp = await hre.ethers.getContractAt(
    "MockOapp",
    sourceChainAddress.oapp,
    owner,
  );
  const setPeer = await oApp.setPeer(
    dstEid,
    zeroPadHex(destChainAddress.oapp, 64),
  );
  console.log("set Peer for Oapp ", setPeer.hash);
}

initializeSource().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function zeroPadHex(value, length) {
  const hexValue = value.startsWith("0x") ? value.slice(2) : value;
  const paddedHex =
    "0x" + "0".repeat(Math.max(0, length - hexValue.length)) + hexValue;
  return paddedHex;
}

exports.initializeSource = initializeSource;
