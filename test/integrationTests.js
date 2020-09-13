const {
  BN,
  time,
  constants,
  expectEvent,
} = require("@openzeppelin/test-helpers");

const { ZERO_ADDRESS, MAX_UINT256 } = constants;
const { expect } = require("chai");

const {
  createYesNoMarket,
  sellCompleteSets,
  buyCompleteSets,
  getBalanceOfERC20,
  getTokenId,
  getYesNoTokenIds,
  getCashFromFaucet,
  unWrapMultipleTokens,
  wrapMultipleTokens,
  createYesNoWrappersForMarket,
  endMarket,
  claimWinningsWhenWrapped,
} = require("../scripts/utils");

const markets = require("../markets/markets-local.json");

// const ERC20Wrapper = artifacts.require("ERC20Wrapper");
// const AugurFoundry = artifacts.require("AugurFoundry");

//the goal here is to test all the function that will be available to the front end
const contracts = require("../contracts.json").contracts;
const addresses = require("../environments/environment-local.json").addresses;

const augurFoundry = new web3.eth.Contract(
  contracts["AugurFoundry.sol"].AugurFoundry.abi,
  markets[0].augurFoundryAddress
);
const universe = new web3.eth.Contract(
  contracts["reporting/Universe.sol"].Universe.abi,
  addresses.Universe
);
const augur = new web3.eth.Contract(
  contracts["Augur.sol"].Augur.abi,
  addresses.Augur
);

const erc20 = new web3.eth.Contract(contracts["Cash.sol"].Cash.abi);
const repToken = erc20;
//This is the DAI token
const cash = new web3.eth.Contract(
  contracts["Cash.sol"].Cash.abi,
  addresses.Cash
);
const shareToken = new web3.eth.Contract(
  contracts["reporting/ShareToken.sol"].ShareToken.abi,
  addresses.ShareToken
);
const market = new web3.eth.Contract(
  contracts["reporting/Market.sol"].Market.abi
);

const timeControlled = new web3.eth.Contract(
  contracts["TimeControlled.sol"].TimeControlled.abi,
  addresses.TimeControlled
);

const with18Decimals = function (amount) {
  return amount.mul(new BN(10).pow(new BN(18)));
};
const THOUSAND = with18Decimals(new BN(1000));

//For A YES/No market the outcomes will be three
const OUTCOMES = { INVALID: 0, NO: 1, YES: 2 };
const outComes = [0, 1, 2];
// Object.freeze(outComes);

const getBlanceOfShareToken = async function (address, tokenId) {
  return await shareToken.methods.balanceOf(address, tokenId).call();
};
var wrappers = [];
contract("Intergration test", function (accounts) {
  //There are only three accounts that geth exposes
  //give tem meaning ful name later
  [marketCreator, testAccount, otherAccount] = accounts;
  // console.log(accounts);

  //The code in beforeEach will be executed already
  beforeEach(async function () {
    //set up the seen

    let marketAddress = await createYesNoMarket(
      marketCreator,
      markets[0].extraInfo
    );
    market.options.address = marketAddress;

    wrappers = await createYesNoWrappersForMarket(
      market.options.address,
      marketCreator
    );
    //create wrappers

    // console.log(market.options.address);
  });
  //lets check market's info
  it("checking market info", async function () {
    //since it is a yes/no market
    expect(await market.methods.getNumTicks().call()).to.be.bignumber.equal(
      "1000"
    ); //in v2 these are 1000 instead of 100
    expect(
      await market.methods.getNumberOfOutcomes().call()
    ).to.be.bignumber.equal("3"); //INVALID/YES/NO
  });
  //lets test the buy complete shares
  it("should be able to buy complete shares", async function () {
    let numTicks = new BN(await market.methods.getNumTicks().call());
    const amount = THOUSAND;
    // console.log(market.options.address);
    //get cash from faucet for testing purposes
    await cash.methods
      .faucet(amount.mul(numTicks).toString())
      .send({ from: testAccount });

    let cashBalanceTestAccount = await cash.methods
      .balanceOf(testAccount)
      .call();
    //add revert test when the balance is less than amount * numticks
    await buyCompleteSets(market.options.address, testAccount, amount);
    //let's check if it really happened
    //get the tokenIds of the market
    let tokenIds = await shareToken.methods
      .getTokenIds(market.options.address, outComes)
      .call();
    // console.log(tokenIds);

    //now lets check balance of these that should be equal to amount
    for (i in tokenIds) {
      expect(
        await shareToken.methods.balanceOf(testAccount, tokenIds[i]).call()
      ).to.be.bignumber.equal(amount);
    }
    //check the balance of tokenAccount should have  been decraesed
    let cashBalanceTestAccountAfter = await cash.methods
      .balanceOf(testAccount)
      .call();
    let delta = new BN(cashBalanceTestAccount).sub(
      new BN(cashBalanceTestAccountAfter)
    );

    expect(delta).to.be.bignumber.equal(amount.mul(numTicks));
  });
  //Try selling completeshares when you have them in ERC1155s
  describe("sell complete shares", async function () {
    const amount = THOUSAND;
    var cashBalanceTestAccount;
    var cashBalanceTestAccountAfter;
    var balanceOfERC1155s = [];
    var balanceOfERC1155sAfter = [];
    beforeEach(async function () {
      let numTicks = new BN(await market.methods.getNumTicks().call());

      //to sell you to buy it first
      await cash.methods
        .faucet(amount.mul(numTicks).toString())
        .send({ from: testAccount });
      //await getCashFromFaucet(testAccount, amount.mul(numTicks));

      //add revert test when the balance is less than amount * numticks
      await buyCompleteSets(market.options.address, testAccount, amount);
      balanceOfERC1155s = [];
      for (outcome in outComes) {
        tokenId = await getTokenId(market.options.address, outcome);
        balanceOfERC1155s.push(
          await getBlanceOfShareToken(testAccount, tokenId)
        );
      }
      // console.log(balanceOfERC1155s);

      cashBalanceTestAccount = await getBalanceOfERC20(cash, testAccount);
      // console.log(cashBalanceTestAccount);
      //get the cash balance
    });
    afterEach(async function () {
      balanceOfERC1155sAfter = [];
      for (outcome in outComes) {
        tokenId = await getTokenId(market.options.address, outcome);
        balanceOfERC1155sAfter.push(
          await getBlanceOfShareToken(testAccount, tokenId)
        );
      }
      // console.log(balanceOfERC1155sAfter);

      cashBalanceTestAccountAfter = await getBalanceOfERC20(cash, testAccount);
      // console.log(cashBalanceTestAccountAfter);
      let delta = cashBalanceTestAccountAfter.sub(cashBalanceTestAccount);
      let numTicks = 1000;
      //fees = 10%
      //Here there are some fees being deducted thus the constanst 100 is the fees(10% of 1000*10^18)
      for (outcome in outComes) {
        expect(delta).to.be.bignumber.equal(
          new BN(balanceOfERC1155s[outcome])
            .mul(new BN(numTicks))
            .sub(with18Decimals(new BN(100)))
        );
      }
      // console.log(delta.toString());
    });
    it("when tokens are not wrapped", async function () {
      await sellCompleteSets(
        market.options.address,
        testAccount,
        testAccount,
        amount,
        web3.utils.fromAscii("")
      );
    });
    //should there be a function that does this in one transaction??
    //Right now it requires two transactions , unwrap + sellcomplete shares
    it("when tokens are wrapped", async function () {
      //lets wrap the yes/no tokens
      let tokenIds = await getYesNoTokenIds(market.options.address);
      //need to give approval to the augur foundry contract
      //await shareTokenApproveForAll(testAccount, this.augurFoundry.address);

      await wrapMultipleTokens(tokenIds, testAccount, [amount, amount]);

      for (i in tokenIds) {
        expect(
          await getBlanceOfShareToken(testAccount, tokenIds[i])
        ).to.be.bignumber.equal("0");
      }
      // console.log(
      //   (await getBlanceOfShareToken(testAccount, tokenIds[0])).toString()
      // );

      //now let's unwrap + sell
      await unWrapMultipleTokens(tokenIds, testAccount, [amount, amount]);
      // console.log(
      //   (await getBlanceOfShareToken(testAccount, tokenIds[0])).toString()
      // );
      for (i in tokenIds) {
        expect(
          await getBlanceOfShareToken(testAccount, tokenIds[i])
        ).to.be.bignumber.equal(amount);
      }

      await sellCompleteSets(
        market.options.address,
        testAccount,
        testAccount,
        amount,
        web3.utils.fromAscii("")
      );
    });
  });

  describe("should be able to claim winning proceeds", async function () {
    const amount = THOUSAND;
    var cashBalanceTestAccount;
    var cashBalanceTestAccountAfter;
    var balanceOfERC1155s = [];
    var balanceOfERC1155sAfter = [];
    beforeEach(async function () {
      //end the market
      let numTicks = new BN(await market.methods.getNumTicks().call());

      //to sell you to buy it first
      await getCashFromFaucet(testAccount, amount.mul(numTicks));

      //add revert test when the balance is less than amount * numticks
      await buyCompleteSets(market.options.address, testAccount, amount);

      cashBalanceTestAccount = await getBalanceOfERC20(cash, testAccount);
      balanceOfERC1155s = [];
      for (outcome in outComes) {
        tokenId = await getTokenId(market.options.address, outcome);
        balanceOfERC1155s.push(
          await getBlanceOfShareToken(testAccount, tokenId)
        );
      }
      // console.log(balanceOfERC1155s);

      //2 means yes outcome wins
      if (!(await market.methods.isFinalized().call()))
        await endMarket(market.options.address, marketCreator, OUTCOMES.YES);
    });
    afterEach(async function () {
      balanceOfERC1155sAfter = [];
      let tokenIds = await getYesNoTokenIds(market.options.address);
      for (i in tokenIds) {
        let balance = await getBlanceOfShareToken(testAccount, tokenIds[i]);
        balanceOfERC1155sAfter.push(balance);
        //every thing just got sold for the cash
        expect(balance).to.be.bignumber.equal("0");
      }
      cashBalanceTestAccountAfter = await getBalanceOfERC20(cash, testAccount);
      let numTicks = new BN(1000);
      let delta = cashBalanceTestAccountAfter.sub(cashBalanceTestAccount);
      let fees = amount.mul(new BN(10)).div(new BN(100));
      expect(delta).to.be.bignumber.equal(amount.mul(numTicks).sub(fees));
      //     // console.log(cashBalanceTestAccountAfter);
    });
    it("when tokens are wrapped and market is finalized", async function () {
      //we should not have a claim multiple tokens method because we know
      //wrap the tokens
      let tokenIds = await getYesNoTokenIds(market.options.address);
      await wrapMultipleTokens(tokenIds, testAccount, [amount, amount]);
      let web3Receipt = await claimWinningsWhenWrapped(
        market.options.address,
        testAccount
      );
      // console.log(web3Receipt);
      //10%fees
      let fees = amount.mul(new BN(10)).div(new BN(100));
      let numTicks = new BN(1000);

      //YES is the winning outcome
      let yesWrapperAddress = await augurFoundry.methods
        .wrappers(tokenIds[1])
        .call();
      //cash gets from shareToken to the wrapper contract
      await expectEvent.inTransaction(
        web3Receipt.transactionHash,
        cash,
        "Transfer",
        {
          from: shareToken.options.address,
          to: yesWrapperAddress,
          value: amount.mul(numTicks).sub(fees),
        }
      );
      await expectEvent.inTransaction(
        web3Receipt.transactionHash,
        augur,
        "TradingProceedsClaimed",
        {
          universe: universe.options.address,
          market: market.options.address,
          outcome: OUTCOMES.YES.toString(),
          numShares: amount,
          numPayoutTokens: amount.mul(numTicks).sub(fees), //10%fees
          fees: fees,
        }
      );
      //The ERC20 wrappers get burnt
      await expectEvent.inTransaction(
        web3Receipt.transactionHash,
        cash,
        "Transfer",
        { from: testAccount, to: ZERO_ADDRESS, value: amount }
      );
      //Cash gets transferred to testAccount
      await expectEvent.inTransaction(
        web3Receipt.transactionHash,
        cash,
        "Transfer",
        {
          from: yesWrapperAddress,
          to: testAccount,
          value: amount.mul(numTicks).sub(fees),
        }
      );
    });
  });
});
