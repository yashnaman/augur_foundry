# augur_foundry
Wrappers for shares of augur markets


Set up augur locally

1. git clone clone https://github.com/AugurProject/augur
2. git checkout erc20_1155
3. yarn
4. yarn build
5. cd augur/packages/augur-core
6. docker run -it -p 8545:8545 -p 8546:8546 augurproject/dev-node-geth:v1.9.9
7. yarn deploy:local
