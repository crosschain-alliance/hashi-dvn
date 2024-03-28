const { DVNEventListener } = require("./listener/eventListener");
const { HashiDVNSender } = require("./sender/hashiDVNSender");
const { ViemClient } = require("./client/viemClient");

async function main() {
  const sourceChain = process.env.SOURCE_CHAIN;
  const destChain = process.env.DESTINATION_CHAIN;

  const viemClient = new ViemClient(`0x${process.env.PRIV_KEY}`);

  const dvnEventListener = new DVNEventListener(
    viemClient,
    sourceChain,
    destChain,
  );
  await dvnEventListener.start();
  const hashiDVNSender = new HashiDVNSender(
    viemClient,
    destChain,
    dvnEventListener,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
