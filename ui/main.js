const CORE_MAIN_NET = {
  url: 'https://main.confluxrpc.com',
  networkId: 1029,
  scan: 'https://confluxscan.io',
};

const ESPACE_MAIN_NET = {
  url: 'https://evm.confluxrpc.com',
  networkId: 1030,
  scan: 'https://evm.confluxscan.io',
};

let currentChainId = CORE_MAIN_NET.networkId;
let scanUrl = CORE_MAIN_NET.scan;

let confluxClient = new TreeGraph.Conflux(CORE_MAIN_NET);
// use wallet provider
if (window.conflux) {
  confluxClient.provider = window.conflux;
}

// used for send pos RPC methods
let appClient = new TreeGraph.Conflux(CORE_MAIN_NET);

function confluxRequest(options) {
  if (conflux.isFluent) {
    return conflux.request(options);
  } else {
    const params = options.params || [];
    return conflux.send(options.method, ...params);
  }
}

const faucets = {
  activeFaucet: null,
  captchaResponse: null,
  times: 0,
  unix: null,
  unix2: null,

  verifyCallback: function (response) {
    console.log(response);
    let _response = String(response);
    if (_response.length == 0) {
      showError("Please do the captcha again.");
      return;
    }
    closePopup("popup");
    faucets.captchaResponse = response;
    connectWallet();
  },

  core: {

    userInfo: {},

    connectWallet: async function () {
      if (!window.conflux) {
        showError('Please install Fluent Wallet');
        return;
      }

      faucets.unix = unix;
      faucets.unix2 = unix2;

      let status = null;
      try {
        status = await confluxRequest({ method: 'cfx_getStatus' });
      } catch (e) {
        console.log(e);
        showError('Wrong network. Please switch Fluent to Conflux Core mainnet.');
        return;
      }


      let netId = Number(status.chainId);
      if (netId != CORE_MAIN_NET.networkId) {
        showError('Wrong network. Please switch Fluent to Conflux Core mainnet.');
        return;
      }

      const account = await this._requestAccount();
      if (!account) {
        console.log('RequestAccounts failed');
        showError('Could not get Wallet address from Fluent.');
        return;
      }

      localStorage.setItem('coreConnected', true);

      const balance = await this._loadUserInfo();
      if (!balance && balance !== 0) {
        console.log('Balance loading failed');
        showError('Could not get Wallet balance from Fluent.');
        return;
      }

      this._useFaucet();

    },
    _requestAccount: async function () {
      const accounts = await confluxRequest({
        method: "cfx_requestAccounts"
      });
      if (typeof accounts[0] == "undefined") {
        return null;
      }
      const account = accounts[0];
      if (!account) return null;
      this.userInfo.account = account;
      this.userInfo.connected = true;
      return account;
    },
    _loadUserInfo: async function () {
      const balance = await confluxClient.cfx.getBalance(this.userInfo.account);
      const _balance = TreeGraph.Drip(balance).toCFX();
      console.log("bal", _balance, balance);
      this.userInfo.balance = _balance;
      return _balance;
    },
    _useFaucet: async function () {
      const flag = (
        !faucets.captchaResponse
        ||
        !faucets.activeFaucet
        ||
        !this.userInfo.account
        ||
        (!this.userInfo.balance && this.userInfo.balance !== 0)
      );
      console.log(faucets.captchaResponse, faucets.activeFaucet, this.userInfo.account, this.userInfo.balance);
      if (flag) {
        console.log("Could not complete faucet request.");
        showError("Could not complete faucet request.");
        return;
      }
      const _data = {
        "faucet": faucets.activeFaucet,
        "gcr": faucets.captchaResponse,
        "acc": this.userInfo.account,
        "bal": this.userInfo.balance,
        "unix": faucets.unix,
        "unix2": faucets.unix2,
      };

      let tmpAcc = String(this.userInfo.account);


      let tmpNotice = showTimedNotice("Found Core Address: " + tmpAcc + ".");

      $.ajax({
        method: "POST",
        url: "?",
        data: _data,
      })
        .done(function (data) {
          let json = JSON.parse(data);

          if (json.error) {
            console.log(json.error);
            showError(json.error);
            return;
          }
          if (json.success) {
            showNotice("✅ Conflux Core Faucet will send 0.0025 CFX in 2 min to 2 hrs to address: " + tmpAcc);
            closePopup('popup');
            return;
          }
          console.log("Request failed.");
          showError("Sorry. Could not complete your request, please try again later.");

        })
        .fail(function (jqXHR, textStatus) {
          showError("Sorry. Could not complete your request, please try again later.");
          console.log("Ajax Request failed: " + textStatus);
        });

    },
  },
  espace: {

    userInfo: {},

    connectWallet: async function () {
      if (typeof window.ethereum === 'undefined') {
        console.log("metamask not installed");
        showError('Please install Metamask');
        return;
      }

      faucets.unix = unix;
      faucets.unix2 = unix2;

      if (ethereum.networkVersion != ESPACE_MAIN_NET.networkId) {
        console.log("wrong network", ethereum.networkVersion);
        showError('Wrong network. Please switch Metamask to Conflux ESpace mainnet.');
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      if (accounts.length === 0) {
        console.log('RequestAccounts failed');
        showError('Could not get Wallet address from Metamask.');
        return;
      }

      localStorage.setItem('espaceConnected', true);

      const account = accounts[0];

      this.userInfo.account = account;
      this.userInfo.connected = true;

      const _balance = await provider.getBalance(account);
      const balance = ethers.utils.formatEther(_balance);
      if (!balance && balance !== 0) {
        console.log('Balance loading failed', _balance, balance);
        showError('Could not get Wallet balance from Metamask.');
        return;
      }
      this.userInfo.balance = balance;

      this._useFaucet();
    },

    _useFaucet: async function () {
      const flag = (
        !faucets.captchaResponse
        ||
        !faucets.activeFaucet
        ||
        !this.userInfo.account
        ||
        (!this.userInfo.balance && this.userInfo.balance !== 0)
      );
      if (flag) {
        console.log("Could complete faucet request.");
        showError("Could complete faucet request.");
        return;
      }
      const _data = {
        "faucet": faucets.activeFaucet,
        "gcr": faucets.captchaResponse,
        "acc": this.userInfo.account,
        "bal": this.userInfo.balance,
        "unix": faucets.unix,
        "unix2": faucets.unix2,
      };

      let tmpAcc = String(this.userInfo.account);

      let tmpNotice = showTimedNotice("Found eSpace Address: " + tmpAcc + ".");

      $.ajax({
        method: "POST",
        url: "?",
        data: _data,
      })
        .done(function (data) {
          let json = JSON.parse(data);

          if (json.error) {
            console.log(json.error);
            showError(json.error);
            return;
          }
          if (json.success) {
            showNotice("✅ Conflux eSpace Faucet will send 0.0025 CFX in 2 min to 2 hrs to address: " + tmpAcc);
            closePopup('popup');
            return;
          }
          console.log("Request failed.");
          showError("Sorry. Could not complete your request, please try again later.");

        })
        .fail(function (jqXHR, textStatus) {
          showError("Sorry. Could not complete your request, please try again later.");
          console.log("Ajax Request failed: " + textStatus);
        });
    },
  },

}

function showTimedNotice(msg, _timeout = 3000) {
  $("#popup3 .popup-content-text").text(msg);
  showPopup("popup3");
  return setTimeout(function () { closePopup("popup3"); }, _timeout);
}

function showPopup(Id) {
  console.log("popup open");
  if (Id == "popup" || Id == "popup4") {
    closePopup("popup2");
    closePopup("popup3");
    document.getElementById(Id).style.width = "100%";
    $("#" + Id + " .popup-close-button").show();
  } else {
    document.getElementById(Id).style.height = "auto";
    $("#" + Id + " .popup-close-button").show();

  }
}


function closePopup(Id) {
  console.log("popup close");

  if (Id == "popup" || Id == "popup4") {
    $("#" + Id + " .popup-close-button").hide();
    document.getElementById(Id).style.width = "0%";
  } else {
    document.getElementById(Id).style.height = "0%";
    $("#" + Id + " .popup-close-button").hide();
    $("#" + Id + " .popup-content-text").html('');
    $("#" + Id + " .popup-content-text").removeClass("popup-error");
    $("#" + Id + " .popup-content-text").removeClass("popup-notice");
  }
}

function showError(msg) {
  let Id = 'popup2';
  $("#" + Id + " .popup-content-text").text('ℹ️ ' + msg);
  $("#" + Id + " .popup-content-text").addClass("popup-error");
  showPopup(Id);
}

function showNotice(msg) {
  let Id = 'popup2';
  $("#" + Id + " .popup-content-text").text(msg);
  $("#" + Id + " .popup-content-text").addClass("popup-notice");
  showPopup(Id);
}


function connectWallet() {
  if (faucets.captchaResponse === null) {
    console.log("error capt");
    return;
  }

  switch (faucets.activeFaucet) {
    case 'core':
      faucets.core.connectWallet();
      break;

    case 'espace':
      faucets.espace.connectWallet();
      break;

    default:
      console.log("error faucet");
      return;
  }
}




function toggleFaq(faq) {
  let isHidden = $('.info-faq-text[data-faq="' + faq + '"]').is(":hidden");

  let html = '<i class="far fa-plus-square"></i>';
  if (isHidden) {
    html = '<i class="far fa-minus-square"></i>';
  }
  $('.info-faq-toggle[data-faq="' + faq + '"]').html(html);
  $('.info-faq-text[data-faq="' + faq + '"]').toggle(100);
}

// JQuery ready 

$(function () {

  $("#fluent-button .faucet-button-text").click(function () {
    faucets.activeFaucet = 'core';
    faucets.captchaResponse = null;
    if (faucets.times > 0) {
      grecaptcha.reset();
    }
    faucets.times++;
    showPopup("popup");
  });

  $("#mm-button .faucet-button-text").click(function () {
    faucets.activeFaucet = 'espace';
    faucets.captchaResponse = null;
    if (faucets.times > 0) {
      grecaptcha.reset();
    }
    faucets.times++;
    showPopup("popup");
  });

  $("#info-button-text").click(function () {
    showPopup("popup4");
  });

  $(".info-faq-heading").click(function () {
    let faq = $(this).attr("data-faq");
    toggleFaq(faq);
  });


});
