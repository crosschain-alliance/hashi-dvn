const hre = require("hardhat");
const { chainConfig } = require("../config.js");
const { readFileSync, writeFileSync } = require("fs");

async function deployToDestination() {
  const [owner] = await ethers.getSigners();

  const msgFee = Array(1).fill(200000);

  const LZEndpoint = "0x1a44076050125825900e736c501f859c50fe728c"; // endpoint on every mainnet

  const sourceChainAddress = chainConfig.chainAddress.gnosis;
  const destChainAddress = chainConfig.chainAddress.ethereum;
  const sourceEid = sourceChainAddress.endpointId;
  const destEid = destChainAddress.endpointId;
  const override = true;

  if (override) {
    const yaho = await hre.ethers.deployContract("Yaho", [], owner);
    await yaho.waitForDeployment();
    console.log(`Yaho deployed to ${await yaho.getAddress()}`);

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

    const hashiDVNFeeLib = await hre.ethers.deployContract(
      "HashiDVNAdapterFeeLib",
      [await hashiRegistry.getAddress()],
      owner,
    );
    await hashiDVNFeeLib.waitForDeployment();
    console.log(
      `hashiDVNFeeLib deployed to ${await hashiDVNFeeLib.getAddress()} on  ${
        hre.network.name
      }`,
    );

    const hashi = await hre.ethers.deployContract("Hashi", [], owner);
    await hashi.waitForDeployment();
    console.log(
      `Hashi deployed to ${await hashi.getAddress()} on  ${hre.network.name}`,
    );

    const messageRelay = await hre.ethers.deployContract(
      "MessageRelayMock",
      [],
      owner,
    );
    await messageRelay.waitForDeployment();
    console.log(`Message Relay deployed to ${await messageRelay.getAddress()}`);

    const messageAdapter = await hre.ethers.deployContract(
      "MessageRelayAdapterMock",
      [],
      owner,
    );
    await messageAdapter.waitForDeployment();
    console.log(
      `Message Adapter deployed to ${await messageAdapter.getAddress()}`,
    );

    const executor = await hre.ethers.deployContract(
      "MockExecutor",
      [LZEndpoint, [destEid], msgFee],
      owner,
    );
    await executor.waitForDeployment();
    console.log(
      `Executor deployed to ${await executor.getAddress()} on  ${
        hre.network.name
      }`,
    );

    const hashiDVN = await hre.ethers.deployContract(
      "HashiDVNAdapter",
      [
        [owner.address],
        await yaho.getAddress(),
        await hashi.getAddress(),
        await hashiRegistry.getAddress(),
      ],
      owner,
    );
    await hashiDVN.waitForDeployment();
    console.log(
      `Hashi DVN Adapter deployed to ${await hashiDVN.getAddress()} on  ${
        hre.network.name
      }`,
    );

    const oApp = await hre.ethers.deployContract(
      "MockOapp",
      [LZEndpoint, await executor.getAddress(), await hashiDVN.getAddress()],
      owner,
    );
    await oApp.waitForDeployment();
    console.log(
      `Oapp deployed to ${await oApp.getAddress()} on  ${hre.network.name}`,
    );

    let updatedAddresses = {
      yaho: `${await yaho.getAddress()}`,
      hashi: `${await hashi.getAddress()}`,
      hashiRegistry: `${await hashiRegistry.getAddress()}`,
      hashiDVNAdapter: `${await hashiDVN.getAddress()}`,
      hashiDVNFeeLib: `${await hashiDVNFeeLib.getAddress()}`,
      executor: `${await executor.getAddress()}`,
      oapp: `${await oApp.getAddress()}`,
      messageRelay: `${await messageRelay.getAddress()}`,
      messageAdapter: `${await messageAdapter.getAddress()}`,
    };
    for (let key in updatedAddresses) {
      if (updatedAddresses.hasOwnProperty(key)) {
        chainConfig.chainAddress.gnosis[key] = updatedAddresses[key];
      }
    }

    writeFileSync(
      "./config.js",
      `module.exports = { chainConfig: ${JSON.stringify(chainConfig, null, 4).replace(/\"([^(\")"]+)\":/g, "$1:")}\n}`,
    );
  }

  if (!hre.network.name.includes("localhost")) {
    await hre.run("verify:verify", {
      address: await hashiRegistry.getAddress(),
    });
    console.log("Hashi Registry verified");

    await hre.run("verify:verify", {
      address: await hashiDVNFeeLib.getAddress(),
      constructorArguments: [await hashiRegistry.getAddress()],
    });
    console.log("HashiDVNFeeLib verified");

    await hre.run("verify:verify", {
      address: await messageAdapter.getAddress(),
    });
    console.log("Message adapter verified");

    await hre.run("verify:verify", {
      address: await yaho.getAddress(),
    });
    console.log("yaho verified");
    await hre.run("verify:verify", {
      address: await hashi.getAddress(),
    });
    console.log("hashi verified");

    await hre.run("verify:verify", {
      address: await hashiDVN.getAddress(),
      constructorArguments: [
        [owner.address],
        await yaho.getAddress(),
        await hashi.getAddress(),
        await hashiRegistry.getAddress(),
      ],
    });
    console.log("Hashi DVN verified");
    await hre.run("verify:verify", {
      address: await executor.getAddress(),
      constructorArguments: [gnosisEndpoint, [gnosisEid], msgFee],
    });
    console.log("executor verified");

    await hre.run("verify:verify", {
      address: await oApp.getAddress(),
      constructorArguments: [
        gnosisEndpoint,
        await executor.getAddress(),
        await hashiDVN.getAddress(),
      ],
    });
    console.log("oApp gnosis verified");
  }
}

deployToDestination().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

exports.deployToDestination = deployToDestination;
