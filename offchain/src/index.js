const { DVNEventListener } = require("./listener/EventListener");
const { HashiDVNSender } = require("./sender/HashiDVNSender");
const { ViemClient } = require("./client/ViemClient");

async function main() {
  const sourceChain = process.env.SOURCE_CHAIN;
  const destChain = process.env.DESTINATION_CHAIN;

  const viemClient = new ViemClient(`0x${process.env.PRIV_KEY}`);

  const dvnEventListener = new DVNEventListener(
    viemClient,
    sourceChain,
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
