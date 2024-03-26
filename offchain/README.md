# Hashi DVN offchain logic 
This is not production ready! It only for demonstration purpose!

Hashi DVN offchain logic enable the message passing and verification between two blockhains. 

1. Mock Hashi Adapter (MockMessageRelay & MockMessageRelayAdapter)
2. Mock Executor (inspired by [zexecutor](https://github.com/0xpaladinsecurity/zexecutor)) (TODO)
3. Hashi DVN server(offchain)


## Mock Hashi Adapter (MockMessageRelay & MockMessageRelayAdapter)
1. Passing the message hash from source chain to destination chain. Hashi Adapters are registered in HashiRegistry.

## Hashi DVN (offchain)
1. Listen to `PacketSent` and `DVNFeePaid` events from LayerZeroV2 contracts.
2. Listen to `MessageRelayed` event from Hashi's Message Relay contract.
3. Process the log, call HashiDVNAdapter.sol on destination chain to verify the message.

### Mock Executor (TODO)
1. Listen to `PacketSent` and `ExecutorFeePaid` events from LayerZeroV2 contracts.
2. Check if the payload has been verified on destination chain and execute the payload on behalf of sender.

# Dev
## Setup
1. On root, run `yarn install`.
2. Config the networks detail in `hardhat.config.js`.
3. Deploy contracts on both chains.
    1. `npx hardhat run scripts/deployToSource.js --network <SourceChain>`
    2. `npx hardhat run scripts/deployToDestination.js --network <DestinationChain>`
    3. `npx hardhat run scripts/initializeSource.js --network <SourceChain>`
    4. `npx hardhat run scripts/initializeDestination.js --network <DestinationChain>`
4. After deployment, the deployment addresses will be written into `config.js` file.

## Run the off chain logic
1. Run `node offchain/src/index.js`
