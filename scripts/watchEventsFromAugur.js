const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
const web3 = new Web3(provider);
const contracts = require("../contracts.json").contracts;
const addresses = require("../environment.json").addresses;

const augur = new web3.eth.Contract(
  contracts["Augur.sol"].Augur.abi,
  addresses.Augur
);

augur.getPastEvents({ fromBlock: "latest", toBlock: "latest" }, function (
  err,
  event
) {
  console.log(event);
});
