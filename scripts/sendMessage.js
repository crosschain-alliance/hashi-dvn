const { Options } = require("@layerzerolabs/lz-v2-utilities");
require("dotenv").config();
const hre = require("hardhat");
const { chainConfig } = require("../config");

const main = async () => {
  const [owner] = await ethers.getSigners();
  const sourceChainAdress = chainConfig.chainAddress.sepolia;
  const destChainAddress = chainConfig.chainAddress.mumbai;
  const sourceEid = sourceChainAdress.endpointId;
  const dstEid = destChainAddress.endpointId;

  const _options = Options.newOptions()
    .addExecutorLzReceiveOption(200000, 0)
    .toHex();

    console.log("oapp ", sourceChainAdress.oapp)
    console.log(_options)
    const oApp = await hre.ethers.getContractAt(
    "MockOapp",
    sourceChainAdress.oapp,
    owner,
  );

  const message = "0x5c36b186" // sample function call 
  const tx = await oApp.send(dstEid, message, _options, { value: 200000 });
  console.log(tx)
  const receipt = await tx.wait();
  console.log(`Message sent ${receipt.hash} on ${hre.network.name}`);
};
main();
