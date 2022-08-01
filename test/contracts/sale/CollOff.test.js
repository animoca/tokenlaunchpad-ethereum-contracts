const {artifacts, accounts, web3} = require('hardhat');
const {BN, ether, expectEvent, expectRevert, time} = require('@openzeppelin/test-helpers');
const {stringToBytes32} = require('@animoca/ethereum-contracts-sale/test/utils/bytes32');
const {ZeroAddress, EmptyByte, Zero, One, Two, Three, MaxUInt256} = require('@animoca/ethereum-contracts-core/src/constants');
const {createFixtureLoader} = require('@animoca/ethereum-contracts-core/test/utils/fixture');
const {isCallTrace} = require('hardhat/internal/hardhat-network/stack-traces/message-trace');

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

const [deployer, payoutWallet, purchaser, recipient, other] = accounts;

describe('TokenLaunchpadVoucherPacksSale CoolOffPeriod', function () {
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

  it("Should revert 'not owner' when coolOff period is set", async function () {
    await expectRevert(this.sale.setCoolOffTime(testBytes, {from: other}), 'Ownable: not the owner');
  });

  it('Should set cool off time', async function () {
    await this.sale.setCoolOffTime(100, {from: deployer});
    expect((await this.sale.coolOffPeriod()).toString()).to.be.equal('100');
  });

  describe('Test whitelist for purchaseFor() function', function () {
    it('Should normal purchase with cool off set', async function () {
      expect((await this.sale.CoolOff(sku, purchaser)).toString()).to.be.equal('0');
      await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, [tokenIds[0]], Zero, Zero, {from: deployer});
      await this.sale.updateSkuPricing(sku, [this.paymentToken.address], [erc20Price], {from: deployer});
      await this.sale.start({from: deployer});

      await this.sale.setCoolOffTime(10, {from: deployer});
      await this.sale.setMerkleRoot(root, {from: deployer});

      await time.advanceBlockTo(30);
      await this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, proof, {
        from: purchaser,
      });
      let blockNumber = await web3.eth.getBlockNumber().toString();
      let CoolOffPeriod = (await this.sale.coolOffPeriod()).toString();
      let actualCoolOff = BN(await this.sale.CoolOff(sku, purchaser)).add(new BN(CoolOffPeriod));
      expect(await this.sale.CoolOff(sku, purchaser).toString()).to.be.equal(blockNumber);
      expect(actualCoolOff.toString()).to.equal('41');

      await time.advanceBlockTo(41);
      await this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, proof, {
        from: purchaser,
      });
      blockNumber = await web3.eth.getBlockNumber().toString();
      CoolOffPeriod = (await this.sale.coolOffPeriod()).toString();
      actualCoolOff = BN(await this.sale.CoolOff(sku, purchaser)).add(new BN(CoolOffPeriod));
      expect(await this.sale.CoolOff(sku, purchaser).toString()).to.be.equal(blockNumber);
      expect(actualCoolOff.toString()).to.equal('52');
    });

    it("Should revert 'Sale: cool off period is not over' when coolOff period is setted", async function () {
      expect((await this.sale.CoolOff(sku, purchaser)).toString()).to.be.equal('0');
      await this.paymentToken.approve(this.sale.address, MaxUInt256, {from: purchaser});
      await this.sale.createSku(sku, totalSupply, maxQuantityPerPurchase, [tokenIds[0]], Zero, Zero, {from: deployer});
      await this.sale.updateSkuPricing(sku, [this.paymentToken.address], [erc20Price], {from: deployer});
      await this.sale.start({from: deployer});

      await this.sale.setCoolOffTime(10, {from: deployer});
      await this.sale.setMerkleRoot(root, {from: deployer});

      await time.advanceBlockTo(30);
      await this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, proof, {
        from: purchaser,
      });

      await expectRevert(
        this.sale.purchaseFor(recipient, this.paymentToken.address, sku, quantity, EmptyByte, proof, {
          from: purchaser,
        }),
        'Sale: cool off period is not over'
      );
    });
  });
});
