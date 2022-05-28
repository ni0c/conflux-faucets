#!/usr/bin/env node
/* eslint-disable no-unused-vars */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable prettier/prettier */

const {ethers} = require('ethers');
const {Conflux, Drip, format} = require('js-conflux-sdk');
const {program} = require("commander");

require('dotenv').config();

const coreBalanceLimit = 0.5;
const espaceBalanceLimit = 0.5;


let debug = false;
let dbgArr = [];

const startDate = new Date().toString();
const startTime = Date.now();


let conflux, 
account, 
balance, 
wallet,
provider;

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
  .command('core')
  .action(async () => {
 
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

      let _balanceOk = !!balance;

      dbgLog({"balanceOk": _balanceOk});
			dbgLog({"balance": balance});

      if (!_balanceOk)
      {
        // abort
        strOut({
	        'start': startDate,
          'success': false,
          'runtime': runtime(),
          'network': 'core',
          'balance': balance,
          'error': 'cant get balance',
          'debug': dbgArr,
        });
        return;
      }

			let _balanceAlert = (balance < coreBalanceLimit);
			dbgLog({"balanceAlert": _balanceAlert});

			let _obj;
      try {
        _obj = await conflux.getAccountPendingTransactions(account.address);
      } catch(e) {
        strOut({
	        'start': startDate,
          'success': false,
          'runtime': runtime(),
          'network': 'core',
          'balance': balance,
          'error': 'cant get pending transactions',
					'errorobj': e,
          'debug': dbgArr,
        });
        return;
      }
	
			let pendingCount = format.uInt(_obj.pendingCount);
			dbgLog({"pendingCount": pendingCount});

			let _pendingAlert = (pendingCount>1);
			dbgLog({"pendingAlert": _pendingAlert});

			let status = (!_pendingAlert && !_balanceAlert);

      if (status) {     
        strOut({
          'start': startDate,
          'success': status,
          'runtime': runtime(),
          'network': 'core',
          'balance': balance,
          'pendingCount': pendingCount,
        });
      } else {
        strOut({
          'start': startDate,
          'success': status,
          'runtime': runtime(),
          'network': 'core',
          'balance': balance,
          'pendingCount': pendingCount,
          'error': 'status error',
          'debug': dbgArr,
        });
      }

    } catch (e) {
      strOut({
        'start': startDate,
        'success': false,
        'runtime': runtime(),
        'network': 'core',
				'error': 'error general',
        'errorobj': e,
        'debug': dbgArr,
      });
    }

});

program
  .command('espace')
  .action(async () => {

    const _opts = program.opts();
    if (_opts.debug) {
      debug = true;
    }

    //console.log("debug", debug);

    try {

      provider = new ethers.providers.JsonRpcProvider(process.env.ESPACE_RPC_URL);

      dbgLog({"providerOk": !!provider});

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
        process.exit();
        return;
      }
      
      dbgLog({"walletOk": !!wallet});

      const _balance = await provider.getBalance(wallet.address)
      balance = ethers.utils.formatEther(_balance);
			dbgLog({"balance": balance});

      const _balanceOk = !!balance;
      dbgLog({"balanceOk": _balanceOk});

      if (!_balanceOk)
      {
        // abort
        strOut({
	        'start': startDate,
          'success': false,
          'runtime': runtime(),
          'network': 'espace',
          'balance': balance,
          'balanceOk': false,
          'error': 'cant get balance',
          'debug': dbgArr,
        });
        process.exit();
        return;
      }

			let _balanceAlert = (balance < espaceBalanceLimit);
			dbgLog({"balanceAlert": _balanceAlert});

			const _address = wallet.address;
			let _pendingTxs = [];

			provider.on('pending', (tx) => {
				provider.getTransaction(tx).then(function (transaction) {
					if ((transaction != null && transaction['from'] == _address)) {
	
						//console.log(transaction);
						_pendingTxs.push(tx);
					}
				});
			});


			const checkEspaceTx = async function(tx) {	
				let _transaction = await provider.getTransaction(tx);
				if (_transaction) {
					if (_transaction.blockNumber) {
						return true;
					}
				}
				return false;
			}

			const checkESpaceTxs = async function()	{
				try {
					
					let c = 0;
          if (_pendingTxs.length > 0)
          {
            for (let _tx of _pendingTxs) {
              let _txOk = await checkEspaceTx(_tx);
              if (!_txOk)	{
                c++;
              }
            }
          }
					let _pendingAlert = (c>1);
					dbgLog({"pendingAlert": _pendingAlert});				

					let status = (!_pendingAlert && !_balanceAlert);

          if (status) {
     
            strOut({
              'start': startDate,
              'success': status,
              'runtime': runtime(),
              'network': 'espace',
              'balance': balance,
              'pendingCount': c,
            });
            process.exit();
          } else {
    
            strOut({
              'start': startDate,
              'success': status,
              'runtime': runtime(),
              'network': 'espace',
              'balance': balance,
              'pendingCount': c,
              'error': 'status error',
              'debug': dbgArr,
            });
            process.exit();
          }

				} catch(e) {
					// fail
					strOut({
						'start': startDate,
						'success': false,
						'runtime': runtime(),
						'network': 'espace',
						'error': "cant get pending transactions",
						'errorobj': e,
						'debug': dbgArr,
					});
          process.exit();
				}
			}

			/* 2 minutes later check pending txs */
			let _timer = setTimeout(async function() {
				await checkESpaceTxs();
			}, 120000); 
      
    
    } catch (e) {
      // fail
      strOut({
        'start': startDate,
        'success': false,
        'runtime': runtime(),
        'network': 'espace',
				'error': "error general",
        'errorobj': e,
        'debug': dbgArr,
      });
      process.exit();
      return;
    }

});

program.parse(process.argv);