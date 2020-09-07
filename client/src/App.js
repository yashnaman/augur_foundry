import React, { PureComponent } from "react";

import Row from "react-bootstrap/Row";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Jumbotron from "react-bootstrap/Jumbotron";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import metaMaskStore from "./components/metaMask";
import { BN, constants } from "@openzeppelin/test-helpers";

import markets from "./markets.json";
import contracts from "./configs/contracts.json";
import environment from "./configs/environment.json";

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
      this.initData();
    });
  }

  async initData() {
    const { web3 } = this.state.web3Provider;
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

    this.setState(
      {
        cash: cash,
        shareToken: shareToken,
        market: market,
        universe: universe,
        augur: augur,
        augurFoundry: augurFoundry,
        erc20: erc20,
        OUTCOMES: OUTCOMES,
      },
      () => {
        this.invetoryInit();
      }
    );
  }

  async invetoryInit() {
    const { web3 } = this.state.web3Provider;
    let listData = [];
    console.log(markets);
    for (let x = 0; x < markets.length; x++) {
      let YN_balance = await this.getYesNoBalancesMarketERC20(
        markets[x].address
      );
      let shareTokenBlances = await this.getYesNoBalancesMarketShareToken(
        markets[x].address
      );
      listData.push(
        <tr>
          <td>{markets[x].extraInfo.description}</td>
          <td>
            Yes : {web3.utils.fromWei(YN_balance.yesTokenBalance).toString()}
            <br />
            No : {web3.utils.fromWei(YN_balance.noTokenBalance).toString()}
          </td>
          <td>
            Yes :{" "}
            {web3.utils.fromWei(shareTokenBlances.yesTokenBalance).toString()}
            <br />
            No :{" "}
            {web3.utils.fromWei(shareTokenBlances.noTokenBalance).toString()}
          </td>
          <td>
            {(await this.checkDAICondition(markets[x].address)) ? (
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
            ) : (
              <Button
                variant="success"
                type="submit"
                onClick={(e) => this.unwrapShares(markets[x].address)}
              >
                UNWRAP
              </Button>
            )}
          </td>
        </tr>
      );
    }
    //console.log(listData)
    this.setState({ listData: listData });
  }

  getBalance(marketAddress) {
    // This is not working either
    // Make this work
    // let {
    //   yesTokenBalance,
    //   noTokenBalance,
    // } = await this.getYesNoBalancesMarketERC20();
    // return yesTokenBalance;
    return 100;
  }

  async mintDaiForm(e) {
    e.preventDefault();
    const { web3, accounts } = this.state.web3Provider;

    const { cash, shareToken, market, augur } = this.state;

    // const marketIds = e.target.elements.marketIds.value;
    const marketAddress = e.target.elements.marketIds.value;
    let amount = e.target.elements.amount.value;

    // const daiBalance = await daiInstance.methods.balanceOf(accounts[0]).call();

    //NOTE : remove inconsitencies in new BN
    if (web3.utils.isAddress(marketAddress) && amount) {
      let weiAmount = web3.utils.toWei(amount);
      weiAmount = new BN(weiAmount);
      market.options.address = marketAddress;
      let balance = new BN(await cash.methods.balanceOf(accounts[0]).call());
      let numTicks = new BN(await market.methods.getNumTicks().call());

      //we need the account to have more than amount.mul(numTicks) balance
      //we can hardcode numTicks to 1000 for YES/NO markets
      if (weiAmount.mul(numTicks).cmp(new BN(balance)) == 1) {
        //weiAmount > balance
        //await Promise.reject(new Error("Not Enough balance to buy complete sets"));
        alert(
          "Not enough cash (get some from this privkey: 0xfae42052f82bed612a724fec3632f325f377120592c75bb78adfcceae6470c5a)"
        );
        return;
      }

      let allowance = await cash.methods
        .allowance(accounts[0], augur.options.address)
        .call();

      if (weiAmount.mul(numTicks).cmp(new BN(allowance)) == 1) {
        console.log("allowance");
        await cash.methods
          .approve(augur.options.address, constants.MAX_UINT256.toString())
          .send({ from: accounts[0] });
      }
      console.log("Before buy complete sets");
      console.log(marketAddress);
      //buy the complete sets
      await shareToken.methods
        .buyCompleteSets(marketAddress, accounts[0], weiAmount.toString())
        .send({ from: accounts[0] });
    } else {
      alert("select a market & enter amount ");
    }
    await this.initData();
  }

  async wrapShare(marketAddress) {
    // alert(marketAddress);
    if (marketAddress) {
      const { accounts } = this.state.web3Provider;
      const { shareToken, augurFoundry, OUTCOMES } = this.state;

      let isApprovedForAllToAugurFoundry = await shareToken.methods
        .isApprovedForAll(accounts[0], augurFoundry.options.address)
        .call();
      if (!isApprovedForAllToAugurFoundry) {
        await shareToken.methods
          .setApprovalForAll(augurFoundry.options.address, true)
          .send({ from: accounts[0] });
      }
      let tokenIds = [];
      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
      );
      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.YES).call()
      );
      console.log(tokenIds);
      console.log(markets[0].YesTokenAddress);

      //get the balance of both tokenIds and give the amoun on which is less
      let yesShareBalance = await shareToken.methods
        .balanceOf(accounts[0], tokenIds[1])
        .call();
      let noShareBalance = await shareToken.methods
        .balanceOf(accounts[0], tokenIds[0])
        .call();
      console.log(yesShareBalance);
      let amount =
        yesShareBalance > noShareBalance ? noShareBalance : yesShareBalance;
      console.log(amount);
      console.log("before Wrapping");
      //wrapp all the tokens
      await augurFoundry.methods
        .wrapMultipleTokens(tokenIds, accounts[0], amount)
        .send({ from: accounts[0] });
    }
    await this.initData();
  }
  async redeemDAI(marketAddress) {
    //check if market has finalized if it has call the claim trading proceeds
    //if not call the buy completeshares
    const { web3, accounts } = this.state.web3Provider;
    const { shareToken, augurFoundry, OUTCOMES } = this.state;
    if (marketAddress) {
      let isMarketFinalized = await this.isMarketFinalized(marketAddress);

      let isApprovedForAllToAugurFoundry = await shareToken.methods
        .isApprovedForAll(accounts[0], augurFoundry.options.address)
        .call();
      if (!isApprovedForAllToAugurFoundry) {
        console.log("approving shareTokens");
        await shareToken.methods
          .setApprovalForAll(augurFoundry.options.address, true)
          .send({ from: accounts[0] });
      }
      //end a market to do this
      if (isMarketFinalized) {
        console.log("claiming trading proceeds");
        //last arg is for fingerprint that has something to do with affiliate fees(NOTE: what exactly?)

        await shareToken.methods
          .claimTradingProceeds(
            marketAddress,
            accounts[0],
            web3.utils.fromAscii("")
          )
          .send({ from: accounts[0] });
      } else {
        //here check the minimum of token balances
        //this should be a function
        let tokenIds = [];
        tokenIds.push(
          await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
        );
        tokenIds.push(
          await shareToken.methods
            .getTokenId(marketAddress, OUTCOMES.YES)
            .call()
        );

        //get the balance of both tokenIds and give the amoun on which is less
        let yesShareBalance = await shareToken.methods
          .balanceOf(accounts[0], tokenIds[1])
          .call();
        let noShareBalance = await shareToken.methods
          .balanceOf(accounts[0], tokenIds[0])
          .call();
        console.log(yesShareBalance);
        let amount =
          yesShareBalance > noShareBalance ? noShareBalance : yesShareBalance;
        console.log(amount);
        await shareToken.methods
          .sellCompleteSets(
            marketAddress,
            accounts[0],
            accounts[0],
            amount.toString(),
            web3.utils.fromAscii("")
          )
          .send({ from: accounts[0] });
      }
    }
    await this.initData();
  }

  async getBalanceOfERC20(tokenAddress, account) {
    console.log("getBlanecERC20" + account);
    const { erc20 } = this.state;
    erc20.options.address = tokenAddress;
    return new BN(await erc20.methods.balanceOf(account).call());
  }

  async isMarketFinalized(marketAddress) {
    const { market } = this.state;
    market.options.address = marketAddress;
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
      let amount =
        yesTokenBalance > noTokenBalance ? noTokenBalance : yesTokenBalance;
      await augurFoundry.methods
        .unWrapMultipleTokens(tokenIds, constants.MAX_UINT256.toString())
        .send({ from: accounts[0] });
    }
    await this.initData();
  }

  async getYesNoBalancesMarketERC20(marketAddress) {
    const { accounts } = this.state.web3Provider;
    const { shareToken, augurFoundry, erc20, OUTCOMES } = this.state;
    let yesTokenBalance = new BN(0);
    let noTokenBalance = new BN(0);
    if (accounts[0]) {
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
      console.log("yesTOkenAddress" + yesTokenAddress);
      console.log("accounts{0}" + accounts[0]);

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
  async getYesNoBalancesMarketShareToken(marketAddress) {
    const { accounts } = this.state.web3Provider;
    const { shareToken, augurFoundry, erc20, OUTCOMES } = this.state;
    let yesTokenBalance = new BN(0);
    let noTokenBalance = new BN(0);
    if (accounts[0]) {
      let tokenIds = [];

      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.NO).call()
      );

      tokenIds.push(
        await shareToken.methods.getTokenId(marketAddress, OUTCOMES.YES).call()
      );

      yesTokenBalance = new BN(
        await shareToken.methods.balanceOf(accounts[0], tokenIds[1]).call()
      );
      noTokenBalance = new BN(
        await shareToken.methods.balanceOf(accounts[0], tokenIds[1]).call()
      );
    }
    return {
      yesTokenBalance: yesTokenBalance,
      noTokenBalance: noTokenBalance,
    };
  }

  async checkDAICondition(marketAddress) {
    const { accounts } = this.state.web3Provider;
    console.log("accounts{0}" + accounts[0]);
    console.log("marketAddress" + marketAddress);

    let balances = await this.getYesNoBalancesMarketERC20(marketAddress);

    if (
      balances.yesTokenBalance.cmp(new BN(0)) != 0 ||
      balances.noTokenBalance.cmp(new BN(0)) != 0
    )
      return false;
    else {
      return true;
    }
  }

  render() {
    return (
      <Container className="p-3 mainContainer">
        <Jumbotron>
          <h3 className="header">
            <span style={{ color: "#FFA300" }}>AU</span>GUR <br></br> FOUNDRY
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
                          placeholder="ENTER AMOUNT OF DAI"
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

          <h3 className="header">MY INVETORY</h3>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Market</th>
                <th>Holdings ERC20</th>
                <th>Holdings ERC1155</th>
                <th></th>
              </tr>
            </thead>
            <tbody>{this.state.listData}</tbody>
          </Table>
        </Jumbotron>
      </Container>
    );
  }
}
