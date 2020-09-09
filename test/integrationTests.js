const { BN, time, constants } = require("@openzeppelin/test-helpers");
const { inTransaction } = require("@openzeppelin/test-helpers/src/expectEvent");
const { ZERO_ADDRESS, MAX_UINT256 } = constants;
const { expect } = require("chai");

const {
  createYesNoMarket,
  sellCompleteSets,
  buyCompleteSets,
  getBalanceOfERC20,
  getTokenId,
  getYesNoTokenIds,
  shareTokenApproveForAll,
  getCashFromFaucet,
  unWrapMultipleTokens,
  wrapMultipleTokens,
  createYesNoWrappersForMarket,
  endMarket,
  claimTradingProceeds,
} = require("../scripts/utils");

const markets = require("../markets.json");

// const ERC20Wrapper = artifacts.require("ERC20Wrapper");
// const AugurFoundry = artifacts.require("AugurFoundry");

//the goal here is to test all the function that will be available to the front end
const contracts = require("../contracts.json").contracts;
const addresses = require("../environment.json").addresses;

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

    await createYesNoWrappersForMarket(market.options.address, marketCreator);
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
      //Here there are some fees being deducted thus the constanst 100 is the fees(10%)
      for (outcome in outComes) {
        expect(delta).to.be.bignumber.equal(
          new BN(balanceOfERC1155s[outcome])
            .mul(new BN(numTicks))
            .sub(with18Decimals(new BN(100)))
        );
      }
      // console.log(delta.toString());
      //expect them to be have cash
      //how much?
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
  //so we need unwrap users tokens before redeeming it
  //otherwise there can be case where user has some wrapped and some unwrapped and only unwrapped tokens will be redeemable for DAI
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
      balanceOfERC1155s = [];
      for (outcome in outComes) {
        tokenId = await getTokenId(market.options.address, outcome);
        balanceOfERC1155s.push(
          await getBlanceOfShareToken(testAccount, tokenId)
        );
      }
      // console.log(balanceOfERC1155s);

      cashBalanceTestAccount = await getBalanceOfERC20(cash, testAccount);
      //2 means yes outcome wins
      await endMarket(market.options.address, marketCreator, 2);
    });
    afterEach(async function () {
      balanceOfERC1155sAfter = [];
      for (outcome in outComes) {
        tokenId = await getTokenId(market.options.address, outcome);
        let balance = await getBlanceOfShareToken(testAccount, tokenId);
        balanceOfERC1155sAfter.push(balance);
        //every thing just got sold for the cash
        expect(balance).to.be.bignumber.equal("0");
      }
      // console.log(balanceOfERC1155sAfter);

      cashBalanceTestAccountAfter = await getBalanceOfERC20(cash, testAccount);
      // console.log(cashBalanceTestAccountAfter);
      let delta = cashBalanceTestAccountAfter.sub(cashBalanceTestAccount);
      let numTicks = 1000;
      //fees = 10%
      //Here there are some fees being deducted thus the constanst 100 is the fees(10%)
      //NOTE: ADD the exact test here
      // for (outcome in outComes) {
      //   expect(delta).to.be.bignumber.equal(
      //     new BN(balanceOfERC1155s[outcome])
      //       .mul(new BN(numTicks))
      //       .sub(with18Decimals(new BN(100)))
      //   );
      // }
      // console.log(delta.toString());
    });
    it("when tokens are not wrapped and market is finalized", async function () {
      //wrap them
      let tokenIds = await getYesNoTokenIds(market.options.address);
      //need to give approval to the augur foundry contract
      await claimTradingProceeds(market.options.address, testAccount);
    });
  });
});
