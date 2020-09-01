# augur_foundry

Wrappers for shares of augur markets

Clone the repository

1. git clone https://github.com/yashnaman/augur_foundry

Set up augur locally

1. git clone https://github.com/AugurProject/augur
2. cd augur
3. git checkout erc20_1155
4. yarn
5. yarn build
6. cd augur/packages/augur-core
7. docker run -it -p 8545:8545 -p 8546:8546 augurproject/dev-node-geth:v1.9.9
8. yarn deploy:local

Now make the deployed contract available to this repo (copy augur/packages/augur-artifacts/src/environment.json to augur_foundry/)

You will be able to run the scripts now
