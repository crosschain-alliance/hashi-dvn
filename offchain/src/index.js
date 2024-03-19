const { MessageRelayedEventListener, DVNEventListener } = require('./EventListener');
const { HashiDVNSender } = require('./HashiDVNSender');
const { ViemClient } = require('./ViemClient');

async function main(){
 

    const sourceChain = "localhost";
    const destChain = "optimism";

    const viemClient = new ViemClient(`0x${process.env.DEPLOYER_PRIV_KEY}`);

    const messageRelayedEventListener = new MessageRelayedEventListener(viemClient, sourceChain, destChain );
    const stopMessageRelay = await messageRelayedEventListener.start();
    const dvnEventListener = new DVNEventListener(viemClient, sourceChain, destChain);
    const stopDVN = await dvnEventListener.start();
    const hashiDVNSender = new HashiDVNSender(viemClient, destChain, messageRelayedEventListener, dvnEventListener);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  

