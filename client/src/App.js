import React, { PureComponent } from "react";

import Row from "react-bootstrap/Row";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Jumbotron from "react-bootstrap/Jumbotron";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import { Modal } from "react-bootstrap";

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
    this.onModalSubmit = this.onModalSubmit.bind(this);
    this.state = {
      web3Provider: {
        web3: null,
        metaMaskInstalled: false,
        isLogin: false,
        netWorkId: 0,
        accounts: [],
      },
      listData: null,
      show: false,
      isWrapping: true,
      marketId: null,
      yesAmount: 0,
      noAmount: 0,
      invalidAmount: 0,
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

    if (chainId !== 1) {
      this.openNotification(
        "error",
        "Wrong Network",
        "Please connect to Ethereum mainnet"
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
    let totalOIWei = new BN(
      await universe.methods.getOpenInterestInAttoCash().call()
    );

    // let totalOIEth = web3.utils.fromWei(totalOIWei);
    // //This is a hack for precision when dealing with bignumber
    // let n = totalOIEth.indexOf(".");
    // let totalOI = totalOIEth.substring(0, n != -1 ? n + 3 : totalOIEth.length);
    console.log(web3.utils.fromWei(totalOIWei).toString());
    let foundryTVLWei = new BN(0);
    for (let i = 0; i < markets.length; i++) {
      market.options.address = markets[i].address;
      foundryTVLWei = foundryTVLWei.add(
        new BN(await market.methods.getOpenInterest().call())
      );
    }
    let foundryTVLEth = web3.utils.fromWei(foundryTVLWei);
    //This is a hack for precision when dealing with bignumber
    let n = foundryTVLEth.indexOf(".");
    let foundryTVL = foundryTVLEth.substring(
      0,
      n !== -1 ? n + 3 : foundryTVLEth.length
    );
    let foundryPecentageWei = foundryTVLWei
      .mul(new BN(10).pow(new BN(20)))
      .div(totalOIWei);

    let foundryPecentageEth = web3.utils.fromWei(foundryPecentageWei);
    //This is a hack for precision when dealing with bignumber
    n = foundryPecentageEth.indexOf(".");
    let foundryPecentage = foundryPecentageEth.substring(
      0,
      n !== -1 ? n + 3 : foundryPecentageEth.length
    );

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
        // totalOI: totalOI,
        foundryTVL: foundryTVL,
        foundryPecentage: foundryPecentage.toString(),
        chainId: chainId,
      },
      () => {
        this.invetoryInit();
      }
    );
    // notification.destroy();
  }
  showModal = (marketAddress, isWrapping, balances) => {
    const { web3 } = this.state.web3Provider;
    console.log("showModal");
    let defaultValues = {};
    // if (isWrapping) {
    defaultValues.yesAmount = web3.utils.fromWei(balances.yesTokenBalance);
    defaultValues.noAmount = web3.utils.fromWei(balances.noTokenBalance);
    defaultValues.invalidAmount = web3.utils.fromWei(
      balances.invalidTokenBalance
    );

    // }
    this.setState({
      show: true,
      marketAddress: marketAddress,
      isWrapping: isWrapping,
      yesAmount: defaultValues.yesAmount,
      noAmount: defaultValues.noAmount,
      invalidAmount: defaultValues.invalidAmount,
    });
  };

  hideModal = () => {
    this.setState({ show: false });
  };
  async invetoryInit() {
    const { web3 } = this.state.web3Provider;
    const { OUTCOMES, erc20, show, chainId } = this.state;
    let listData = [];
    // let yesTokenAddresses = [];
    // let noTokenAddress = [];
    // console.log(markets);
    this.openNotification("info", "Updating Markets...", "", 5);
    for (let x = 0; x < markets.length; x++) {
      // for (let x = 0; x < 1; x++) {
      // let x = 0;
      let wrappedBalances = await this.getBalancesMarketERC20(
        markets[x].address
      );
      let {
        invalidTokenAddress,
        yesTokenAddress,
        noTokenAddress,
      } = await this.getTokenAddresses(markets[x].address);

      let decimals = new BN(15);
      let multiplier = new BN(3);
      if (chainId == 42) {
        multiplier = new BN(2);
      }
      wrappedBalances.invalidTokenBalance = wrappedBalances.invalidTokenBalance.mul(
        new BN(10).pow(multiplier)
      );
      wrappedBalances.yesTokenBalance = wrappedBalances.yesTokenBalance.mul(
        new BN(10).pow(multiplier)
      );
      wrappedBalances.noTokenBalance = wrappedBalances.noTokenBalance.mul(
        new BN(10).pow(multiplier)
      );

      let shareTokenBalances = await this.getBalancesMarketShareToken(
        markets[x].address
      );
      let isMoreThanZeroShares = await this.checkIfMoreThanZeroShares(
        shareTokenBalances
      );
      let isMoreThanZeroERC20s = await this.checkIfMoreThanZeroERC20s(
        wrappedBalances
      );
      let marketFinalized = await this.isMarketFinalized(markets[x].address);

      let erc20Symbols = await this.getERC20Symbols(markets[x].address);
      // console.log(isMoreThanZeroShares);
      // console.log(isMoreThanZeroERC20s);
      // console.log(x);
      let isMarketsToBeDisplayed = isMoreThanZeroERC20s || isMoreThanZeroShares;
      console.log("displayOfMarket", x, isMarketsToBeDisplayed);
      // if (isMarketsToBeDisplayed) {
      if (true) {
        listData.push(
          <tr>
            <OverlayTrigger
              placement="right"
              overlay={this.showMarketInfoOnHover(x)}
            >
              <td
              // onMouseEnter={() => this.showMarketInfoOnHover(x, true)}
              // onMouseLeave={() => this.showMarketInfoOnHover(x, false)}
              >
                {markets[x].extraInfo.description}
              </td>
            </OverlayTrigger>
            <td>
              Yes:{" "}
              {web3.utils
                .fromWei(shareTokenBalances.yesTokenBalance.toString())
                .toString()}
              <br />
              No:{" "}
              {web3.utils.fromWei(shareTokenBalances.noTokenBalance).toString()}
              <br />
              Invalid:{" "}
              {web3.utils
                .fromWei(shareTokenBalances.invalidTokenBalance)
                .toString()}
            </td>
            <td>
              {erc20Symbols.yesSymbol}:{" "}
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
              {erc20Symbols.noSymbol}:{" "}
              {web3.utils.fromWei(wrappedBalances.noTokenBalance).toString()} (
              <span
                style={{ color: "#ffd790", cursor: "pointer" }}
                onClick={async (event) =>
                  this.addTokenToMetamask(noTokenAddress, x, OUTCOMES.NO)
                }
              >
                Show in wallet
              </span>
              )
              <br />
              {erc20Symbols.invalidSymbol}:{" "}
              {web3.utils
                .fromWei(wrappedBalances.invalidTokenBalance)
                .toString()}{" "}
              (
              <span
                style={{ color: "#ffd790", cursor: "pointer" }}
                onClick={async (event) =>
                  this.addTokenToMetamask(
                    invalidTokenAddress,
                    x,
                    OUTCOMES.INVALID
                  )
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
                      onClick={(e) =>
                        this.showModal(
                          markets[x].address,
                          false,
                          wrappedBalances
                        )
                      }
                    >
                      UNWRAP
                    </Button>
                    <Button
                      variant="danger"
                      type="submit"
                      onClick={(e) =>
                        this.showModal(
                          markets[x].address,
                          true,
                          shareTokenBalances
                        )
                      }
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
                    onClick={(e) =>
                      this.showModal(markets[x].address, false, wrappedBalances)
                    }
                  >
                    UNWRAP
                  </Button>
                ) : (
                  <span>
                    <Button
                      variant="danger"
                      type="submit"
                      onClick={(e) =>
                        this.showModal(
                          markets[x].address,
                          true,
                          shareTokenBalances
                        )
                      }
                    >
                      WRAP SHARES
                    </Button>
                    <Button
                      variant="secondary"
                      className="m-left"
                      type="submit"
                      onClick={(e) => this.redeemDAI(markets[x].address, true)}
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
    }
    //console.log(listData)
    this.setState({ listData: listData });
  }

  async addTokenToMetamask(tokenAddress, index, outcome) {
    const { erc20 } = this.state;
    erc20.options.address = tokenAddress;

    let tokenSymbol = await erc20.methods.symbol().call();

    let decimals = await erc20.methods.decimals().call();
    let tokenImage;
    if (outcome === 1) {
      tokenImage = markets[index].noIcon;
    } else if (outcome === 2) {
      tokenImage = markets[index].yesIcon;
    } else if (outcome === 0) {
      tokenImage = null;
    }
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
            image: tokenImage,
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
  //amounts need to be BN objects with decimals take care of
  async wrapShare(
    marketAddress,
    yesShareAmount,
    noShareAmount,
    invalidShareAmount
  ) {
    // alert(marketAddress);
    if (marketAddress) {
      const { accounts } = this.state.web3Provider;
      const { shareToken, augurFoundry, OUTCOMES } = this.state;

      let isApprovedForAllToAugurFoundry = await shareToken.methods
        .isApprovedForAll(accounts[0], augurFoundry.options.address)
        .call();

      let tokenIds = [];
      let amounts = [];

      if (!invalidShareAmount.isZero()) {
        tokenIds.push(
          await shareToken.methods
            .getTokenId(marketAddress, OUTCOMES.INVALID)
            .call()
        );
        amounts.push(invalidShareAmount.toString());
      }
      if (!yesShareAmount.isZero()) {
        tokenIds.push(
          await shareToken.methods
            .getTokenId(marketAddress, OUTCOMES.YES)
            .call()
        );
        amounts.push(yesShareAmount.toString());
      }
      if (!noShareAmount.isZero()) {
        tokenIds.push(
          await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
        );
        amounts.push(noShareAmount.toString());
      }
      console.log("amounts", amounts);

      // console.log(tokenIds);
      // console.log(markets[0].YesTokenAddress);

      //get the balance of both tokenIds and give the amoun on which is less

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
        await shareToken.methods
          .setApprovalForAll(augurFoundry.options.address, true)
          .send({ from: accounts[0] })
          .on("receipt", (receipt) => {
            this.openNotification(
              "info",
              "Approval successful",
              "Now we can wrap shares"
            );
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
      this.openNotification("info", "Wrapping your shares", "");

      //wrapp all the tokens
      augurFoundry.methods
        .wrapMultipleTokens(tokenIds, accounts[0], amounts)
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
        if (amount.cmp(new BN(0)) === 0) {
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
  //amounts need to be BN objects with decimals take care of
  async unwrapShares(
    marketAddress,
    yesTokenAmount,
    noTokenAmount,
    invalidTokenAmount
  ) {
    const { accounts } = this.state.web3Provider;
    const { augurFoundry, shareToken, OUTCOMES } = this.state;
    if (marketAddress) {
      // const {
      //   invalidTokenBalance,
      //   yesTokenBalance,
      //   noTokenBalance,
      // } = await this.getBalancesMarketERC20(marketAddress);

      let amounts = [];
      let tokenIds = [];
      if (!invalidTokenAmount.isZero()) {
        tokenIds.push(
          await shareToken.methods
            .getTokenId(marketAddress, OUTCOMES.INVALID)
            .call()
        );
        amounts.push(invalidTokenAmount.toString());
      }
      if (!yesTokenAmount.isZero()) {
        tokenIds.push(
          await shareToken.methods
            .getTokenId(marketAddress, OUTCOMES.YES)
            .call()
        );
        amounts.push(yesTokenAmount.toString());
      }
      if (!noTokenAmount.isZero()) {
        tokenIds.push(
          await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
        );
        amounts.push(noTokenAmount.toString());
      }
      console.log("amounts", amounts);
      console.log("tokenIds", tokenIds);

      // let amount =
      //   yesTokenBalance > noTokenBalance ? noTokenBalance : yesTokenBalance;
      this.openNotification("info", "Unwrapping shares", "");
      augurFoundry.methods
        .unWrapMultipleTokens(tokenIds, amounts)
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

  async getBalancesMarketERC20(marketAddress) {
    const { accounts } = this.state.web3Provider;
    const { shareToken, augurFoundry, erc20, OUTCOMES } = this.state;
    let invalidTokenBalance = new BN(0);
    let yesTokenBalance = new BN(0);
    let noTokenBalance = new BN(0);

    if (accounts[0]) {
      let {
        invalidTokenAddress,
        yesTokenAddress,
        noTokenAddress,
      } = await this.getTokenAddresses(marketAddress);
      // console.log("yesTOkenAddress" + yesTokenAddress);
      // console.log("accounts{0}" + accounts[0]);
      // console.log(noTokenAddress);
      // console.log(yesTokenAddress);
      invalidTokenBalance = await this.getBalanceOfERC20(
        invalidTokenAddress,
        accounts[0]
      );
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
      invalidTokenBalance: invalidTokenBalance,
    };
  }
  async getTokenAddresses(marketAddress) {
    const { shareToken, augurFoundry, OUTCOMES } = this.state;
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
      await shareToken.methods.getTokenId(marketAddress, OUTCOMES.YES).call()
    );
    let invalidTokenAddress = await augurFoundry.methods
      .wrappers(tokenIds[0])
      .call();
    let noTokenAddress = await augurFoundry.methods
      .wrappers(tokenIds[1])
      .call();
    let yesTokenAddress = await augurFoundry.methods
      .wrappers(tokenIds[2])
      .call();

    return {
      yesTokenAddress: yesTokenAddress,
      noTokenAddress: noTokenAddress,
      invalidTokenAddress: invalidTokenAddress,
    };
  }
  async getERC20Symbols(marketAddress) {
    const { erc20 } = this.state;
    let {
      yesTokenAddress,
      noTokenAddress,
      invalidTokenAddress,
    } = await this.getTokenAddresses(marketAddress);

    erc20.options.address = yesTokenAddress;
    let yesSymbol = await erc20.methods.symbol().call();
    erc20.options.address = noTokenAddress;
    let noSymbol = await erc20.methods.symbol().call();
    erc20.options.address = invalidTokenAddress;
    let invalidSymbol = await erc20.methods.symbol().call();

    return {
      yesSymbol: yesSymbol,
      noSymbol: noSymbol,
      invalidSymbol: invalidSymbol,
    };
  }
  async getBalancesMarketShareToken(marketAddress) {
    const { accounts, web3 } = this.state.web3Provider;
    const { shareToken, augurFoundry, market, erc20, OUTCOMES } = this.state;

    market.options.address = marketAddress;
    let numTicks = new BN(await market.methods.getNumTicks().call());

    let invalidTokenBalanceWithNumTicks = new BN(0);
    let yesTokenBalanceWithNumTicks = new BN(0);
    let noTokenBalanceWithNumTicks = new BN(0);

    if (accounts[0]) {
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
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.YES).call()
      );

      let invalidTokenBalance = new BN(
        await shareToken.methods.balanceOf(accounts[0], tokenIds[0]).call()
      );
      let yesTokenBalance = new BN(
        await shareToken.methods.balanceOf(accounts[0], tokenIds[2]).call()
      );
      let noTokenBalance = new BN(
        await shareToken.methods.balanceOf(accounts[0], tokenIds[1]).call()
      );
      invalidTokenBalanceWithNumTicks = invalidTokenBalance.mul(numTicks);
      yesTokenBalanceWithNumTicks = yesTokenBalance.mul(numTicks);
      noTokenBalanceWithNumTicks = noTokenBalance.mul(numTicks);
    }
    return {
      invalidTokenBalance: invalidTokenBalanceWithNumTicks,
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
      wrappedBalances.noTokenBalance.cmp(new BN(0)) == 0 &&
      wrappedBalances.invalidTokenBalance.cmp(new BN(0)) == 0
    )
      return false;
    else {
      return true;
    }
  }
  async checkIfMoreThanZeroShares(shareTokenBalances) {
    if (
      shareTokenBalances.yesTokenBalance.cmp(new BN(0)) == 0 &&
      shareTokenBalances.noTokenBalance.cmp(new BN(0)) == 0 &&
      shareTokenBalances.invalidTokenBalance.cmp(new BN(0)) == 0
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
    var time = a.toLocaleString("en-US", { timeZoneName: "short" });
    return time;
  }
  showMarketInfoOnHover(marketId) {
    // let desciption = markets[marketId].desciption;
    let longDescription = markets[marketId].extraInfo.longDescription;
    let endTimeUnix = markets[marketId].endTime;
    let date = this.timeConverter(endTimeUnix);

    //"Resolution Details: " + longDescription + "\nMarket Ends on: " + date
    return (
      <Popover>
        {/* <Popover.Title as="h3">Info</Popover.Title> */}
        <Popover.Content>
          MARKET ENDS ON : {date} <br />
          <br />
          RESOLUTION DETAILS :<br />
          {longDescription}
          <br />
          <br />
          MARKET ID : {markets[marketId].address}
        </Popover.Content>
      </Popover>
    );
  }
  handleChange = async (e) => {
    console.log("handle change");
    console.log(e.target.name);
    this.setState({ [e.target.name]: e.target.value });
  };
  onModalSubmit = async (e) => {
    const { marketAddress, isWrapping } = this.state;
    const { web3 } = this.state.web3Provider;
    // let marketAddress = "0x4dea3bedae79da692f2675038c4d9b8c246b4fb6";
    e.preventDefault();
    let yesAmount = e.target.elements.yesAmount.value;
    let noAmount = e.target.elements.noAmount.value;
    let invalidAmount = e.target.elements.invalidAmount.value;

    console.log(yesAmount, noAmount, invalidAmount);

    let multiplier = new BN(3);
    let chainId = await web3.eth.net.getId();
    if (chainId == 42) {
      multiplier = new BN(2);
    }
    yesAmount = new BN(web3.utils.toWei(yesAmount));
    yesAmount = yesAmount.div(new BN(10).pow(multiplier));

    noAmount = new BN(web3.utils.toWei(noAmount));
    noAmount = noAmount.div(new BN(10).pow(multiplier));

    invalidAmount = new BN(web3.utils.toWei(invalidAmount));
    invalidAmount = invalidAmount.div(new BN(10).pow(multiplier));

    console.log("marketAddress", marketAddress);

    if (isWrapping) {
      await this.wrapShare(marketAddress, yesAmount, noAmount, invalidAmount);
    } else {
      await this.unwrapShares(
        marketAddress,
        yesAmount,
        noAmount,
        invalidAmount
      );
    }
  };
  render() {
    return (
      <Container className="p-3 mainContainer">
        <Jumbotron>
          <Jumbotron className="topcorner oi-display">
            <h5>
              <span className="foundry-tvl" style={{ color: "#FFFFFF" }}>
                Foundry TVL:{" "}
                <NumberFormat
                  value={this.state.foundryTVL}
                  displayType={"text"}
                  thousandSeparator={true}
                  prefix={"$"}
                />
              </span>
              <span className="foundry-percent" style={{ color: "#FFFFFF" }}>
                Portion of Net Augur OI: {this.state.foundryPecentage}%
              </span>
            </h5>
          </Jumbotron>
          <h3 className="header">
            <span style={{ color: "#FFA300" }}>AU</span>
            <span style={{ color: "#FFFFFF" }}>
              GUR <br></br> FOUNDRY
            </span>
          </h3>
          <Modal show={this.state.show} onHide={this.hideModal}>
            <Modal.Header closeButton> </Modal.Header>
            <Form onSubmit={this.onModalSubmit}>
              <Row>
                <Col xs={8}>
                  <Form.Group controlId="modal.ControlInput1">
                    <Form.Label style={{ color: "#040404" }}>Yes: </Form.Label>
                    <Form.Control
                      type="text"
                      name="yesAmount"
                      placeholder="Amount of Yes Shares"
                      value={this.state.yesAmount}
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={8}>
                  <Form.Group controlId="modal.ControlInput2">
                    <Form.Label style={{ color: "#040404" }}>No: </Form.Label>
                    <Form.Control
                      type="text"
                      name="noAmount"
                      placeholder="Amount of No Shares"
                      value={this.state.noAmount}
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={8}>
                  <Form.Group controlId="modal.ControlInput3">
                    <Form.Label style={{ color: "#040404" }}>
                      Invalid:{" "}
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="invalidAmount"
                      placeholder="Amount of Invalid Shares"
                      value={this.state.invalidAmount}
                      onChange={this.handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={4}>
                  {this.state.isWrapping ? (
                    <Button variant="danger" type="submit">
                      WRAP SHARES
                    </Button>
                  ) : (
                    <Button variant="success" className="m-left" type="submit">
                      UNWRAP{" "}
                    </Button>
                  )}
                </Col>
              </Row>
            </Form>
          </Modal>
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

          <Table striped bordered hover>
            <thead>
              <tr>
                <th className="market-column">Market</th>
                <th className="holdings-column">
                  My Shares <span class="faded">(ERC1155)</span>
                </th>
                <th className="holdings-column">
                  My Tokens <span class="faded">(ERC20)</span>
                </th>
                <th>Convert / Redeem</th>
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
          <div className="misc-links">
            <ul class="link-list">
              <li>
                {" "}
                <a
                  href="https://medium.com/sunrise-over-the-merkle-trees/how-to-use-augur-foundry-315f408c0d57"
                  target="_blank"
                >
                  <span class="link_emoji">&#128129;</span>Tutorial
                </a>
              </li>
              <li>
                {" "}
                <a
                  href="https://pools.balancer.exchange/#/pool/0x6b74fb4e4b3b177b8e95ba9fa4c3a3121d22fbfb/"
                  target="_blank"
                >
                  <span class="link_emoji">&#128167;</span>Balancer Pool
                </a>
              </li>
              <li>
                {" "}
                <a href="https://catnip.exchange/" target="_blank">
                  <span class="link_emoji">&#128049;</span>catnip exchange
                </a>
              </li>
              <li>
                {" "}
                <a
                  href="https://github.com/aug-dao/augur_foundry"
                  target="_blank"
                >
                  <span class="link_emoji"> &#128187;</span>Codebase
                </a>
              </li>
            </ul>
          </div>
        </Jumbotron>
      </Container>
    );
  }
}
