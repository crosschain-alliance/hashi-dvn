

const { abi: HashiDVNAdapterABI } = require('../abi/HashiDVNAdapter.json');

class HashiDVNSender {

    constructor(viemClient, destChain, MessageRelayedEventListener, DVNEventListener){ 
        this.viemClient = viemClient;
        this.destChain = destChain;
        this.messageRelayedEventListener = MessageRelayedEventListener;
        this.dvnEventListener = DVNEventListener;
        this.messageRelayedEventListener.handleCallback = this.handleEventUpdate.bind(this) 
        this.dvnEventListener.handleCallback = this.handleEventUpdate.bind(this);
        this.hashiIdsAndHashArray = []; // [{id, messageHash}]
        this.dvnPacketsArray = [];      // [{packet, packetHeader, payloadHash }]  
    }



        async handleEventUpdate(){
            const destAddresses = this.viemClient.getAddress(this.destChain)
            const destChainClient = this.viemClient.getClient(this.destChain)

            this.hashiIdsAndHashArray = this.messageRelayedEventListener.messageRelayedIdsAndHash;
            this.dvnPacketsArray = this.dvnEventListener.packets;

            console.log("Handle event update...")
            for(let i =0; i= this.dvnPacketsArray.length; i++){
                for(let j =0; j= this.hashiIdsAndHashArray.length; j++){
                    if(this.dvnPacketsArray[i]["payloadHash"] == this.hashiIdsAndHashArray[j]["messageHash"]){
                        console.log("matching message Found");
                        const writestoreHash = await destChainClient.simulateContract({
                            account,
                            address: destAddresses.hashiDVNAdapter,
                            abi: HashiDVNAdapterABI,
                            // storeHash(uint256 domain, uint256 id, bytes32 hash) 
                            functionName: 'verifyMessageHash',
                            args: [this.hashiIdsAndHashArray[j]["id"],this.dvnPacketsArray[i]["packet"]]
                        })
                        const tx = await destChainClient.writeContract(writestoreHash)
                        console.log(`verifyMessageHash called ${tx}`)
    
                        // delete the event
                        this.dvnPacketsArray.splice(i,1);
                        this.hashiIdsAndHashArray.splice(j,1)
                    }
                }
            }
        }
 
}


exports.HashiDVNSender = HashiDVNSender;