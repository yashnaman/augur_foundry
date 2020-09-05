//TODO
const Web3 = require("web3");
const fs = require("fs");

const {
  createYesNoMarket,
  shareToken,
  getYesNoTokenIds,
} = require("../scripts/utils");
const markets = require("../markets.json");

//Deploy 4 markets
//And Right the info in a file
const ERC20Wrapper = artifacts.require("ERC20Wrapper");
const AugurFoundry = artifacts.require("AugurFoundry");

module.exports = async function (deployer, networks) {
  // if ("development" === network) {
  //   const { provider } = networks[network] || {};
  //   if (!provider) {
  //     throw new Error(`Unable to find provider for network: ${network}`);
  //   }
  // }

  // const web3 = new Web3(provider);

  let accounts = await web3.eth.getAccounts();
  console.log(accounts);

  // console.log(accounts);
  // console.log(markets);

  for (i in markets) {
    // markets.push({
    //   address: await createYesNoMarket(accounts[0], markets[i]),
    //   extraInfo: markets[i],
    // });

    markets[i].address = await createYesNoMarket(
      accounts[0],
      markets[i].extraInfo
    );
  }
  // console.log(markets);

  // //deploy the augur foundry

  //Now lets deploy erc20s for the yes/no of these marekts
  //Only thing that the UI has to know is the address of the augur foundry which will be available in the markets.json

  await deployer.deploy(AugurFoundry, shareToken.options.address);
  let augurFoundry = await AugurFoundry.deployed();
  console.log(augurFoundry.address);

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
    await augurFoundry.newERC20Wrappers(tokenIds, names, symbols);

    //add these tokenAddresses to the markets json file
    markets[i].NoTokenAddress = await augurFoundry.wrappers(tokenIds[0]);
    markets[i].YesTokenAddress = await augurFoundry.wrappers(tokenIds[1]);

    console.log(await augurFoundry.wrappers(tokenIds[1]));
  }

  fs.writeFile("markets.json", JSON.stringify(markets), function (err) {
    if (err) throw err;
  });

  //we will also finalize two markets to make the tests work
};
