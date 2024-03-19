const { gnosis, optimism } = require('viem/chains');

const { createWalletClient, http, publicActions } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { chainConfig } = require("../../config");


class ViemClient {

    constructor(privateKey){
        this.account = privateKeyToAccount(privateKey);

    }



    getAddress(chainName){

        switch(chainName){
            case "gnosis":
                return chainConfig.chainAddress.gnosis;
            case "optimism":
                return chainConfig.chainAddress.optimism;
            case "localhost":
                // for testing only
                return chainConfig.chainAddress.gnosis;

        }

    }


    getClient(chainName){
        switch(chainName){
            case "gnosis": 
                return createWalletClient({
                    account: this.account,
                    chain: gnosis,
                    transport: http()
                }).extend(publicActions)
            case "optimism":
                return createWalletClient({
                    account: this.account,
                    chain: optimism,
                    transport: http("https://127.0.0.1:8545")
                }).extend(publicActions)          
            case "localhost":
                return createWalletClient({
                    account: this.account,
                    chain: gnosis,
                    transport: http("https://127.0.0.1:8545")
                }).extend(publicActions)
        }
    }

}


module.exports = {ViemClient};