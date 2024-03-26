const {
  MessageRelayedEventListener,
  DVNEventListener,
} = require("./listener/EventListener");
const { HashiDVNSender } = require("./sender/HashiDVNSender");
const { ViemClient } = require("./client/ViemClient");

async function main() {
  const sourceChain = "localhosteth";
  const destChain = "localhostgno";

  const viemClient = new ViemClient(`0x${process.env.DEPLOYER_PRIV_KEY}`);

  const messageRelayedEventListener = new MessageRelayedEventListener(
    viemClient,
    sourceChain,
    destChain,
  );
  const stopMessageRelay = await messageRelayedEventListener.start();
  const dvnEventListener = new DVNEventListener(
    viemClient,
    sourceChain,
    destChain,
  );
  const stopDVN = await dvnEventListener.start();
  const hashiDVNSender = new HashiDVNSender(
    viemClient,
    sourceChain,
    destChain,
    messageRelayedEventListener,
    dvnEventListener,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
