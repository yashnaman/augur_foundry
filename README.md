# Augur Foundry

Wrappers for shares of augur markets

Set up augur locally

1. git clone https://github.com/AugurProject/augur
2. git checkout v2
3. change [this](https://github.com/AugurProject/augur/blob/v2/packages/augur-utils/src/configuration.ts#L219) parameter to false(we need this to controll time)
4. yarn
5. yarn build
6. cd augur/packages/augur-core
7. docker run -it -p 8545:8545 -p 8546:8546 augurproject/dev-node-geth:v1.9.9
8. yarn deploy:local

Clone the repository

1. git clone https://github.com/yashnaman/augur_foundry
2. copy environment.json (which will be [here](https://github.com/AugurProject/augur/tree/v2/packages/augur-artifacts/src/environments)) to the ./augur_foundry
3. truffle migrate(to generate markets and erc20wrappers)
4. truffle test(to test)
