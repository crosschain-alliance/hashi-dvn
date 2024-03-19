const { parseEventLogs } = require('viem');
const { abi: MessageRelayABI } = require('../abi/MockMessageRelay.json');
const { abi: MessageRelayAdapterABI } = require('../abi/MockMessageRelayAdapter.json')
const { abi: EndpointV2ABI } = require('../abi/EndpointV2.json');
const {PacketSerializer} = require('./utils/encoding');
require("dotenv").config();

class MessageRelayedEventListener {

    constructor(viemClient, sourceChain, destChain){
        this.viemClient = viemClient;
        this.unwatch = null;
        this.sourceChain = sourceChain;
        this.destChain = destChain
        this.messageRelayedIds = [];
        this.messageRelayedIdsAndHash = [];
    }

    async start() {

    
        const sourceAddresses = this.viemClient.getAddress(this.sourceChain)
        const destAddresses = this.viemClient.getAddress(this.destChain)
        const sourceChainClient = this.viemClient.getClient(this.sourceChain)
    
        const destChainClient = this.viemClient.getClient(this.destChain)
        console.log("listening ",sourceAddresses.mockMessageRelay)
        this.unwatch = sourceChainClient.watchContractEvent({
            address: sourceAddresses.mockMessageRelay,
            abi: MessageRelayABI,
            event: 'MessageRelayed',
            onLogs: logs => {
                console.log("new MessageRelayed event ", logs)
                this.messageRelayedIds.push(logs.topics[2])
                
            }// get message Id from messageRelayed event
        })

        for(let i = 0; i<this.messageRelayedIds.length; i++){
            const messageHash = await destChainClient.readContract({
                address: sourceAddresses.yaho,
                abi: YahoABI,
                functionName: 'hashes',
                args: [id]
            })
            const writestoreHash = await destChainClient.simulateContract({
                account,
                address: destAddresses.mockMessageAdapter,
                abi: MessageRelayAdapterABI,
                // storeHash(uint256 domain, uint256 id, bytes32 hash) 
                functionName: 'storeHash',
                args: [sourceChainClient.getChainId(this.sourceChain),this.messageRelayedIds[i],messageHash]
            })
            const tx = await destChainClient.writeContract(writestoreHash)
            MessageRelayedIdAndHash.push({
                'id': this.messageRelayedIds[i],
                'messageHash': messageHash
            })
            console.log(`Successfully store hash on ${this.destChain}, tx: ${tx}`)
        }
 
        this.handleCallback();
    
        return this.stop.bind(this);
    }

    handleCallback(){

    }


    stop() {
        if (this.unwatch) {
            this.unwatch(); // Stop watching the contract event
        }

        console.log('Event listener stopped.');
    }

    

}

class DVNEventListener {
    constructor(viemClient, sourceChain, destChain){
        this.viemClient = viemClient;
        this.unwatch = null;
        this.sourceChain = sourceChain;
        this.destChain = destChain
        this.packets = []

    }

    async start(){

        const sourceAddresses = this.viemClient.getAddress(this.sourceChain)
        const sourceChainClient = this.viemClient.getClient(this.sourceChain)

        this.unwatch = sourceChainClient.watchContractEvent({
            address: sourceAddresses.endpoint,
            abi: EndpointV2ABI,
            event: 'PacketSent',
           // event PacketSent(bytes encodedPayload, bytes options, address sendLibrary);
            onLogs: logs => { processLogs(logs) }

            })
        this.handleCallback();

    }



    async processLogs(log){
        console.log("new PacketSent event ", log);

        
        // get all the logs from this transaction
            
        const transaction = await sourceChainClient.getTransactionReceipt({ 
            hash: logs.transactionHash
        })
        console.log(`Checking transaction from Endpoint: ${logs.transactionHash}`)

        const logs = parseEventLogs({ 
            abi: EndpointV2ABI, 
            logs: transaction.logs,
            })

        for(let i=0; i<logs.length; i++){
            let isHashiDVNAssigned = false;
       

            if(logs[i].eventName=='DVNFeePaid'){

                for(let i = 0; i<logs[i].args.requiredDVNs.length; i++){
                    if (requiredDVNs[i]== sourceAddresses.hashiDVNAdapter){
                        console.log("Hashi DVN Adapter fee paid")
                        isHashiDVNAssigned = true;
                        break;
                    }
                }
                for(let i = 0; i<logs[i].args.optionalDVNs.length; i++){
                    if (requiredDVNs[i]== sourceAddresses.hashiDVNAdapter){
                        console.log("Hashi DVN Adapter fee paid")
                        isHashiDVNAssigned = true
                        break;
                    }
                }
            }

            if(logs[i].eventName=='PacketSent' && isHashiDVNAssigned){
                console.log("Hashi is assigned")
                const encodedPayload = logs[i].args.encodedPayload;
                console.log(`New Packet Sent event with encodedPayload ${encodedPayload}`)
                const packet = PacketSerializer.deserialize(encodedPayload);
                const packetHeader = PacketSerializer.getHeader(encodedPayload);
                const payloadHash = PacketSerializer.getPayloadHash(encodedPayload);
                this.packets.push({
                    "packet" : packet,
                    "packetHeader": packetHeader,
                    "payloadHash" : payloadHash
                    
                });

            }

        }
    

    }

    
    handleCallback(){

    }

    stop(){
        if (this.unwatch) {
            this.unwatch(); // Stop watching the contract event
        }

        console.log('Event listener stopped.');
    }

}

module.exports = {MessageRelayedEventListener, DVNEventListener}

