const { MessageRelayedEventListener, DVNEventListener } = require('./EventListener');
const { HashiDVNSender } = require('./HashiDVNSender');
const { ViemClient } = require('./viemClient');
const { chainConfig } = require('../config');
const { gnosis, optimism } = require('viem/chains');

const { createWalletClient, http, publicActions } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

async function main(){
 

    const sourceChain = "gnosis";
    const destChain = "optimism";

    const viemClient = new ViemClient(`0x${process.env.DEPLOYER_PRIV_KEY}`);

    const messageRelayedEventListener = new MessageRelayedEventListener(viemClient, sourceChain, destChain );
    const stopMessageRelay = messageRelayedEventListener.start();
    const DVNEventListener = new DVNEventListener(viemClient, sourceChain, destChain);
    const stopDVN = DVNEventListener.start();
    const hashiDVNSender = new HashiDVNSender(viemClient, destChain);
    hashiDVNSender.addEvent(messageRelayedEventListener.getMessageIdsAndHash, DVNEventListener.getPackets);
    hashiDVNSender.start();

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  

