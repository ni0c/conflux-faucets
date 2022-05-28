#!/usr/bin/env node
/* eslint-disable no-unused-vars */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prettier/prettier */

const {ethers} = require('ethers');
const {Conflux, Drip, format} = require('js-conflux-sdk');
const {program} = require("commander");

require('dotenv').config();

const coreCfxAmount = 0.0025;
const coreGasPrice = 5000;
const espaceCfxAmount = '0.0025';

let debug = false;
let dbgArr = [];

const startDate = new Date().toString();
const startTime = Date.now();

let conflux, 
account, 
balance, 
status,
receipt,
wallet,
provider,
txHash = null;


// Functions

function dbgLog(...str) {

  dbgArr.push([...str]);

  if (debug) {
    console.log(...str);
  }
}

const dbgLogger = {
  log: function(...str) {
    dbgLog(...str);
  },
  info: function(...str) {
    dbgLog(...str);
  },
  error: function(...str) {
    dbgLog(...str);
  }
}

function strOut(obj) {
  console.log(JSON.stringify(obj));
}

function runtime() {
  return Math.floor((Date.now() - startTime) / 100) / 10;
}


// main

program.version("1.0.0");
program.option('-d, --debug', 'Turn debug on');


program
  .command('core send [address]')
  .action(async (_type, address) => {
 
    const receiver = address;

    try {

      const _opts = program.opts();
      if (_opts.debug) {
        debug = true;
      }

      // console.log("debug", debug);

      conflux = new Conflux({
        url: process.env.CORE_RPC_URL,
        networkId: parseInt(process.env.CORE_NETWORK_ID),
        logger: dbgLogger,
      });

      dbgLog({"providerOk": !!conflux});
           
      if (process.env.CORE_PRIVATE_KEY) {
        account = conflux.wallet.addPrivateKey(process.env.CORE_PRIVATE_KEY);
      } else
      {
        strOut({
          'start': startDate,
          'success': false,
          'network': 'core',
          'error': "no private key for core",
        });
        return;
      }
    
      dbgLog({"accountOk": !!account});

      const _balance = await conflux.getBalance(account.address);
      balance = Drip(_balance).toCFX();

      let _balanceOk = !(!balance || balance < (coreCfxAmount*5));

      dbgLog({"balanceOk": _balanceOk});

      if (!_balanceOk)
      {
        // abort
        strOut({
	        'start': startDate,
          'success': false,
          'runtime': runtime(),
          'network': 'core',
          'amount': coreCfxAmount,
          'receiver': receiver,
          'balance': balance,
          'error': 'not enough balance',
          'debug': dbgArr,
        });
        return;
      }

      const _tx = {
        from: account.address,
        to: receiver, 
        value: Drip.fromCFX(coreCfxAmount), 
        gasPrice: coreGasPrice,
      };
      dbgLog({"tx": _tx});

      txHash = await conflux.cfx.sendTransaction(_tx);
    
      dbgLog({"hash": txHash});

      receipt = await conflux.cfx.getTransactionReceipt(txHash);
      dbgLog({"receipt": receipt});

      status = (receipt === null);
      
      strOut({
        'start': startDate,
        'success': status,
        'runtime': runtime(),
        'network': 'core',
        'amount': coreCfxAmount,
        'receiver': receiver,
        'hash': txHash,
        'balance': balance,
      });

    } catch (e) {
      strOut({
        'start': startDate,
        'success': false,
        'runtime': runtime(),
        'network': 'core',
        'amount': coreCfxAmount,
        'receiver': receiver,
        'error': e,
        'debug': dbgArr,
      });
    }

});

program
  .command('espace send [address]')
  .action(async (_type, address) => {

    const _opts = program.opts();
    if (_opts.debug) {
      debug = true;
    }

    //console.log("debug", debug);

    const receiver = address;

    try {

      provider = new ethers.providers.JsonRpcProvider(process.env.ESPACE_RPC_URL);

      dbgLog({"providerOk": !!provider});

      try {
        ethers.utils.getAddress(receiver);
      } catch (e) {
        dbgLog({"addressOk": false});
        strOut({
	        'start': startDate,
          'success': false,
          'runtime': runtime(),
          'network': 'espace',
          'amount': espaceCfxAmount,
          'receiver': receiver,
          'balance': balance,
          'isAddressValid': false,
          'error': e,
          'debug': dbgArr,
        });
        return;
      }   

      dbgLog({"addressOk": true});

      if (process.env.ESPACE_PRIVATE_KEY)
      {
        wallet = new ethers.Wallet(process.env.ESPACE_PRIVATE_KEY, provider);
      } else
      {
        strOut({
          'start': startDate,
          'success': false,
          'network': 'espace',
          'error': "no private key for espace",
        });
        return;
      }
      
      dbgLog({"walletOk": !!wallet});

      const _balance = await provider.getBalance(wallet.address)
      balance = ethers.utils.formatEther(_balance);

      const _balanceOk = !(!balance || (balance < (espaceCfxAmount*5)));
      dbgLog({"balanceOk": _balanceOk});

      if (!_balanceOk)
      {
        // abort
        strOut({
	        'start': startDate,
          'success': false,
          'runtime': runtime(),
          'network': 'espace',
          'amount': espaceCfxAmount,
          'receiver': receiver,
          'balance': balance,
          'balanceOk': false,
          'debug': dbgArr,
        });
        return;
      }

      const gasprice = await provider.getGasPrice();
      dbgLog({"gasPrice": gasprice});

      const nonce = await provider.getTransactionCount(wallet.address, 'latest');
      dbgLog({"nonce": nonce});

      const gaslimit = ethers.utils.hexlify(21000);
      dbgLog({"gasLimit": gaslimit});

      const _ttx = {
        from: wallet.address,
        to: receiver,
        value: ethers.utils.parseEther(espaceCfxAmount),
        gasPrice: gasprice,
        gasLimit: gaslimit,
        nonce: nonce,
      };
      dbgLog({"tx": _ttx});

      const tx = await wallet.sendTransaction(_ttx);

      const txHash = tx.hash;
      dbgLog({"hash": txHash});

      const receipt = await provider.getTransactionReceipt(txHash);
      dbgLog({"receipt": receipt});
      const status = (receipt === null);
      
      if (status)
      {
        strOut({
	        'start': startDate,
          'success': status,
          'runtime': runtime(),
          'network': 'espace',
          'amount': espaceCfxAmount,
          'receiver': receiver,
          'hash': txHash,
          'balance': balance,
        });
      } else
      {
        strOut({
	        'start': startDate,
          'success': status,
          'runtime': runtime(),
          'network': 'espace',
          'amount': espaceCfxAmount,
          'receiver': receiver,
          'error': 'error tx receipt',
          'debug': dbgArr,
        });
      }
      
    
    } catch (e) {
      // fail
      strOut({
        'start': startDate,
        'success': false,
        'runtime': runtime(),
        'network': 'espace',
        'amount': espaceCfxAmount,
        'receiver': receiver,
        'error': e,
        'debug': dbgArr,
      });
      return;
    }

});

program.parse(process.argv);