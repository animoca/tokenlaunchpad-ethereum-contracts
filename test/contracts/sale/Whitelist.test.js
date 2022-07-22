const {artifacts, accounts, web3} = require('hardhat');
const {BN, ether, expectEvent, expectRevert} = require('@openzeppelin/test-helpers');
const {stringToBytes32} = require('@animoca/ethereum-contracts-sale/test/utils/bytes32');
const {ZeroAddress, EmptyByte, Zero, One, Two, Three, MaxUInt256} = require('@animoca/ethereum-contracts-core/src/constants');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core/test/utils/fixture');
const {isCallTrace} = require('hardhat/internal/hardhat-network/stack-traces/message-trace');

//const {generateMerkleRoot} = require('./../../../scripts/generateMerkleRoot');

const {generateMerkleProof, generateMerkleRoot} = require('../../../scripts/generateMerkleProof');

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
const testBytes = web3.utils.randomHex(32);
const merkleRootBytes = 0;
const quantity = Two;
const root = '0xece07c33940cc568492f73af40513857762f7593dff0cfb93c93306c726136c2';
const proof = ['0x9e1d84ca9c7548b9920bc4881db28863cc28dcc8447bac67b0881621aa70ac1b']; //for purchaser

const yesterday = Math.trunc(Date.now() / 1000) - 86400;
const tomorrow = Math.trunc(Date.now() / 1000) + 86400;

const [deployer, payoutWallet, purchaser, recipient, other] = accounts;

describe('TokenLaunchpadVoucherPacksSale Whitelist', function () {
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

  it("Should revert 'not owner' when merkle root is setted", async function () {
    await expectRevert(this.sale.setMerkleRoot(testBytes, {from: other}), 'Ownable: not the owner');
  });

  it('Should set merkle root based on whitelist addreses', async function () {
    await this.sale.setMerkleRoot(root, {from: deployer});
    expect((await this.sale.merkleRoot()).toString()).to.be.equal(root);
  });

  describe('Test whitelist with purchaseFor()', function () {
    it("Should revert 'invalid merkle proof' before setting merkle root", async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, Zero, yesterday, {from: deployer});
      await this.sale.updateSkuPricing(sku, [this.paymentToken.address], [erc20Price], {from: deployer});
      await this.sale.start({from: deployer});
      await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});

      await expectRevert(
        this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, [testBytes], {
          from: purchaser,
        }),
        'Sale: invalid merkle proof'
      );
    });

    it("Should revert 'invalid merkle proof' if transaction is executed by someone who is not whitelisted", async function () {
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, tokenIds, Zero, yesterday, {from: deployer});
      await this.sale.updateSkuPricing(sku, [this.paymentToken.address], [erc20Price], {from: deployer});
      await this.sale.start({from: deployer});
      await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});

      await this.sale.setMerkleRoot(root, {from: deployer});
      expect((await this.sale.merkleRoot()).toString()).to.be.equal(root);

      await expectRevert(
        this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, proof, {
          from: recipient,
        }),
        'Sale: invalid merkle proof'
      );
    });

    it('Should test purchase with single token delivery', async function () {
      await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, [tokenIds[0]], Zero, Zero, {from: deployer});
      await this.sale.updateSkuPricing(sku, [this.paymentToken.address], [erc20Price], {from: deployer});
      await this.sale.start({from: deployer});

      await this.sale.setMerkleRoot(root, {from: deployer});

      await this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, proof, {
        from: purchaser,
      });
    });
  });
});
