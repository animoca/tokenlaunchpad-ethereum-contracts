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
const tokenId = makeFungibleCollectionId(1);
const nftId = makeNonFungibleTokenId(1, 1, nfMaskLength);
const nfcId = makeNonFungibleCollectionId(1, nfMaskLength);

const [deployer, payoutWallet, purchaser, recipient, other] = accounts;

describe('TokenLaunchpadVouchersSale', function () {
  const fixtureLoader = createFixtureLoader(accounts, web3.eth.currentProvider);
  const fixture = async function () {
    const forwarderRegistry = await artifacts.require('ForwarderRegistry').new({from: deployer});
    const universalForwarder = await artifacts.require('UniversalForwarder').new({from: deployer});
    this.paymentToken = await artifacts
      .require('ERC20Mock')
      .new([purchaser], [purchaserErc20Balance], forwarderRegistry.address, universalForwarder.address, {from: deployer});
    this.vouchers = await artifacts.require('ERC1155InventoryBurnableMock').new({from: deployer});
    this.sale = await artifacts
      .require('TokenLaunchpadVouchersSale')
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
      await expectRevert(this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenId, {from: other}), 'Ownable: not the owner');
    });

    it('reverts when tokenId does not represent a fungible token', async function () {
      await expectRevert(this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, nftId, {from: deployer}), 'Sale: not a fungible token');
      await expectRevert(this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, nfcId, {from: deployer}), 'Sale: not a fungible token');
    });

    it('sets the sku tokenId', async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenId, {from: deployer});
      (await this.sale.skuTokenIds(sku)).should.be.bignumber.equal(new BN(tokenId));
    });
  });

  describe('purchaseFor()', function () {
    const quantity = Two;

    beforeEach(async function () {
      await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenId, {from: deployer});
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
        _id: tokenId,
        _value: quantity,
      });
    });
  });
});
