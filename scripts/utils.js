const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");

const web3 = new Web3(provider);

const { BN, time, constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const ERC20Wrapper = artifacts.require("ERC20Wrapper");
const AugurFoundry = artifacts.require("AugurFoundry");

//the goal here is to test all the function that will be available to the front end
const contracts = require("../contracts.json").contracts;
const addresses = require("../environment.json").addresses;
const markets = require("../markets.json");

const augurFoundry = new web3.eth.Contract(
  contracts["AugurFoundry.sol"].AugurFoundry.abi
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

const with18Decimals = function (amount) {
  return amount.mul(new BN(10).pow(new BN(18)));
};
const THOUSAND = with18Decimals(new BN(1000));

//For A YES/No market the outcomes will be three
const OUTCOMES = { INVALID: 0, NO: 1, YES: 2 };
const outComes = [0, 1, 2];
// Object.freeze(outComes);

//Make below function availbe in a file as a module
const createYesNoMarket = async function (marketCreator, marketExtraInfo) {
  const repAddress = await universe.methods.getReputationToken().call();
  // console.log(repAddress);
  repToken.options.address = repAddress;
  // console.log(await getBalanceOf(repToken, marketCreator));
  //approve rep token to the augur to be able to create the market
  await repToken.methods
    .approve(augur.options.address, MAX_UINT256.toString())
    .send({ from: marketCreator });

  //get the cash for theAccount from faucet method
  await cash.methods.faucet(THOUSAND.toString()).send({ from: marketCreator });
  //Allow cash to the augur
  await cash.methods
    .approve(augur.options.address, MAX_UINT256.toString())
    .send({ from: marketCreator });

  // console.log(await getBalanceOf(cash, marketCreator));

  let currentTime = await time.latest();
  let endTime = currentTime.add(new BN(3600 * 4));
  let feePerCashInAttoCash = 0;
  let affiliateValidator = ZERO_ADDRESS;
  let affiliateFeeDivisor = 0;
  let designatedReporterAddress = marketCreator;
  // let extraInfo = "none";
  let extraInfo = JSON.stringify(marketExtraInfo);
  console.log("Before Market Creation");
  await universe.methods
    .createYesNoMarket(
      endTime.toString(),
      feePerCashInAttoCash,
      affiliateValidator,
      affiliateFeeDivisor,
      designatedReporterAddress,
      extraInfo
    )
    .send({ from: marketCreator });

  return await getLatestMarket();
};

//Buys complete shares for a given market for a given amount for a given account
const buyCompleteSets = async function (marketAddress, account, amount) {
  //NOTE : remove inconsitencies in new BN
  market.options.address = marketAddress;
  let balance = await getBalanceOfERC20(cash, account);
  let numTicks = new BN(await await market.methods.getNumTicks().call());

  //we need the account to have more than amount.mul(numTicks) balance
  //we can hardcode numTicks to 1000 for YES/NO markets
  if (amount.mul(numTicks).cmp(new BN(balance)) == 1) {
    //amount > balance
    //await Promise.reject(new Error("Not Enough balance to buy complete sets"));
    throw new Error("Not Enough balance to buy complete sets");
  }

  let allowance = await cash.methods
    .allowance(account, augur.options.address)
    .call();

  if (amount.mul(numTicks).cmp(new BN(allowance)) == 1) {
    await cash.methods
      .approve(augur.options.address, MAX_UINT256.toString())
      .send({ from: account });
  }
  console.log("Before buy complete sets");
  console.log(marketAddress);
  //buy the complete sets
  await shareToken.methods
    .buyCompleteSets(marketAddress, account, amount.toString())
    .send({ from: account });
};
//NOTE: Find a way to generate a legitimate fingerPrint
const sellCompleteSets = async function (
  marketAddress,
  account,
  recipient,
  amount,
  fingerprint
) {
  let isApprovedForAllToAugur = await shareToken.methods
    .isApprovedForAll(account, augur.options.address)
    .call();
  if (!isApprovedForAllToAugur) {
    await shareToken.methods
      .setApprovalForAll(augur.options.address, true)
      .send({ from: account });
  }
  await shareToken.methods
    .sellCompleteSets(
      marketAddress,
      account,
      recipient,
      amount.toString(),
      fingerprint
    )
    .send({ from: account });
};
const shareTokenApproveForAll = async function (account, operator) {
  let isApprovedForAllToAugurFoundry = await shareToken.methods
    .isApprovedForAll(account, operator)
    .call();
  if (!isApprovedForAllToAugurFoundry) {
    await shareToken.methods
      .setApprovalForAll(operator, true)
      .send({ from: account });
  }
};
const getLatestMarket = async function () {
  let event = await augur.getPastEvents("MarketCreated", {
    fromBlock: "latest",
    toBlock: "latest",
  });
  // console.log("event" + event[0].returnValues.market);
  return event[0].returnValues.market;
};
const getBalanceOfERC20 = async function (token, address) {
  return new BN(await token.methods.balanceOf(address).call());
};
//NOTE: figure out a way to do this wothout making a call to the blockchain
const getTokenId = async function (marketAddress, outcome) {
  return await shareToken.methods.getTokenId(marketAddress, outcome).call();
};
const getYesNoTokenIds = async function (yesNoMarketAddress) {
  let tokenIds = [];
  tokenIds.push(await getTokenId(yesNoMarketAddress, OUTCOMES.NO));
  tokenIds.push(await getTokenId(yesNoMarketAddress, OUTCOMES.YES));
  return tokenIds;
};

module.exports = {
  buyCompleteSets: buyCompleteSets,
  sellCompleteSets: sellCompleteSets,
  createYesNoMarket: createYesNoMarket,
  getYesNoTokenIds: getYesNoTokenIds,
  shareToken: shareToken,
  shareTokenApproveForAll: shareTokenApproveForAll,
  getBalanceOfERC20: getBalanceOfERC20,
  getTokenId: getTokenId,
};
