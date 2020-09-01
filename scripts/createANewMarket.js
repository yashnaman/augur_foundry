const Web3 = require("web3");
const { BN, time, constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS, MAX_UINT256 } = constants;
const provider = new Web3.providers.HttpProvider("http://localhost:8545");

const web3 = new Web3(provider);
//accounts[0] has an enough amount of REPs

//the goal is to create a new market
//We will need the universe

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
const repToken = new web3.eth.Contract(
  contracts["0x/erc20/contracts/src/WETH9.sol"].WETH9.abi
);
//This is the DAI token
const cash = new web3.eth.Contract(
  contracts["Cash.sol"].Cash.abi,
  addresses.Cash
);
const shareToken = new web3.eth.Contract(
  contracts["reporting/ShareToken.sol"].ShareToken.abi,
  addresses.ShareToken
);

// console.log(universe.options.address);
const ONE = web3.utils.toWei("1", "ether");
const TEN = web3.utils.toWei("10", "ether");
const THOUSAND = web3.utils.toWei("1000", "ether");

const newMarket = async function () {
  const accounts = await web3.eth.getAccounts();
  const repAddress = await universe.methods.getReputationToken().call();
  // console.log(repAddress);
  repToken.options.address = repAddress;
  // console.log(await getBalanceOf(repToken, accounts[0]));
  //approve rep token to the augur to be able to create the market
  await repToken.methods
    .approve(augur.options.address, MAX_UINT256)
    .send({ from: accounts[0] });

  //get the cash for theAccount from faucet method
  await cash.methods.faucet(THOUSAND).send({ from: accounts[0] });
  //Allow cash to the augur
  await cash.methods
    .approve(augur.options.address, MAX_UINT256)
    .send({ from: accounts[0] });

  // console.log(await getBalanceOf(cash, accounts[0]));

  let currentTime = await time.latest();
  let endTime = currentTime.add(new BN(3600 * 4));
  let feePerCashInAttoCash = 0;
  let _affiliateValidator = ZERO_ADDRESS;
  let _affiliateFeeDivisor = 0;
  let _designatedReporterAddress = accounts[0];
  let _extraInfo = "none";

  //args
  //uint256 _endTime, uint256 _feePerCashInAttoCash, IAffiliateValidator _affiliateValidator, uint256 _affiliateFeeDivisor, address _designatedReporterAddress, string memory _extraInfo
  //returns address of newly created market
  await universe.methods
    .createYesNoMarket(
      endTime,
      feePerCashInAttoCash,
      _affiliateValidator,
      _affiliateFeeDivisor,
      _designatedReporterAddress,
      _extraInfo
    )
    .send({ from: accounts[0] });

  // console.log(await getBalanceOf(cash, accounts[0]));

  let marketAddress = await getLatestMarket();
  console.log(marketAddress);
  //Now lets buy complete shares of this market by calling the buycompleteshares methods
  // console.log((await shareToken.methods.name().call()).toString());

  //mint and allow
  //get the cash for theAccount from faucet method
  await cash.methods.faucet(THOUSAND).send({ from: accounts[1] });
  //Allow cash to the augur
  await cash.methods
    .approve(augur.options.address, MAX_UINT256)
    .send({ from: accounts[1] });
  console.log(await getBalanceOf(cash, accounts[1]));
  await shareToken.methods
    .buyCompleteSets(marketAddress, accounts[1], 1)
    .send({ from: accounts[1] });

  console.log(await getBalanceOf(cash, accounts[1]));
};

newMarket();

const getBalanceOf = async function (token, address) {
  let balanceInWei = await token.methods.balanceOf(address).call();
  return web3.utils.fromWei(balanceInWei, "ether");
};
const getLatestMarket = async function () {
  let event = await augur.getPastEvents("MarketCreated", {
    fromBlock: "latest",
    toBlock: "latest",
  });
  return event[0].returnValues.market;
};
