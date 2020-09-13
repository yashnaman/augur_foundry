//TODO
// const Web3 = require("web3");
const fs = require("fs").promises;

const { BN, time, constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

//the goal here is to test all the function that will be available to the front end
const contracts = require("../contracts.json").contracts;
const addresses = require("../environments/environment-local.json").addresses;
const markets = require("../markets/markets-local.json");

const universe = new web3.eth.Contract(
  contracts["reporting/Universe.sol"].Universe.abi,
  addresses.Universe
);
const augur = new web3.eth.Contract(
  contracts["Augur.sol"].Augur.abi,
  addresses.Augur
);
// const timeControlled = new web3.eth.Contract(
//   contracts["TimeControlled.sol"].TimeControlled.abi,
//   addresses.TimeControlled
// );

const erc20 = new web3.eth.Contract(contracts["Cash.sol"].Cash.abi);
const repToken = erc20;
//This is the DAI token
const cash = new web3.eth.Contract(
  contracts["Cash.sol"].Cash.abi,
  addresses.Cash
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
  try {
    await repToken.methods
      .approve(augur.options.address, MAX_UINT256.toString())
      .send({ from: marketCreator });
  } catch (err) {
    console.log(err);
    console.log("error");
  }

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
  // console.log("Creating a new YES/NO Market");
  let tx = await universe.methods
    .createYesNoMarket(
      endTime.toString(),
      feePerCashInAttoCash,
      affiliateValidator,
      affiliateFeeDivisor,
      designatedReporterAddress,
      extraInfo
    )
    .send({ from: marketCreator });

  return getMarketFormTx(tx);
};
// const getLatestMarket = async function () {
//   let event = await augur.getPastEvents("MarketCreated", {
//     fromBlock: "latest",
//     toBlock: "latest",
//   });
//   // console.log("event" + event[0].returnValues.market);
//   return event[0].returnValues.market;
// };
const getMarketFormTx = function (tx) {
  //NOTE: Find a "not hacked" way to do this
  let temp = tx.events["4"].raw.topics[2];
  let marketAddress = web3.eth.abi.decodeParameter("address", temp);
  return marketAddress;
};
module.exports = async function (deployer) {
  let accounts = await web3.eth.getAccounts();

  // // console.log(accounts);
  // // console.log(markets);

  for (i in markets) {
    // markets.push({
    //   address: await createYesNoMarket(accounts[0], markets[i]),
    //   extraInfo: markets[i],
    // });

    markets[i].address = await createYesNoMarket(
      accounts[0],
      markets[i].extraInfo
    );
    // console.log("Market" + i + ":" + markets[i].address);
    // console.log(await getLatestMarket());
  }
  await fs.writeFile("./markets/markets-local.json", JSON.stringify(markets));

  // console.log(markets);

  //we will also finalize two markets to make the tests work
};
