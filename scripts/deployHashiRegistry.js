const hre = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  const hashiRegistry = await hre.ethers.deployContract(
    "HashiRegistry",
    [],
    owner,
  );

  await hashiRegistry.waitForDeployment();

  console.log(
    `Hashi Registry deployed to ${await hashiRegistry.getAddress()} on  ${
      hre.network.name
    }`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
