const {artifacts, accounts, web3} = require('hardhat');
const {BN, ether, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {stringToBytes32} = require('@animoca/ethereum-contracts-sale/test/utils/bytes32');
const {ZeroAddress, EmptyByte, Zero, One, Two, Three, MaxUInt256} = require('@animoca/ethereum-contracts-core/src/constants');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core/test/utils/fixture');

const {makeFungibleCollectionId, makeNonFungibleTokenId, makeNonFungibleCollectionId} =
  require('@animoca/blockchain-inventory_metadata').inventoryIds;

const nfMaskLength = 32;

const purchaserErc20Balance = ether('100000');
const erc20Price = ether('1');

const skusCapacity = One;
const tokensPerSkuCapacity = One;
const sku = stringToBytes32('sku');
const totalSupply = new BN('10');
const maxQuantityPerPurchase = Three;
const tokenIds = [makeFungibleCollectionId(1), makeFungibleCollectionId(2), makeFungibleCollectionId(3), makeFungibleCollectionId(4)];
const nftId = makeNonFungibleTokenId(1, 1, nfMaskLength);
const nfcId = makeNonFungibleCollectionId(1, nfMaskLength);

const yesterday = Math.trunc(Date.now() / 1000) - 86400;
const tomorrow = Math.trunc(Date.now() / 1000) + 86400;

const [deployer, payoutWallet, purchaser, recipient, other] = accounts;

describe('TokenLaunchpadVoucherPacksSale', function () {
  const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
  const fixture = async function () {
    const forwarderRegistry = await artifacts.require('ForwarderRegistry').new({from: deployer});
    const universalForwarder = await artifacts.require('UniversalForwarder').new({from: deployer});
    this.paymentToken = await artifacts
      .require('ERC20Mock')
      .new([purchaser], [purchaserErc20Balance], forwarderRegistry.address, universalForwarder.address, {from: deployer});
    this.vouchers = await artifacts.require('TokenLaunchpadVouchers').new(forwarderRegistry.address, universalForwarder.address, {from: deployer});
    this.sale = await artifacts
      .require('TokenLaunchpadVoucherPacksSale')
      .new(this.vouchers.address, payoutWallet, skusCapacity, tokensPerSkuCapacity, {from: deployer});
    await this.vouchers.addMinter(this.sale.address, {from: deployer});
  };

  beforeEach(async function () {
    await fixtureLoader(fixture, this);
  });

  describe('constructor', function () {
    it('sets the vouchers contract', async function () {
      (await this.sale.vouchersContract()).should.be.equal(this.vouchers.address);
    });
  });

  describe('createSku()', function () {
    it('reverts when not called by the contract owner', async function () {
      await expectRevert(
        this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, Zero, Zero, {from: other}),
        'Ownable: not the owner'
      );
    });

    it('reverts with an empty tokens list', async function () {
      await expectRevert(this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, [], Zero, Zero, {from: deployer}), 'Sale: empty tokens');
    });

    it('reverts when a tokenId does not represent a fungible token', async function () {
      await expectRevert(
        this.sale.createSku(
          sku,
          totalSupply,
          maxQuantityPerPurchase,
          tokenIds.map(() => nftId),
          Zero,
          Zero,
          {from: deployer}
        ),
        'Sale: not a fungible token'
      );
      await expectRevert(
        this.sale.createSku(
          sku,
          totalSupply,
          maxQuantityPerPurchase,
          tokenIds.map(() => nfcId),
          Zero,
          Zero,
          {from: deployer}
        ),
        'Sale: not a fungible token'
      );
    });

    it('sets the sku additional info', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, One, Two, {from: deployer});
      const info = await this.sale.getSkuAdditionalInfo(sku);
      for (let i = 0; i < tokenIds.length; ++i) {
        info.tokenIds[i].should.be.bignumber.equal(new BN(tokenIds[i]));
      }
      info.startTimestamp.should.be.bignumber.equal(One);
      info.endTimestamp.should.be.bignumber.equal(Two);
    });
  });

  describe('getSkuAdditionalInfo()', function () {
    it('reverts if the sku does not exist', async function () {
      await expectRevert(this.sale.getSkuAdditionalInfo(sku), 'Sale: non-existent sku');
    });
  });

  describe('updateSkuTimestamps()', function () {
    it('reverts when not called by the contract owner', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, One, Two, {from: deployer});
      await expectRevert(this.sale.updateSkuTimestamps(sku, Zero, Zero, {from: other}), 'Ownable: not the owner');
    });

    it('reverts if the sku does not exist', async function () {
      await expectRevert(this.sale.updateSkuTimestamps(sku, Zero, Zero, {from: deployer}), 'Sale: non-existent sku');
    });

    it('updates the sku timestamps', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, One, Two, {from: deployer});
      await this.sale.updateSkuTimestamps(sku, Two, Three, {from: deployer});
      const info = await this.sale.getSkuAdditionalInfo(sku);
      info.startTimestamp.should.be.bignumber.equal(Two);
      info.endTimestamp.should.be.bignumber.equal(Three);
    });
  });

  describe('canPurchaseSku()', function () {
    it('reverts if the sku does not exist', async function () {
      await expectRevert(this.sale.canPurchaseSku(sku), 'Sale: non-existent sku');
    });

    it('returns true if the sale has started and has not ended', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, yesterday, tomorrow, {from: deployer});
      (await this.sale.canPurchaseSku(sku)).should.be.true;
    });

    it('returns true if the sale has started and has no end', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, yesterday, Zero, {from: deployer});
      (await this.sale.canPurchaseSku(sku)).should.be.true;
    });

    it('returns false if the sale has not started', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, tomorrow, tomorrow + 1, {from: deployer});
      (await this.sale.canPurchaseSku(sku)).should.be.false;
    });

    it('returns false if the sale has ended', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, yesterday, yesterday + 1, {from: deployer});
      (await this.sale.canPurchaseSku(sku)).should.be.false;
    });
  });

  describe('purchaseFor()', function () {
    it('reverts is the sku sale has not started', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, tomorrow, Zero, {from: deployer});
      await this.sale.updateSkuPricing(sku, [this.paymentToken.address], [erc20Price], {from: deployer});
      await this.sale.start({from: deployer});
      await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});
      await expectRevert(
        this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, {
          from: purchaser,
        }),
        'Sale: not started yet'
      );
    });

    it('reverts is the sku sale has ended', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, Zero, yesterday, {from: deployer});
      await this.sale.updateSkuPricing(sku, [this.paymentToken.address], [erc20Price], {from: deployer});
      await this.sale.start({from: deployer});
      await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});
      await expectRevert(
        this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, {
          from: purchaser,
        }),
        'Sale: already ended'
      );
    });

    const quantity = Two;

    context('single token delivery', function () {
      beforeEach(async function () {
        await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});
        await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, [tokenIds[0]], Zero, Zero, {from: deployer});
        await this.sale.updateSkuPricing(sku, [this.paymentToken.address], [erc20Price], {from: deployer});
        await this.sale.start({from: deployer});
        this.receipt = await this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, {
          from: purchaser,
        });
      });

      it('emits a TransferSingle minting event', async function () {
        expectEvent.inTransaction(this.receipt.tx, this.vouchers, 'TransferSingle', {
          _operator: this.sale.address,
          _from: ZeroAddress,
          _to: recipient,
          _id: tokenIds[0],
          _value: quantity,
        });
      });
    });

    context('multiple token delivery', function () {
      beforeEach(async function () {
        await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});
        await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, Zero, Zero, {from: deployer});
        await this.sale.updateSkuPricing(sku, [this.paymentToken.address], [erc20Price], {from: deployer});
        await this.sale.start({from: deployer});
        this.receipt = await this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, {
          from: purchaser,
        });
      });

      it('emits a TransferBatch minting event', async function () {
        expectEvent.inTransaction(this.receipt.tx, this.vouchers, 'TransferBatch', {
          _operator: this.sale.address,
          _from: ZeroAddress,
          _to: recipient,
          _ids: tokenIds,
          _values: tokenIds.map(() => quantity),
        });
      });
    });
  });
});
