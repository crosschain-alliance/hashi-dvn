const { Options } = require("@layerzerolabs/lz-v2-utilities");
require("dotenv").config();
const hre = require("hardhat");
const { chainConfig } = require("../config");

const main = async () => {
  const [owner] = await ethers.getSigners();
  const sourceChainAdress = chainConfig.chainAddress.ethereum;
  const destChainAddress = chainConfig.chainAddress.gnosis;
  const sourceEid = sourceChainAdress.endpointId;
  const dstEid = destChainAddress.endpointId;

  const _options = Options.newOptions()
    .addExecutorLzReceiveOption(2000000, 0)
    .toHex();

  const oApp = await hre.ethers.getContractAt(
    "MockOapp",
    sourceChainAdress.oapp,
    owner,
  );

  const message = "0x5c36b186" // sample function call 
  const tx = await oApp.send(dstEid, message, _options, { value: 200000 });
  const receipt = await tx.wait();
  console.log(`Message sent ${receipt} on ${hre.network.name}`);
};
main();
