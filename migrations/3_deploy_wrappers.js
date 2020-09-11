//TODO
// const Web3 = require("web3");
const fs = require("fs").promises;

const { BN, time, constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

//the goal here is to test all the function that will be available to the front end
const contracts = require("../contracts.json").contracts;
const addresses = require("../environment-local.json").addresses;
const markets = require("../markets-local.json");

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
const shareToken = new web3.eth.Contract(
  contracts["reporting/ShareToken.sol"].ShareToken.abi,
  addresses.ShareToken
);
const market = new web3.eth.Contract(
  contracts["reporting/Market.sol"].Market.abi
);
const disputeWindow = new web3.eth.Contract(
  contracts["reporting/DisputeWindow.sol"].DisputeWindow.abi
);

const with18Decimals = function (amount) {
  return amount.mul(new BN(10).pow(new BN(18)));
};
const THOUSAND = with18Decimals(new BN(1000));

//For A YES/No market the outcomes will be three
const OUTCOMES = { INVALID: 0, NO: 1, YES: 2 };
const outComes = [0, 1, 2];
// Object.freeze(outComes);

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
const getNumTicks = async function (marketAddress) {
  market.options.address = marketAddress;
  return new BN(await market.methods.getNumTicks().call());
};
//Deploy 4 markets
//And Right the info in a file
const ERC20Wrapper = artifacts.require("ERC20Wrapper");
const AugurFoundry = artifacts.require("AugurFoundry");

module.exports = async function (deployer) {
  let accounts = await web3.eth.getAccounts();
  console.log(accounts);
  //   console.log(markets);

  // //deploy the augur foundry

  //Now lets deploy erc20s for the yes/no of these marekts
  //Only thing that the UI has to know is the address of the augur foundry which will be available in the markets.json

  await deployer.deploy(
    AugurFoundry,
    shareToken.options.address,
    cash.options.address
  );
  let augurFoundry = await AugurFoundry.deployed();
  // console.log(augurFoundry.address);

  //deploy erc20wrappers
  //get tokenIds for YES/NO outcome for every market

  markets[0].augurFoundryAddress = augurFoundry.address;
  // await deployer.deploy(AugurFoundry);
  //I want to write this somewhere that can be used after by the UI

  for (i in markets) {
    let names = [
      markets[i].extraInfo.description + ": NO",
      markets[i].extraInfo.description + ": YES",
    ];
    let symbols = ["NO" + i, "YES" + i];
    let tokenIds = await getYesNoTokenIds(markets[i].address);

    let numTicks = await getNumTicks(markets[i].address);
    let zeros = new BN(0);
    while (numTicks.toString() != "1") {
      numTicks = numTicks.div(new BN(10));
      zeros = zeros.add(new BN(1));
    }
    let decimals = new BN(18).sub(zeros);

    // console.log("decimals: " + decimals);
    await augurFoundry.newERC20Wrappers(tokenIds, names, symbols, [
      decimals,
      decimals,
    ]);

    markets[i].noTokenId = tokenIds[0];
    markets[i].yesTokenId = tokenIds[1];
    //add these tokenAddresses to the markets json file
    markets[i].NoTokenAddress = await augurFoundry.wrappers(tokenIds[0]);
    markets[i].YesTokenAddress = await augurFoundry.wrappers(tokenIds[1]);

    // console.log(await augurFoundry.wrappers(tokenIds[1]));
  }

  await fs.writeFile("markets-local.json", JSON.stringify(markets));

  //we will also finalize two markets to make the tests work
};
