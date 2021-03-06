const {artifacts, accounts} = require('hardhat');
const {constants} = require('@animoca/ethereum-contracts-core');
const {ZeroAddress} = constants;
const {shouldBehaveLikeERC1155} = require('@animoca/ethereum-contracts-assets-2.0.0/test/contracts/token/ERC1155/behaviors/ERC1155.behavior');

const implementation = {
  contractName: 'TokenLaunchpadVouchersMock',
  nfMaskLength: 32,
  revertMessages: {
    // ERC1155
    SelfApprovalForAll: 'Inventory: self-approval',
    ZeroAddress: 'Inventory: zero address',
    NonApproved: 'Inventory: non-approved sender',
    TransferToZero: 'Inventory: transfer to zero',
    MintToZero: 'Inventory: mint to zero',
    ZeroValue: 'Inventory: zero value',
    InconsistentArrays: 'Inventory: inconsistent arrays',
    InsufficientBalance: 'Inventory: not enough balance',
    TransferRejected: 'Inventory: transfer refused',
    SupplyOverflow: 'Inventory: supply overflow',

    // ERC1155Inventory
    ExistingCollection: 'Inventory: existing collection',
    ExistingOrBurntNFT: 'Inventory: existing/burnt NFT',
    NotCollection: 'Inventory: not a collection',
    NotToken: 'Inventory: not a token id',
    NonExistingNFT: 'Inventory: non-existing NFT',
    NonOwnedNFT: 'Inventory: non-owned NFT',
    WrongNFTValue: 'Inventory: wrong NFT value',
    NotNFT: 'Inventory: not an NFT',

    // Admin
    NotMinter: 'MinterRole: not a Minter',
    NotContractOwner: 'Ownable: not the owner',
  },
  interfaces: {
    ERC1155: true,
    ERC1155MetadataURI: true,
    ERC1155Inventory: true,
    ERC1155InventoryCreator: true,
    ERC1155InventoryBurnable: true,
  },
  features: {BaseMetadataURI: true},
  methods: {
    // ERC1155
    'safeMint(address,uint256,uint256,bytes)': async function (contract, to, id, value, data, overrides) {
      return contract.methods['safeMint(address,uint256,uint256,bytes)'](to, id, value, data, overrides);
    },
    'safeBatchMint(address,uint256[],uint256[],bytes)': async function (contract, to, ids, values, data, overrides) {
      return contract.safeBatchMint(to, ids, values, data, overrides);
    },
    'burnFrom(address,uint256,uint256)': async function (contract, from, id, value, overrides) {
      return contract.burnFrom(from, id, value, overrides);
    },
    'batchBurnFrom(address,uint256[],uint256[])': async function (contract, from, ids, values, overrides) {
      return contract.methods['batchBurnFrom(address,uint256[],uint256[])'](from, ids, values, overrides);
    },

    // ERC1155InventoryCreator
    'createCollection(uint256)': async function (contract, collectionId, overrides) {
      return contract.createCollection(collectionId, overrides);
    },
  },
  deploy: async function (deployer) {
    const forwarderRegistry = await artifacts.require('ForwarderRegistry').new({from: deployer});
    const universalForwarder = await artifacts.require('UniversalForwarder').new({from: deployer});
    return artifacts.require('TokenLaunchpadVouchersMock').new(forwarderRegistry.address, ZeroAddress, {from: deployer});
  },
  mint: async function (contract, to, id, value, overrides) {
    return contract.methods['safeMint(address,uint256,uint256,bytes)'](to, id, value, '0x', overrides);
  },
};

describe('TokenLaunchpadVouchers', function () {
  this.timeout(0);

  const [deployer] = accounts;

  context('_msgData()', function () {
    it('call for 100% coverage', async function () {
      const contract = await implementation.deploy(deployer);
      (await contract.msgData()).should.not.be.empty;
    });
  });

  shouldBehaveLikeERC1155(implementation);
});
