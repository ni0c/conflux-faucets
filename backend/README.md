# Faucets transaction backend for Conflux Core Space and Conflux eSpace

This is the transaction backend for Conflux Faucets in both Core Space and eSpace:

* Transaction maker for Core Space
* Transaction maker for eSpace

## Bootstrap

Clone the code, and install the dependencies with npm

```sh
$ git clone https://github.com/ni0c/conflux-faucets.git
$ cd backend
$ npm install
```

## CLI

There is a CLI program in `bin`, which can used to send transactions in Conflux Core Space and eSpace.

First you need create a `.env` from it's template `.env.example` and set the `CORE_RPC_URL`, `ESPACE_RPC_URL`, `CORE_NETWORK_ID`, `ESPACE_NETWORK_ID`, `CORE_PRIVATE_KEY`, `ESPACE_PRIVATE_KEY` and make sure the `CORE_PRIVATE_KEY` and `ESPACE_PRIVATE_KEY` addresses have enough CFX in their wallets (0.5 CFX min. needed). 

```sh
Usage: node tx_maker.js [options] [network] [command]


Options:
  -v, --version                      output the version number
  -d, --debug                        output extra debugging
  -h, --help                         display help for command

Networks:
  core                               Conflux Core Space network selection
  espace                             Conflux eSpace network selection

Commands:
  send [address]                     Send 0.0025 CFX to given ADDRESS 
  help [command]                     display help for command
```



