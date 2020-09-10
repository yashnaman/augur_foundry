const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { ZERO_ADDRESS } = constants;

const MockShareToken = artifacts.require("MockShareToken");
const ERC20Wrapper = artifacts.require("ERC20Wrapper");
const AugurFoundry = artifacts.require("AugurFoundry");

contract("ERC20Wrapper", function (accounts) {
  const [initialHolder, mockCashAddress] = accounts;
  const tokenId = 1;
  const decimals = 18;
  const uri = "";
  const name = "test";
  const symbol = "TST";
  const initialSupply = new BN(1000);
  beforeEach(async function () {
    //create a new MockShareToken
    this.mockShareToken = await MockShareToken.new(uri, ZERO_ADDRESS);

    //deploy the augur foundry contract
    //We should deploy a mock augur foundry instead if we want to do the unit tests
    this.augurFoundry = await AugurFoundry.new(
      this.mockShareToken.address,
      mockCashAddress
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
      await this.erc20Wrapper.approve(
        this.augurFoundry.address,
        initialSupply,
        {
          from: initialHolder,
        }
      );
      //for every erc20 it will have to aprove this augurFoundry and that is not desirable
      //add expect Revert Here
      await this.augurFoundry.unWrapTokens(tokenId, initialSupply, {
        from: initialHolder,
      });
    });
  });
});
