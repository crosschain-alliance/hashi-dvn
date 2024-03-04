import {
    getContract,
    WalletClient,
    HttpTransport,
    GetContractReturnType,
    Chain,
    Log,
    publicActions,
    PublicActions,
    decodeEventLog,
    decodeAbiParameters,
  } from "viem";
  
  import { Account } from "viem/accounts";

  import { WatchContractEventOnLogsFn } from "viem/_types/actions/public/watchContractEvent";
  
  export class eventProviders {
    constructor(
        chainConfig,
        client,
    ){
        this.client = client.extend(publicActions);
        this.endpointContract = getEndpointContract(chainConfig);
    }

    getEndpointContract(chainConfig) {
        // TODO
        // return endpoint contract address
    }

  }