# Hashi DVN offchain logic 

Hashi DVN offchain logic enable the message passing and verification between two blockhains. 

1. Mock Hashi Adapter
2. Mock Executor (inspired by [zexecutor](https://github.com/0xpaladinsecurity/zexecutor))
3. Hashi DVN (offchain)


## Mock Hashi Adapter
1. Passing the message hash from source chain to destination chain. Hashi Adapters are registered in HashiRegistry.

## Mock Executor
1. Listen to `PacketSent` and `ExecutorPaid` events.
2. Process the log and call execute on destination chain.

## Hashi DVN (offchain)
1. Listen to `PacketSent` and `DVNFeePaid` events from LayerZeroV2 contracts.
2. Listen to `MessageDispatched` event from Hashi's Yaho contract.
3. Process the log, call HashiDVNAdapter.sol on destination chain to verify the message.

