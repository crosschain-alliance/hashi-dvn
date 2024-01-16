const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  // get hashi and yaho address: https://hashi-doc.gitbook.io/hashi/v0.1/deployment
  // or deploy it manually: https://github.com/gnosis/hashi
  const hashi = "";
  const yaho = "";
  const hashiRegistry = "";
  const admins = [""];
  const owner = "";
  // get send lib and receive lib address here: https://docs.layerzero.network/contracts/messagelib-addresses
  // default to uln 302
  const sendLib = "";
  const receiveLib = "";

  const hashiDVNAdapter = await hre.ethers.deployContract(
    "HashiDVNAdapter",
    [sendLib, receiveLib, admins, yaho, hashi, hashiRegistry, owner],
    deployer
  );

  await hashiDVNAdapter.waitForDeployment();

  console.log(
    `Hashi DVN Adapter deployed to ${await hashiRegistry.getAddress()} on  ${
      hre.network.name
    }`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
