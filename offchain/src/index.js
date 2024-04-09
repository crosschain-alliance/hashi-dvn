const {mainnet, gnosis, sepolia, polygonMumbai} = require("viem/chains");
const { DVNEventListener } = require("./listener/EventListener");
const { HashiDVNSender } = require("./sender/HashiDVNSender");
const { Multiclient } = require("./client/Multiclient");


async function main() {
  const sourceChain = process.env.SOURCE_CHAIN;
  const destChain = process.env.DESTINATION_CHAIN;


  const chains = [
    { name: "ethereum", type: mainnet},
    { name: "gnosis" , type: gnosis},
    { name: "sepolia" , type: sepolia},
    { name: "polygonMumbai", type: polygonMumbai }
  ];
  const rpcUrls = {

    "ethereum": `${process.env.ETH_RPC_URL}`,
    "gnosis": `${process.env.GNO_RPC_URL}`,
    "sepolia": `${process.env.SEPOLIA_RPC_URL}`,
    "polygonMumbai": `${process.env.MUMBAI_RPC_URL}`
  }

  const multiclient = new Multiclient({chains,privateKey: `0x${process.env.PRIVATE_KEY}` ,rpcUrls})

  const dvnEventListener = new DVNEventListener(
    multiclient,
    sourceChain,
  );
  await dvnEventListener.start();
  const hashiDVNSender = new HashiDVNSender(
    multiclient,
    destChain,
    dvnEventListener,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
