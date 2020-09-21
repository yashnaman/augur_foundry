import React, { PureComponent } from "react";

import Row from "react-bootstrap/Row";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Jumbotron from "react-bootstrap/Jumbotron";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover"

import metaMaskStore from "./components/metaMask";
import { BN, constants } from "@openzeppelin/test-helpers";
import NumberFormat from "react-number-format";

import markets from "./configs/markets/markets-mainnet.json";
import contracts from "./configs/contracts.json";
import environment from "./configs/environments/environment-mainnet.json";

import { notification } from "antd";
import "antd/dist/antd.css";
export default class App extends PureComponent {
  constructor(props) {
    super(props);
    this.mintDaiForm = this.mintDaiForm.bind(this);
    this.state = {
      web3Provider: {
        web3: null,
        metaMaskInstalled: false,
        isLogin: false,
        netWorkId: 0,
        accounts: [],
      },
      listData: null,
    };
  }

  componentWillMount() {
    metaMaskStore.checkWeb3(true);
    metaMaskStore.on("META_MASK_CONNECTED", this.metaMaskConnected.bind(this));
    metaMaskStore.on(
      "META_MASK_ADDRESS_CHANGED",
      this.metaAddressChange.bind(this)
    );
    metaMaskStore.on(
      "META_MASK_NETWORK_CHANGED",
      this.metaNetwrokChange.bind(this)
    );
  }
  componentWillUnmount() {
    metaMaskStore.removeListener(
      "META_MASK_CONNECTED",
      this.metaMaskConnected.bind(this)
    );
    metaMaskStore.removeListener(
      "META_MASK_ADDRESS_CHANGED",
      this.metaAddressChange.bind(this)
    );
    metaMaskStore.removeListener(
      "META_MASK_NETWORK_CHANGED",
      this.metaNetwrokChange.bind(this)
    );
  }
  metaMaskConnected() {
    this.setState({ web3Provider: metaMaskStore.getWeb3() }, () => {
      this.initData();
    });
  }

  metaAddressChange() {
    this.setState({ web3Provider: metaMaskStore.getWeb3() }, () => {
      this.initData();
    });
  }

  metaNetwrokChange() {
    this.setState({ web3Provider: metaMaskStore.getWeb3() }, () => {
      // this.initData();
    });
  }

  async initData() {
    console.log("initData");
    // notification.open({
    //   message: "Please Wait",
    // });

    const { web3 } = this.state.web3Provider;

    let chainId = await web3.eth.net.getId();
    console.log("chainId: " + chainId);

    if (chainId != 1) {
      this.openNotification(
        "error",
        "Wrong Network",
        "Please connect to Ethereum Mainnet"
      );
      return;
    }

    const OUTCOMES = { INVALID: 0, NO: 1, YES: 2 };

    const cash = new web3.eth.Contract(
      contracts.contracts["Cash.sol"].Cash.abi,
      environment.addresses.Cash
    );
    const erc20 = new web3.eth.Contract(
      contracts.contracts["Cash.sol"].Cash.abi
    );

    const shareToken = new web3.eth.Contract(
      contracts.contracts["reporting/ShareToken.sol"].ShareToken.abi,
      environment.addresses.ShareToken
    );

    const market = new web3.eth.Contract(
      contracts.contracts["reporting/Market.sol"].Market.abi
    );

    const augurFoundry = new web3.eth.Contract(
      contracts.contracts["AugurFoundry.sol"].AugurFoundry.abi,
      markets[0].augurFoundryAddress
    );

    const universe = new web3.eth.Contract(
      contracts.contracts["reporting/Universe.sol"].Universe.abi,
      environment.addresses.Universe
    );

    const augur = new web3.eth.Contract(
      contracts.contracts["Augur.sol"].Augur.abi,
      environment.addresses.Augur
    );
    const erc20Wrapper = new web3.eth.Contract(
      contracts.contracts["ERC20Wrapper.sol"].ERC20Wrapper.abi
    );
    let totalOIEth = web3.utils.fromWei(
      await universe.methods.getOpenInterestInAttoCash().call()
    );
    let n = totalOIEth.indexOf(".");
    //This is a hack for precision when dealing with bignumber
    let totalOI = totalOIEth.substring(0, n != -1 ? n + 3 : totalOIEth.length);
    this.setState(
      {
        cash: cash,
        shareToken: shareToken,
        market: market,
        universe: universe,
        augur: augur,
        augurFoundry: augurFoundry,
        erc20: erc20,
        erc20Wrapper: erc20Wrapper,
        OUTCOMES: OUTCOMES,
        totalOI: totalOI,
      },
      () => {
        this.invetoryInit();
      }
    );
    // notification.destroy();
  }

  async invetoryInit() {
    const { web3 } = this.state.web3Provider;
    const { OUTCOMES, erc20 } = this.state;
    let listData = [];
    // let yesTokenAddresses = [];
    // let noTokenAddress = [];
    // console.log(markets);
    this.openNotification("info", "Updating Markets...", "", 5);
    for (let x = 0; x < markets.length; x++) {
      // let x = 0;
      let wrappedBalances = await this.getYesNoBalancesMarketERC20(
        markets[x].address
      );
      let {
        yesTokenAddress,
        noTokenAddress,
      } = await this.getYesNoTokenAddresses(markets[x].address);

      let decimals = new BN(15);

      wrappedBalances.yesTokenBalance = wrappedBalances.yesTokenBalance.mul(
        new BN(10).pow(new BN(3))
      );
      wrappedBalances.noTokenBalance = wrappedBalances.noTokenBalance.mul(
        new BN(10).pow(new BN(3))
      );
      // console.log(noTokenAddres);
      // console.log(yesTokenAddress);
      let shareTokenBalances = await this.getYesNoBalancesMarketShareToken(
        markets[x].address
      );
      let isMoreThanZeroShares = await this.checkIfMoreThanZeroShares(
        shareTokenBalances
      );
      let isMoreThanZeroERC20s = await this.checkIfMoreThanZeroERC20s(
        wrappedBalances
      );
      let marketFinalized = await this.isMarketFinalized(markets[x].address);
      // console.log(isMoreThanZeroShares);
      // console.log(isMoreThanZeroERC20s);
      // console.log(x);

      listData.push(
        <tr>
          <OverlayTrigger placement="right" overlay={this.showMarketInfoOnHover(x)}>      
          <td
            // onMouseEnter={() => this.showMarketInfoOnHover(x, true)}
            // onMouseLeave={() => this.showMarketInfoOnHover(x, false)}
          >
            {markets[x].extraInfo.description}
          </td>
          </OverlayTrigger>
          <td>
            Yes :{" "}
            {web3.utils
              .fromWei(shareTokenBalances.yesTokenBalance.toString())
              .toString()}
            <br />
            No :{" "}
            {web3.utils.fromWei(shareTokenBalances.noTokenBalance).toString()}
          </td>
          <td>
            Yes :{" "}
            {web3.utils.fromWei(wrappedBalances.yesTokenBalance).toString()} (
            <span
              style={{ color: "#ffd790", cursor: "pointer" }}
              onClick={async (event) =>
                this.addTokenToMetamask(yesTokenAddress, x, OUTCOMES.YES)
              }
            >
              Show in wallet
            </span>
            )
            <br />
            No : {web3.utils
              .fromWei(wrappedBalances.noTokenBalance)
              .toString()}{" "}
            (
            <span
              style={{ color: "#ffd790", cursor: "pointer" }}
              onClick={async (event) =>
                this.addTokenToMetamask(noTokenAddress, x, OUTCOMES.NO)
              }
            >
              Show in wallet
            </span>
            )
          </td>
          <td>
            {isMoreThanZeroShares || isMoreThanZeroERC20s ? (
              marketFinalized ? (
                <span>
                  <Button
                    variant="secondary"
                    className="m-left"
                    type="submit"
                    onClick={(e) =>
                      this.claimWinningsWhenWrapped(markets[x].address)
                    }
                  >
                    REDEEM DAI
                  </Button>
                </span>
              ) : isMoreThanZeroShares && isMoreThanZeroERC20s ? (
                <span>
                  <Button
                    variant="success"
                    className="m-left"
                    type="submit"
                    onClick={(e) => this.unwrapShares(markets[x].address)}
                  >
                    UNWRAP
                  </Button>
                  <Button
                    variant="danger"
                    type="submit"
                    onClick={(e) => this.wrapShare(markets[x].address)}
                  >
                    WRAP SHARES
                  </Button>

                  <Button
                    variant="secondary"
                    className="m-left"
                    type="submit"
                    onClick={(e) => this.redeemDAI(markets[x].address)}
                  >
                    REDEEM DAI
                  </Button>
                </span>
              ) : isMoreThanZeroERC20s ? (
                <Button
                  variant="success"
                  type="submit"
                  onClick={(e) => this.unwrapShares(markets[x].address)}
                >
                  UNWRAP
                </Button>
              ) : (
                <span>
                  <Button
                    variant="danger"
                    type="submit"
                    onClick={(e) => this.wrapShare(markets[x].address)}
                  >
                    WRAP SHARES
                  </Button>
                  <Button
                    variant="secondary"
                    className="m-left"
                    type="submit"
                    onClick={(e) => this.redeemDAI(markets[x].address)}
                  >
                    REDEEM DAI
                  </Button>
                </span>
              )
            ) : (
              <span></span>
            )}
          </td>
        </tr>
      );
    }
    //console.log(listData)
    this.setState({ listData: listData });
  }

  async addTokenToMetamask(tokenAddress, index, outcome) {
    const { erc20 } = this.state;
    erc20.options.address = tokenAddress;
    let tokenSymbol = await erc20.methods.symbol().call();
    // let tokenSymbol;
    let decimals = await erc20.methods.decimals().call();
    // if (outcome == 1) {
    //   tokenSymbol = "NO" + (index + 1);
    // } else if (outcome == 2) {
    //   tokenSymbol = "YES" + (index + 1);
    // } else {
    //   throw new Error("Not a valid outcome");
    // }
    const provider = window.web3.currentProvider;
    provider.sendAsync(
      {
        method: "metamask_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: decimals,
            // image: tokenImage,
          },
        },
        id: Math.round(Math.random() * 100000),
      },
      (err, added) => {
        console.log("provider returned", err, added);
        if (err || "error" in added) {
          // this.setState({
          //   errorMessage: "There was a problem adding the token.",
          //   message: "",
          // });
          this.openNotification(
            "error",
            "There was an error in adding the custom token in metamask",
            ""
          );
          return;
        }
        // this.setState({
        //   message: "Token added!",
        //   errorMessage: "",
        // });
        console.log("suceesfull");
      }
    );
  }

  async mintDaiForm(e) {
    e.preventDefault();
    const { web3, accounts } = this.state.web3Provider;

    const { cash, shareToken, market, augur } = this.state;

    const marketAddress = e.target.elements.marketIds.value;
    //Here the amount is the amoun of DAI users wants to spend to buy shares
    let amount = e.target.elements.amount.value;

    // const daiBalance = await daiInstance.methods.balanceOf(accounts[0]).call();

    //NOTE : remove inconsitencies in new BN
    if (web3.utils.isAddress(marketAddress) && amount) {
      let weiAmount = web3.utils.toWei(amount);
      weiAmount = new BN(weiAmount);
      market.options.address = marketAddress;
      let balance = new BN(await cash.methods.balanceOf(accounts[0]).call());
      let numTicks = new BN(await market.methods.getNumTicks().call());
      console.log("numTicks: " + numTicks);

      let amountOfShareToBuy = weiAmount.div(numTicks);
      // console.log(web3.utils.fromWei(amountOfShareToBuy));

      //user is inouting how much DAI they want to spend
      //They should have more than they want to spend
      if (weiAmount.cmp(balance) == 1) {
        //weiAmount > balance
        //await Promise.reject(new Error("Not Enough balance to buy complete sets"));
        this.openNotification("error", "Not Enough DAI Balance", "");
        return;
      }

      let allowance = new BN(
        await cash.methods.allowance(accounts[0], augur.options.address).call()
      );

      if (weiAmount.cmp(allowance) == 1) {
        console.log("allowance");
        this.openNotification(
          "info",
          "Approve your DAI to before minting new shares",
          "This is one time transaction"
        );
        cash.methods
          .approve(augur.options.address, constants.MAX_UINT256.toString())
          .send({ from: accounts[0] })
          .on("receipt", (receipt) => {
            console.log("Before buy complete sets");
            this.openNotification(
              "info",
              "Approval Successfull",
              "Now we can mint shares for you"
            );
            this.openNotification("info", "Minting shares", "");
            shareToken.methods
              .buyCompleteSets(
                marketAddress,
                accounts[0],
                amountOfShareToBuy.toString()
              )
              .send({ from: accounts[0] })
              .on("receipt", (receipt) => {
                this.openNotification(
                  "success",
                  "Shares minted successfully",
                  ""
                );
                this.initData();
              })
              .on("error", (error) => {
                if (
                  error.message.includes("User denied transaction signature")
                ) {
                  this.openNotification(
                    "error",
                    "User denied signature",
                    "sign the transaction to be able to execute the transaction"
                  );
                } else {
                  this.openNotification(
                    "error",
                    "There was an error in executing the transaction",
                    ""
                  );
                }
              });
          })
          .on("error", (error) => {
            if (error.message.includes("User denied transaction signature")) {
              this.openNotification(
                "error",
                "User denied signature",
                "sign the transaction to be able to execute the transaction"
              );
            } else {
              this.openNotification(
                "error",
                "There was an error in executing the transaction",
                ""
              );
            }
          });
      } else {
        this.openNotification("info", "Minting shares", "");
        // console.log(marketAddress);
        //buy the complete sets
        shareToken.methods
          .buyCompleteSets(
            marketAddress,
            accounts[0],
            amountOfShareToBuy.toString()
          )
          .send({ from: accounts[0] })
          .on("receipt", (receipt) => {
            this.openNotification("success", "Shares minted successfully", "");
            this.initData();
          })
          .on("error", (error) => {
            if (error.message.includes("User denied transaction signature")) {
              this.openNotification(
                "error",
                "User denied signature",
                "sign the transaction to be able to execute the transaction"
              );
            } else {
              this.openNotification(
                "error",
                "There was an error in executing the transaction",
                ""
              );
            }
          });
      }
    } else {
      this.openNotification("error", "Select a Market and Enter   amount", "");
    }

    // await this.initData();
  }

  async wrapShare(marketAddress) {
    // alert(marketAddress);
    if (marketAddress) {
      const { accounts } = this.state.web3Provider;
      const { shareToken, augurFoundry, OUTCOMES } = this.state;

      let isApprovedForAllToAugurFoundry = await shareToken.methods
        .isApprovedForAll(accounts[0], augurFoundry.options.address)
        .call();

      let tokenIds = [];
      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
      );
      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.YES).call()
      );
      // console.log(tokenIds);
      // console.log(markets[0].YesTokenAddress);

      //get the balance of both tokenIds and give the amoun on which is less
      let yesShareBalance = new BN(
        await shareToken.methods.balanceOf(accounts[0], tokenIds[1]).call()
      );
      let noShareBalance = new BN(
        await shareToken.methods.balanceOf(accounts[0], tokenIds[0]).call()
      );
      // console.log(yesShareBalance);
      //wrap whatever the balance is

      // console.log(amount);
      console.log("before Wrapping");

      if (!isApprovedForAllToAugurFoundry) {
        this.openNotification(
          "info",
          "Approve your share tokens to be able to wrap shares",
          ""
        );
        shareToken.methods
          .setApprovalForAll(augurFoundry.options.address, true)
          .send({ from: accounts[0] })
          .on("receipt", (receipt) => {
            this.openNotification(
              "info",
              "Approval successful",
              "Now we can wrap shares"
            );
            // this.initData();
            this.openNotification("info", "Wrapping your shares", "");
            augurFoundry.methods
              .wrapMultipleTokens(tokenIds, accounts[0], [
                noShareBalance.toString(),
                yesShareBalance.toString(),
              ])
              .send({ from: accounts[0] })
              .on("receipt", (receipt) => {
                this.openNotification("success", "Wrapping successful", "");
                this.initData();
              })
              .on("error", (error) => {
                if (
                  error.message.includes("User denied transaction signature")
                ) {
                  this.openNotification(
                    "error",
                    "User denied signature",
                    "sign the transaction to be able to execute the transaction"
                  );
                } else {
                  this.openNotification(
                    "error",
                    "There was an error in executing the transaction",
                    ""
                  );
                }
              });
          })
          .on("error", (error) => {
            if (error.message.includes("User denied transaction signature")) {
              this.openNotification(
                "error",
                "User denied signature",
                "sign the transaction to be able to execute the transaction"
              );
            } else {
              this.openNotification(
                "error",
                "There was an error in executing the transaction",
                ""
              );
            }
          });
      } else {
        this.openNotification("info", "Wrapping your shares", "");
        //wrapp all the tokens
        augurFoundry.methods
          .wrapMultipleTokens(tokenIds, accounts[0], [
            noShareBalance.toString(),
            yesShareBalance.toString(),
          ])
          .send({ from: accounts[0] })
          .on("receipt", (receipt) => {
            this.openNotification("success", "Wrapping successful", "");
            this.initData();
          })
          .on("error", (error) => {
            if (error.message.includes("User denied transaction signature")) {
              this.openNotification(
                "error",
                "User denied signature",
                "sign the transaction to be able to execute the transaction"
              );
            } else {
              this.openNotification(
                "error",
                "There was an error in executing the transaction",
                ""
              );
            }
          });
      }
    }
    // await this.initData();
  }
  async redeemDAI(marketAddress) {
    //check if market has finalized if it has call the claim trading proceeds
    //if not call the buy completeshares
    const { web3, accounts } = this.state.web3Provider;
    const { shareToken, augurFoundry, OUTCOMES } = this.state;
    if (marketAddress) {
      let isMarketFinalized = await this.isMarketFinalized(marketAddress);

      //end a market to do this
      if (isMarketFinalized) {
        console.log("claiming trading proceeds");
        //last arg is for fingerprint that has something to do with affiliate fees(NOTE: what exactly?)
        this.openNotification("info", "Redeeming DAI on winning shares", " ");
        //Add a check that user has the complete shares
        //i.e. balanceofShareTOken for YES/NO/INVALID should be greater then zero

        shareToken.methods
          .claimTradingProceeds(
            marketAddress,
            accounts[0],
            web3.utils.fromAscii("")
          )
          .send({ from: accounts[0] })
          .on("receipt", (receipt) => {
            this.openNotification("success", "DAI redeemed successfully", "");
            this.initData();
          })
          .on("error", (error) => {
            if (error.message.includes("User denied transaction signature")) {
              this.openNotification(
                "error",
                "User denied signature",
                "sign the transaction to be able to execute the transaction"
              );
            } else {
              this.openNotification(
                "error",
                "There was an error in executing the transaction",
                ""
              );
            }
          });
      } else {
        //here check the minimum of token balances
        //this should be a function
        let tokenIds = [];
        tokenIds.push(
          await shareToken.methods
            .getTokenId(marketAddress, OUTCOMES.INVALID)
            .call()
        );
        tokenIds.push(
          await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
        );
        tokenIds.push(
          await shareToken.methods
            .getTokenId(marketAddress, OUTCOMES.YES)
            .call()
        );

        //get the balance of all tokenIds and give the amoun on which is less
        let invalidShareBalance = new BN(
          await shareToken.methods.balanceOf(accounts[0], tokenIds[0]).call()
        );
        let noShareBalance = new BN(
          await shareToken.methods.balanceOf(accounts[0], tokenIds[1]).call()
        );
        let yesShareBalance = new BN(
          await shareToken.methods.balanceOf(accounts[0], tokenIds[2]).call()
        );
        // console.log(yesShareBalance);

        let amount = BN.min(
          invalidShareBalance,
          BN.min(noShareBalance, yesShareBalance)
        );
        if (amount.cmp(new BN(0)) == 0) {
          this.openNotification(
            "error",
            "Not enough Balance",
            "You need shares of every outcome(YES/NO/INVALID) to be able to redeem DAI"
          );
          return;
        }

        this.openNotification(
          "info",
          "Redeeming DAI by selling your shares",
          ""
        );
        shareToken.methods
          .sellCompleteSets(
            marketAddress,
            accounts[0],
            accounts[0],
            amount.toString(),
            web3.utils.fromAscii("")
          )
          .send({ from: accounts[0] })
          .on("receipt", (receipt) => {
            this.openNotification("success", "DAI redeemed successfully", "");
            this.initData();
          })
          .on("error", (error) => {
            if (error.message.includes("User denied transaction signature")) {
              this.openNotification(
                "error",
                "User denied signature",
                "sign the transaction to be able to execute the transaction"
              );
            } else {
              this.openNotification(
                "error",
                "There was an error in executing the transaction",
                ""
              );
            }
          });
      }
    }
  } // await this.initData();
  async claimWinningsWhenWrapped(marketAddress) {
    const { web3, accounts } = this.state.web3Provider;
    const {
      shareToken,
      augurFoundry,
      market,
      OUTCOMES,
      erc20Wrapper,
    } = this.state;
    //check if the market has finalized
    market.options.address = marketAddress;
    if (await market.methods.isFinalized().call()) {
      //get the winning outcome
      let numTicks = new BN(await market.methods.getNumTicks().call());
      let tokenIds = [];
      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
      );
      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.YES).call()
      );
      let i;
      for (i in tokenIds) {
        // console.log("before calling winnign payout");
        let outcome;
        if (i == 0) {
          outcome = OUTCOMES.NO;
        } else {
          outcome = OUTCOMES.YES;
        }
        let winningPayoutNumerator = new BN(
          await market.methods.getWinningPayoutNumerator(outcome).call()
        );
        // console.log("winningPayoutNumerator: " + winningPayoutNumerator);
        // console.log("numTicks: " + numTicks);
        if (winningPayoutNumerator.cmp(numTicks) == 0) {
          // console.log("before calling q");

          erc20Wrapper.options.address = await augurFoundry.methods
            .wrappers(tokenIds[i])
            .call();
          //no claim for the user
          // if(winningOutcome balance is zero then redeem DAI by selling ERC1155s)
          let balanceOfWinningOutcomeWrapped = await this.getBalanceOfERC20(
            erc20Wrapper.options.address,
            accounts[0]
          );
          // console.log(balanceOfWinningOutcomeWrapped.toString());
          if (balanceOfWinningOutcomeWrapped.cmp(new BN(0)) == 0) {
            console.log("redeem DAI called");
            let shareTokenBalances = await this.getYesNoBalancesMarketShareToken(
              marketAddress
            );
            if (await this.checkIfMoreThanZeroShares(shareTokenBalances)) {
              this.redeemDAI(marketAddress);
            } else {
              this.openNotification(
                "error",
                "You do not have the winnng outcome shares",
                ""
              );
            }

            //try to sell by calling the shareToken method directly
          } else {
            console.log("redeem not DAI called");
            erc20Wrapper.methods
              .claim(accounts[0])
              .send({ from: accounts[0] })
              .on("receipt", (receipt) => {
                this.openNotification(
                  "success",
                  "DAI redeemed successfully",
                  ""
                );
                this.initData();
              })
              .on("error", (error) => {
                if (
                  error.message.includes("User denied transaction signature")
                ) {
                  this.openNotification(
                    "error",
                    "User denied signature",
                    "sign the transaction to be able to execute the transaction"
                  );
                } else {
                  this.openNotification(
                    "error",
                    "There was an error in executing the transaction",
                    ""
                  );
                }
              });
          }
        }
      }
    }
    // await this.initData();
  }
  async getBalanceOfERC20(tokenAddress, account) {
    // console.log("getBlanecERC20" + account);
    const { erc20 } = this.state;
    erc20.options.address = tokenAddress;
    return new BN(await erc20.methods.balanceOf(account).call());
  }

  async isMarketFinalized(marketAddress) {
    const { market } = this.state;
    market.options.address = marketAddress;
    // console.log(await market.methods.isFinalized().call());
    return await market.methods.isFinalized().call();
  }

  async unwrapShares(marketAddress) {
    const { accounts } = this.state.web3Provider;
    const { augurFoundry, shareToken, OUTCOMES } = this.state;
    if (marketAddress) {
      const {
        yesTokenBalance,
        noTokenBalance,
      } = await this.getYesNoBalancesMarketERC20(marketAddress);
      //this should be a function
      let tokenIds = [];
      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
      );
      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.YES).call()
      );

      // let amount =
      //   yesTokenBalance > noTokenBalance ? noTokenBalance : yesTokenBalance;
      this.openNotification("info", "Unwrapping shares", "");
      augurFoundry.methods
        .unWrapMultipleTokens(tokenIds, [
          noTokenBalance.toString(),
          yesTokenBalance.toString(),
        ])
        .send({ from: accounts[0] })
        .on("receipt", (receipt) => {
          this.openNotification("success", "Shares unwrapped successfully", "");
          this.initData();
        })
        .on("error", (error) => {
          if (error.message.includes("User denied transaction signature")) {
            this.openNotification(
              "error",
              "User denied signature",
              "sign the transaction to be able to execute the transaction"
            );
          } else {
            this.openNotification(
              "error",
              "There was an error in executing the transaction",
              ""
            );
          }
        });
    }
    // await this.initData();
  }

  async getYesNoBalancesMarketERC20(marketAddress) {
    const { accounts } = this.state.web3Provider;
    const { shareToken, augurFoundry, erc20, OUTCOMES } = this.state;
    let yesTokenBalance = new BN(0);
    let noTokenBalance = new BN(0);
    if (accounts[0]) {
      let {
        yesTokenAddress,
        noTokenAddress,
      } = await this.getYesNoTokenAddresses(marketAddress);
      // console.log("yesTOkenAddress" + yesTokenAddress);
      // console.log("accounts{0}" + accounts[0]);
      // console.log(noTokenAddress);
      // console.log(yesTokenAddress);

      yesTokenBalance = await this.getBalanceOfERC20(
        yesTokenAddress,
        accounts[0]
      );
      noTokenBalance = await this.getBalanceOfERC20(
        noTokenAddress,
        accounts[0]
      );
    }
    return {
      yesTokenBalance: yesTokenBalance,
      noTokenBalance: noTokenBalance,
    };
  }
  async getYesNoTokenAddresses(marketAddress) {
    const { shareToken, augurFoundry, OUTCOMES } = this.state;
    let tokenIds = [];

    tokenIds.push(
      await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
    );

    tokenIds.push(
      await shareToken.methods.getTokenId(marketAddress, OUTCOMES.YES).call()
    );
    let yesTokenAddress = await augurFoundry.methods
      .wrappers(tokenIds[1])
      .call();
    let noTokenAddress = await augurFoundry.methods
      .wrappers(tokenIds[0])
      .call();
    return { yesTokenAddress: yesTokenAddress, noTokenAddress: noTokenAddress };
  }
  async getYesNoBalancesMarketShareToken(marketAddress) {
    const { accounts, web3 } = this.state.web3Provider;
    const { shareToken, augurFoundry, market, erc20, OUTCOMES } = this.state;

    market.options.address = marketAddress;
    let numTicks = new BN(await market.methods.getNumTicks().call());

    let yesTokenBalanceWithNumTicks = new BN(0);
    let noTokenBalanceWithNumTicks = new BN(0);
    if (accounts[0]) {
      let tokenIds = [];

      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
      );

      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.YES).call()
      );

      let yesTokenBalance = new BN(
        await shareToken.methods.balanceOf(accounts[0], tokenIds[1]).call()
      );
      let noTokenBalance = new BN(
        await shareToken.methods.balanceOf(accounts[0], tokenIds[0]).call()
      );

      yesTokenBalanceWithNumTicks = yesTokenBalance.mul(numTicks);
      noTokenBalanceWithNumTicks = noTokenBalance.mul(numTicks);
    }
    return {
      yesTokenBalance: yesTokenBalanceWithNumTicks,
      noTokenBalance: noTokenBalanceWithNumTicks,
    };
  }

  async checkIfMoreThanZeroERC20s(wrappedBalances) {
    const { accounts } = this.state.web3Provider;
    // console.log("accounts{0}" + accounts[0]);
    // console.log("marketAddress" + marketAddress);

    // let balances = await this.getYesNoBalancesMarketERC20(marketAddress);

    if (
      wrappedBalances.yesTokenBalance.cmp(new BN(0)) == 0 &&
      wrappedBalances.noTokenBalance.cmp(new BN(0)) == 0
    )
      return false;
    else {
      return true;
    }
  }
  async checkIfMoreThanZeroShares(shareTokenBalances) {
    if (
      shareTokenBalances.yesTokenBalance.cmp(new BN(0)) == 0 &&
      shareTokenBalances.noTokenBalance.cmp(new BN(0)) == 0
    ) {
      // console.log(false);
      return false;
    } else {
      // console.log(true);
      return true;
    }
  }

  openNotification = (type, title, description, duration) => {
    if (duration == undefined) {
      duration = 15;
    } else {
      duration = duration;
    }
    // const { notification } = antd;
    notification[type]({
      message: title,
      duration: duration,
      description: description,
    });
  };
  timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time =
      date + " " + month + " " + year + " " + hour + ":" + min + "(UTC)";
    return time;
  }
  showMarketInfoOnHover(marketId) {
    // let desciption = markets[marketId].desciption;
    let longDescription = markets[marketId].extraInfo.longDescription;
    let endTimeUnix = markets[marketId].endTime;
    let date = this.timeConverter(endTimeUnix);

    
      //"Resolution Details: " + longDescription + "\nMarket Ends on: " + date
    return (
      <Popover  >
        <Popover.Title as="h3">Info</Popover.Title>
        <Popover.Content>
           Resolution Details:{longDescription} <br/> Market Ends on:{date}
        </Popover.Content>
      </Popover>
    );
  }
  render() {
    return (
      <Container className="p-3 mainContainer">
        <Jumbotron>
          <Jumbotron className="topcorner oi-display">
            <h5>
              <span style={{ color: "#FFFFFF" }}>
                Total Open Interest
                <br />
                <NumberFormat
                  value={this.state.totalOI}
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"$"}
                />
              </span>
            </h5>
          </Jumbotron>
          <h3 className="header">
            <span style={{ color: "#FFA300" }}>AU</span>
            <span style={{ color: "#FFFFFF" }}>
              GUR <br></br> FOUNDRY
            </span>
          </h3>

          <Row>
            <Col xs={7}>
              <Jumbotron className="dropdownMarket">
                <Form onSubmit={this.mintDaiForm}>
                  <Form.Group controlId="exampleForm.SelectCustom">
                    <Form.Control as="select" custom name="marketIds">
                      <option value={0}>Select Market</option>
                      {markets.map((i) => (
                        <option value={i.address} key={i.address}>
                          {i.extraInfo.description}
                        </option>
                      ))}
                    </Form.Control>
                  </Form.Group>

                  <Row>
                    <Col xs={8}>
                      <Form.Group controlId="exampleForm.ControlInput1">
                        <Form.Control
                          type="text"
                          name="amount"
                          placeholder="Amount of DAI"
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={4}>
                      <Button
                        variant="primary"
                        type="submit"
                        block
                        className="mintShare"
                      >
                        MINT SHARES
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </Jumbotron>
            </Col>
          </Row>

          <h3 className="header inventory-header">MY INVENTORY</h3>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th className="market-column">Market</th>
                <th className="holdings-column">Holdings ERC1155</th>
                <th className="holdings-column">Holdings ERC20</th>
                <th>Convert Shares</th>
              </tr>
            </thead>
            <tbody>
              {this.state.listData == null ? (
                <span>Loading...</span>
              ) : (
                this.state.listData
              )}
            </tbody>
          </Table>
        </Jumbotron>
      </Container>
    );
  }
}
