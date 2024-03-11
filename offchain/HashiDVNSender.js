

const { abi: HashiDVNAdapterABI } = require('./abi/HashiDVNAdapter.json');

class HashiDVNSender {

    constructor(viemClient, destChain){ 
        this.viemClient = viemClient;
        this.destChain = destChain;

    }

    addEvent(hashiMessageRelayEvent, DVNEvent){
        this.hashiMessageRelayEvent = hashiMessageRelayEvent;
        // [{
        //     id, messageHash
        // }]
        this.DVNEvent = DVNEvent;
        // [{
        //     packet, packetHeader, payloadHash
        // }]  
    }

    async start() {
        
        const destAddresses = this.viemClient.getAddress(this.destChain)
        const destChainClient = this.viemClient.getClient(this.destChain)


        for(let i =0; i= this.DVNEvent.length; i++){
            for(let j =0; j= this.hashiMessageRelayEvent.length; j++){
                if(this.DVNEvent[i]["payloadHash"]== this.hashiMessageRelayEvent[j]["messageHash"]){
                    console.log("matching message Found");
                    const writestoreHash = await destChainClient.simulateContract({
                        account,
                        address: destAddresses.hashiDVNAdapter,
                        abi: HashiDVNAdapterABI,
                        // storeHash(uint256 domain, uint256 id, bytes32 hash) 
                        functionName: 'verifyMessageHash',
                        args: [this.hashiMessageRelayEvent[j]["id"],this.DVNEvent[i]["packet"]]
                    })
                    const tx = await destChainClient.writeContract(writestoreHash)
                    console.log(`verifyMessageHash called ${tx}`)

                    // delete the event
                    this.DVNEvent.splice(i,1);
                    this.hashiMessageRelayEvent.splice(j,1)
                }

            }
           
        }
    }
}


exports.HashiDVNSender = HashiDVNSender;