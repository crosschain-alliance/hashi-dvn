# Hashi DVN offchain logic 

Hashi DVN offchain logic enable the message passing and verification between two blockhains. 


## Hashi DVN (offchain)
1. Listen to `PacketSent` and `DVNFeePaid` events from LayerZeroV2 contracts.
3. Process the log, call HashiDVNAdapter.verifyMessageHash on destination chain to verify the message.

## Hashi Adapter (Optional)
1. Passing the messageId and message hash from source chain to destination chain. Hashi Adapters are registered in HashiRegistry contract.
2. For testing purpose, run the mock relayer in `src/mockRelayer/hashiRelayerMock.js`. In production, it should be the bridges that has integrated with [Hashi Adapter](https://crosschain-alliance.gitbook.io/hashi/v0.1/deployment). 

## Off chain logic folders
1. `src/client/`: Viem client
2. `src/listener/`: DVN-related events listener
3. `src/mockRelayer`: (optional) mock hashi relayer for testing
4. `src/sender/`: Hashi DVN sender on destination chain
5. `abi/`: ABI of the contracts
. 
# Dev
## Setup
1. On root, run `yarn install`.
2. Config the networks detail in `hardhat.config.js`, configure the env variable in `.env`.
3. Deploy contracts on both chains.
    1. `npx hardhat run scripts/deployToSource.js --network $SOURCE_CHAIN`
    2. `npx hardhat run scripts/deployToDestination.js --network $DESTINATION_CHAIN`
    3. `npx hardhat run scripts/initializeSource.js --network $SOURCE_CHAIN`
    4. `npx hardhat run scripts/initializeDestination.js --network $DESTINATION_CHAIN`
4. After deployment, the deployment addresses will be written into `config.js` file.

## Run the off chain logic
1. Run `cd offchain && yarn install && node offchain/src/index.js`
2. (For Testing): for testing, you may run mock relayer to store hash on destination chain: `node offchain/src/mockRelayer/hashiRelayerMock.js`
3. (For Testing): Send sample message by running `npx hardhat run scripts/sendMessage.js --network $SOURCE_CHAIN`.
