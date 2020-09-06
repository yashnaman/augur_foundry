import Web3 from "web3";
import {
  EventEmitter
} from "events";
import dispatcher from "../dispatcher";

const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;

class MetaMaskStore extends EventEmitter {


  constructor() {
    super();
    this.isLogin = false;
    this.metaMaskInstalled = false;
    this.web3 = null;
    this.netWorkId = 0;
    this.accounts = [];
  }

  getWeb3() {
    return {
      web3: this.web3,
      metaMaskInstalled: this.metaMaskInstalled,
      isLogin: this.isLogin,
      netWorkId: this.netWorkId,
      accounts: this.accounts
    };
  }

  connectMetamask(status) {
    const web3 = new Web3(window.ethereum);
    // console.log(window.ethereum);
    if (window.ethereum) {
      this.emit("META_MASK_CONNECTED");
      if (window.ethereum.selectedAddress !== null && window.ethereum.selectedAddress !== undefined) {
        this.web3 = web3;
        this.metaMaskInstalled = true;
        this.fetchNetworkId();
      } else {
        if (status) {
          window.ethereum.enable().then((response) => {
            this.web3 = web3;
            this.metaMaskInstalled = true;
            this.fetchNetworkId();
          }).catch((error) => {
            console.log(error)
          })
        } else {
          this.metaMaskInstalled = true;
        }
      }
    } else {
      this.emit("META_MASK_CONNECTED");
      this.metaMaskInstalled = false;
    }
  }

  fetchNetworkId() {
    this.web3.eth.net.getId().then((resp) => {
      this.netWorkId = resp;
      this.initNetworkPoll();
      this.fetchAccounts();
      this.emit("META_MASK_NETWORK_CHANGED");
    })
  }

  fetchAccounts() {
    this.web3.eth.getAccounts().then((resp) => {
      this.accounts = resp;
      if (resp.length === 0) {
        this.isLogin = false;
      } else {
        this.isLogin = true;
      }
      this.emit("META_MASK_ADDRESS_CHANGED");
      this.initAccountPoll();
    })
  }

  initAccountPoll() {
    setInterval(() => {
      this.web3.eth.getAccounts().then((resp) => {
        if (resp[0] !== this.accounts[0]) {
          this.accounts = resp;
          if (resp.length === 0) {
            this.isLogin = false;
          } else {
            this.isLogin = true;
          }
          this.emit("META_MASK_ADDRESS_CHANGED");
        }
      })
    }, ONE_SECOND);
  }

  initNetworkPoll() {
    setInterval(() => {
      this.web3.eth.net.getId().then((resp) => {
        if (this.netWorkId !== resp) {
          this.netWorkId = resp;
          this.emit("META_MASK_NETWORK_CHANGED");
        }
      })
    }, ONE_MINUTE);
  }

  checkWeb3(status) {
    if (window.ethereum !== undefined) {
      this.metaMaskInstalled = true;
      this.connectMetamask(status);
    } else {
      window.addEventListener("load", () => {
        if (window.ethereum) {
          this.metaMaskInstalled = true;
          this.connectMetamask(status);
        } else {
          this.emit("META_MASK_CONNECTED");
          var metamaskCheck = setInterval(()=>{
            if(window.ethereum){
              clearInterval(metamaskCheck);
              this.metaMaskInstalled = true;
              this.connectMetamask(status);
            }
          },1000)
        }
      })
    }

  }

  handleActions(action) {
    switch (action.type) { }
  }


}

const metaMaskStore = new MetaMaskStore();
dispatcher.register(metaMaskStore.handleActions.bind(metaMaskStore));
export default metaMaskStore;
