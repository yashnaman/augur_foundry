const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { MAX_INT256 } = require("@openzeppelin/test-helpers/src/constants");
const { ZERO_ADDRESS } = constants;

const MockShareToken = artifacts.require("MockShareToken");
const MockCash = artifacts.require("MockCash");
const ERC20Wrapper = artifacts.require("ERC20Wrapper");
const AugurFoundry = artifacts.require("AugurFoundry");

contract("ERC20Wrapper", function (accounts) {
  const [initialHolder, otherAccount, anotherAccount] = accounts;
  var tokenId;
  const decimals = 18;
  const uri = "";
  const name = "test";
  const symbol = "TST";
  const initialSupply = new BN(1000).mul(new BN(10).pow(new BN(18))); //1000 ether
  beforeEach(async function () {
    this.mockCash = await MockCash.new();
    //create a new MockShareToken
    this.mockShareToken = await MockShareToken.new(uri, this.mockCash.address);
    tokenId = await this.mockShareToken.tokenId();

    //deploy the augur foundry contract
    //We should deploy a mock augur foundry instead if we want to do the unit tests
    this.augurFoundry = await AugurFoundry.new(
      this.mockShareToken.address,
      this.mockCash.address
    );

    //Create a new erc20 wrapper for a tokenId of the shareTOken
    await this.augurFoundry.newERC20Wrapper(tokenId, name, symbol, decimals);
    let erc20WrapperAddress = await this.augurFoundry.wrappers(tokenId);

    this.erc20Wrapper = await ERC20Wrapper.at(erc20WrapperAddress);
    //mint initialHolder some ERC1155 of tokenId
    await this.mockShareToken.mint(initialHolder, tokenId, initialSupply);
  });
  describe("should wrap tokens", async function () {
    beforeEach(async function () {
      expect(
        await this.erc20Wrapper.balanceOf(initialHolder)
      ).to.be.bignumber.equal("0");
      expect(
        await this.mockShareToken.balanceOf(initialHolder, tokenId)
      ).to.be.bignumber.equal(initialSupply);
    });
    afterEach(async function () {
      expect(
        await this.erc20Wrapper.balanceOf(initialHolder)
      ).to.be.bignumber.equal(initialSupply);
      expect(
        await this.mockShareToken.balanceOf(initialHolder, tokenId)
      ).to.be.bignumber.equal("0");
    });
    it("when user directly wraps tokens", async function () {
      //to be able to unwrap tokens you have to aprrove
      await expectRevert(
        this.erc20Wrapper.wrapTokens(initialHolder, initialSupply, {
          from: initialHolder,
        }),
        "ERC1155: caller is not owner nor approved"
      );
      //add expectRevert here
      await this.mockShareToken.setApprovalForAll(
        this.erc20Wrapper.address,
        true,
        {
          from: initialHolder,
        }
      );
      await this.erc20Wrapper.wrapTokens(initialHolder, initialSupply, {
        from: initialHolder,
      });
    });
    it("when augur foundry wraps for them", async function () {
      //to be able to wrap tokens you have to setApprovalForAll to the augur_foundry it does it for you
      await expectRevert(
        this.augurFoundry.wrapTokens(tokenId, initialHolder, initialSupply, {
          from: initialHolder,
        }),
        "ERC1155: caller is not owner nor approved"
      );
      //add expectRevert here
      await this.mockShareToken.setApprovalForAll(
        this.augurFoundry.address,
        true,
        {
          from: initialHolder,
        }
      );
      await this.augurFoundry.wrapTokens(
        tokenId,
        initialHolder,
        initialSupply,
        {
          from: initialHolder,
        }
      );
    });
  });
  describe("should unWrap tokens", async function () {
    beforeEach(async function () {
      //can't unwrap without wrapping it first
      await this.mockShareToken.setApprovalForAll(
        this.augurFoundry.address,
        true,
        {
          from: initialHolder,
        }
      );
      await this.augurFoundry.wrapTokens(
        tokenId,
        initialHolder,
        initialSupply,
        {
          from: initialHolder,
        }
      );
      expect(
        await this.erc20Wrapper.balanceOf(initialHolder)
      ).to.be.bignumber.equal(initialSupply);
      expect(
        await this.mockShareToken.balanceOf(initialHolder, tokenId)
      ).to.be.bignumber.equal("0");
    });
    afterEach(async function () {
      expect(
        await this.erc20Wrapper.balanceOf(initialHolder)
      ).to.be.bignumber.equal("0");
      expect(
        await this.mockShareToken.balanceOf(initialHolder, tokenId)
      ).to.be.bignumber.equal(initialSupply);
    });
    it("when user directly unwraps tokens", async function () {
      await this.erc20Wrapper.unWrapTokens(initialHolder, initialSupply, {
        from: initialHolder,
      });
    });
    it("when augur foundry unwraps for them", async function () {
      await this.augurFoundry.unWrapTokens(tokenId, initialSupply, {
        from: initialHolder,
      });
    });
  });
  describe("Should calim winnings", async function () {
    var cashAmount;
    let tokenHolders = [initialHolder, otherAccount, anotherAccount];
    beforeEach(async function () {
      cashAmount = await this.mockShareToken.amount();

      for (i in tokenHolders) {
        await this.mockShareToken.mint(tokenHolders[i], tokenId, initialSupply);
        await this.mockShareToken.setApprovalForAll(
          this.augurFoundry.address,
          true,
          {
            from: tokenHolders[i],
          }
        );
        await this.augurFoundry.wrapTokens(
          tokenId,
          tokenHolders[i],
          initialSupply,
          {
            from: tokenHolders[i],
          }
        );
      }
    });
    it("when the outcome is the winning outcome", async function () {
      for (i in tokenHolders) {
        await this.erc20Wrapper.claim(tokenHolders[i], {
          from: tokenHolders[i],
        });
        expect(
          await this.erc20Wrapper.balanceOf(tokenHolders[i])
        ).to.be.bignumber.equal("0");
        //Not exaclt div by three becuse there is an error of 10^-18 magnitude
        expect(
          await this.mockCash.balanceOf(tokenHolders[i])
        ).to.be.bignumber.at.least(cashAmount.div(new BN(tokenHolders.length)));
      }
    });
    it("when someone else claims for them", async function () {
      await expectRevert(
        this.erc20Wrapper.claim(initialHolder, {
          from: otherAccount,
        }),
        "ERC20: burn amount exceeds allowance"
      );
      await this.erc20Wrapper.approve(otherAccount, initialSupply, {
        from: initialHolder,
      });
      await this.erc20Wrapper.claim(initialHolder, {
        from: otherAccount,
      });
      expect(
        await this.erc20Wrapper.balanceOf(initialHolder)
      ).to.be.bignumber.equal("0");
      //Not exaclt div by three becuse there is an error of 10^-18 magnitude
      expect(
        await this.mockCash.balanceOf(initialHolder)
      ).to.be.bignumber.at.least(cashAmount.div(new BN(tokenHolders.length)));
    });
  });
});

contract("AugurFoundry", function (accounts) {
  const [initialHolder, mockCashAddress] = accounts;
  const tokenIds = [1, 2];
  const decimals = [18, 18];
  const uri = "";
  const names = ["test1", "test2"];
  const symbols = ["TST1", "TST2"];
  const initialSupply = new BN(1000).mul(new BN(10).pow(new BN(18))); //1000 ether
  beforeEach(async function () {
    //create a new MockShareToken
    this.mockShareToken = await MockShareToken.new(uri, ZERO_ADDRESS);

    //deploy the augur foundry contract
    //We should deploy a mock augur foundry instead if we want to do the unit tests
    this.augurFoundry = await AugurFoundry.new(
      this.mockShareToken.address,
      mockCashAddress
    );

    //mint initialHolder some ERC1155 of tokenId
    await this.mockShareToken.mint(initialHolder, tokenIds[0], initialSupply);
    await this.mockShareToken.mint(initialHolder, tokenIds[1], initialSupply);
  });
  it("creates new ERC20 wrappers", async function () {
    //Create a new erc20 wrapper for a tokenId of the shareTOken
    let reciept = await this.augurFoundry.newERC20Wrapper(
      tokenIds[0],
      names[0],
      symbols[0],
      decimals[0]
    );
    let erc20WrapperAddress = await this.augurFoundry.wrappers(tokenIds[0]);
    expectEvent(reciept, "WrapperCreated", {
      tokenId: tokenIds[0].toString(),
      tokenAddress: erc20WrapperAddress,
    });
    expectRevert(
      this.augurFoundry.newERC20Wrapper(
        tokenIds[0],
        names[0],
        symbols[0],
        decimals[0]
      ),
      "Wrapper already created"
    );
    // this.erc20Wrapper = await ERC20Wrapper.at(erc20WrapperAddress);
  });
  it("creates multiple wrappers", async function () {
    let reciept = await this.augurFoundry.newERC20Wrappers(
      tokenIds,
      names,
      symbols,
      decimals
    );
    let erc20WrapperAddress = await this.augurFoundry.wrappers(tokenIds[0]);
    expectEvent(reciept, "WrapperCreated", {
      tokenId: tokenIds[0].toString(),
      tokenAddress: erc20WrapperAddress,
    });
    erc20WrapperAddress = await this.augurFoundry.wrappers(tokenIds[1]);
    expectEvent(reciept, "WrapperCreated", {
      tokenId: tokenIds[1].toString(),
      tokenAddress: erc20WrapperAddress,
    });
  });
  describe("Wrap and unwrap multilple tokens", async function () {
    beforeEach(async function () {
      await this.augurFoundry.newERC20Wrappers(
        tokenIds,
        names,
        symbols,
        decimals
      );
    });
    it("wraps Multiple tokens", async function () {
      await expectRevert(
        this.augurFoundry.wrapMultipleTokens(
          tokenIds,
          initialHolder,
          [initialSupply, initialSupply],
          {
            from: initialHolder,
          }
        ),
        "ERC1155: caller is not owner nor approved"
      );
      await this.mockShareToken.setApprovalForAll(
        this.augurFoundry.address,
        true,
        {
          from: initialHolder,
        }
      );
      //tx is transactionHash
      let { tx } = await this.augurFoundry.wrapMultipleTokens(
        tokenIds,
        initialHolder,
        [initialSupply, initialSupply],
        {
          from: initialHolder,
        }
      );
      let erc20WrapperAddress = await this.augurFoundry.wrappers(tokenIds[0]);
      let erc20Wrapper = await ERC20Wrapper.at(erc20WrapperAddress);
      //erc20s should have been minted
      await expectEvent.inTransaction(tx, erc20Wrapper, "Transfer", {
        from: ZERO_ADDRESS,
        to: initialHolder,
        value: initialSupply,
      });
      await expectEvent.inTransaction(tx, MockShareToken, "TransferSingle", {
        operator: this.augurFoundry.address,
        from: initialHolder,
        to: erc20WrapperAddress,
        id: tokenIds[0].toString(),
        value: initialSupply,
      });
      erc20WrapperAddress = await this.augurFoundry.wrappers(tokenIds[1]);
      erc20Wrapper = await ERC20Wrapper.at(erc20WrapperAddress);
      await expectEvent.inTransaction(tx, erc20Wrapper, "Transfer", {
        from: ZERO_ADDRESS,
        to: initialHolder,
        value: initialSupply,
      });
      await expectEvent.inTransaction(tx, MockShareToken, "TransferSingle", {
        operator: this.augurFoundry.address,
        from: initialHolder,
        to: erc20WrapperAddress,
        id: tokenIds[1].toString(),
        value: initialSupply,
      });
    });
    it("unwraps multiple tokens", async function () {
      await this.mockShareToken.setApprovalForAll(
        this.augurFoundry.address,
        true,
        {
          from: initialHolder,
        }
      );
      await this.augurFoundry.wrapMultipleTokens(
        tokenIds,
        initialHolder,
        [initialSupply, initialSupply],
        {
          from: initialHolder,
        }
      );
      let { tx } = await this.augurFoundry.unWrapMultipleTokens(
        tokenIds,
        [initialSupply, initialSupply],
        {
          from: initialHolder,
        }
      );
      // console.log(reciept);
      let erc20WrapperAddress = await this.augurFoundry.wrappers(tokenIds[0]);
      let erc20Wrapper = await ERC20Wrapper.at(erc20WrapperAddress);
      //erc20s should have been minted
      await expectEvent.inTransaction(tx, erc20Wrapper, "Transfer", {
        from: initialHolder,
        to: ZERO_ADDRESS,
        value: initialSupply,
      });
      await expectEvent.inTransaction(tx, MockShareToken, "TransferSingle", {
        operator: erc20WrapperAddress,
        from: erc20WrapperAddress,
        to: initialHolder,
        id: tokenIds[0].toString(),
        value: initialSupply,
      });
      erc20WrapperAddress = await this.augurFoundry.wrappers(tokenIds[1]);
      erc20Wrapper = await ERC20Wrapper.at(erc20WrapperAddress);
      await expectEvent.inTransaction(tx, erc20Wrapper, "Transfer", {
        from: initialHolder,
        to: ZERO_ADDRESS,
        value: initialSupply,
      });
      await expectEvent.inTransaction(tx, MockShareToken, "TransferSingle", {
        operator: erc20WrapperAddress,
        from: erc20WrapperAddress,
        to: initialHolder,
        id: tokenIds[1].toString(),
        value: initialSupply,
      });
    });
  });
});
