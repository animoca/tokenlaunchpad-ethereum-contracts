const {artifacts, accounts} = require('hardhat');
const {BN, expectRevert} = require('@openzeppelin/test-helpers');
const {constants} = require('@animoca/ethereum-contracts-core');
const {One, Two, ZeroAddress} = constants;
const {shouldBehaveLikeERC20} = require('@animoca/ethereum-contracts-assets-2.0.0/test/contracts/token/ERC20/behaviors/ERC20.behavior');

const implementation = {
  contractName: 'UMADMock',
  name: 'UMAD Mock',
  symbol: 'UMAD',
  decimals: new BN(8),
  tokenURI: 'uri',
  revertMessages: {
    // ERC20
    ApproveToZero: 'ERC20: zero address spender',
    TransferExceedsBalance: 'ERC20: insufficient balance',
    TransferToZero: 'ERC20: to zero address',
    TransferExceedsAllowance: 'ERC20: insufficient allowance',
    TransferFromZero: 'ERC20: insufficient balance',
    InconsistentArrays: 'ERC20: inconsistent arrays',
    SupplyOverflow: 'ERC20: supply overflow',

    // ERC20Allowance
    AllowanceUnderflow: 'ERC20: insufficient allowance',
    AllowanceOverflow: 'ERC20: allowance overflow',

    // ERC20BatchTransfers
    BatchTransferValuesOverflow: 'ERC20: values overflow',
    BatchTransferFromZero: 'ERC20: insufficient balance',

    // ERC20SafeTransfers
    TransferRefused: 'ERC20: transfer refused',

    // ERC2612
    PermitFromZero: 'ERC20: zero address owner',
    PermitExpired: 'ERC20: expired permit',
    PermitInvalid: 'ERC20: invalid permit',

    // ERC20Mintable
    MintToZero: 'ERC20: zero address',
    BatchMintValuesOverflow: 'ERC20: values overflow',

    // Admin
    NotMinter: 'MinterRole: not a Minter',
    NotContractOwner: 'Ownable: not the owner',
  },
  features: {
    ERC165: true,
    EIP717: true, // unlimited approval
    AllowanceTracking: true,
  },
  interfaces: {
    ERC20: true,
    ERC20Detailed: true,
    ERC20Metadata: true,
    ERC20Allowance: true,
    ERC20BatchTransfer: true,
    ERC20Safe: true,
    ERC20Permit: true,
  },
  methods: {
    // ERC20Mintable
    'mint(address,uint256)': async (contract, account, value, overrides) => {
      return contract.mint(account, value, overrides);
    },
    'batchMint(address[],uint256[])': async (contract, accounts, values, overrides) => {
      return contract.batchMint(accounts, values, overrides);
    },
  },
  deploy: async function (initialHolders, initialBalances, deployer) {
    const registry = await artifacts.require('ForwarderRegistry').new({from: deployer});
    const forwarder = await artifacts.require('UniversalForwarder').new({from: deployer});
    return artifacts.require('UMADMock').new(initialHolders, initialBalances, registry.address, ZeroAddress, {from: deployer});
  },
};

const [deployer, other] = accounts;

describe('UMADMock', function () {
  this.timeout(0);

  context('constructor', function () {
    it('it reverts with inconsistent arrays', async function () {
      await expectRevert(implementation.deploy([], [Two], deployer), implementation.revertMessages.InconsistentArrays);
      await expectRevert(implementation.deploy([other, other], [Two], deployer), implementation.revertMessages.InconsistentArrays);
    });
  });

  context('_msgData()', function () {
    it('it is called for 100% coverage', async function () {
      const token = await implementation.deploy([], [], deployer);
      await token.msgData();
    });
  });

  shouldBehaveLikeERC20(implementation);
});
