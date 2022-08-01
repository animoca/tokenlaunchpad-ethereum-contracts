// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6 <0.8.0;

import {Sale, FixedPricesSale} from "@animoca/ethereum-contracts-sale-2.0.0/contracts/sale/FixedPricesSale.sol";
import {Recoverable} from "@animoca/ethereum-contracts-core-1.1.2/contracts/utils/Recoverable.sol";

import "@openzeppelin/contracts/cryptography/MerkleProof.sol";

/**
 * @title TokenLaunchpad Vouchers Sale
 * A FixedPricesSale contract that handles the purchase and delivery of TokenLaunchpad vouchers.
 */
contract TokenLaunchpadVoucherPacksSale is FixedPricesSale, Recoverable {
    IVouchersContract public immutable vouchersContract;

    struct SkuAdditionalInfo {
        uint256[] tokenIds;
        uint256 startTimestamp;
        uint256 endTimestamp;
    }

    mapping(bytes32 => SkuAdditionalInfo) internal _skuAdditionalInfo;

    //SKU -> user address => block number of last purchase
    mapping(bytes32 => mapping(address => uint256)) public CoolOff;

    //The number of blocks the user has to wait for before purchasing again
    uint256 public coolOffPeriod;

    //Root of Merkle Tree
    bytes32 public merkleRoot;

    /**
     * Constructor.
     * @dev Emits the `MagicValues` event.
     * @dev Emits the `Paused` event.
     * @param vouchersContract_ The inventory contract from which the sale supply is attributed from.
     * @param payoutWallet the payout wallet.
     * @param skusCapacity the cap for the number of managed SKUs.
     * @param tokensPerSkuCapacity the cap for the number of tokens managed per SKU.
     */
    constructor(
        IVouchersContract vouchersContract_,
        address payable payoutWallet,
        uint256 skusCapacity,
        uint256 tokensPerSkuCapacity
    ) FixedPricesSale(payoutWallet, skusCapacity, tokensPerSkuCapacity) {
        vouchersContract = vouchersContract_;
    }

    /**
     * Sets the block number that has to pass between 2 purchases by the same user
     * @param _coolOffPeriod The number of blocks
     */
    function setCoolOffTime(uint256 _coolOffPeriod) public {
        _requireOwnership(_msgSender());
        coolOffPeriod = _coolOffPeriod;
    }

    /**
     * Sets the Merkle root based on KYC addresses
     * @param _merkleRoot The merkle root
     */
    function setMerkleRoot(bytes32 _merkleRoot) public {
        _requireOwnership(_msgSender());
        merkleRoot = _merkleRoot;
    }

    /**
     * Buys a voucher
     * @dev Overloads inherited function
     * @param merkleProof Merkle proof of leaf address
     */
    function purchaseFor(
        address payable recipient,
        address token,
        bytes32 sku,
        uint256 quantity,
        bytes calldata userData,
        bytes32[] calldata merkleProof
    ) public payable whenStarted {
        require(MerkleProof.verify(merkleProof, merkleRoot, keccak256(abi.encodePacked(msg.sender))), "Sale: invalid merkle proof");
        require(CoolOff[sku][msg.sender] + coolOffPeriod < block.number, "Sale: cool off period is not over");
        CoolOff[sku][msg.sender] = block.number;

        _requireNotPaused();
        PurchaseData memory purchase;
        purchase.purchaser = _msgSender();
        purchase.recipient = recipient;
        purchase.token = token;
        purchase.sku = sku;
        purchase.quantity = quantity;
        purchase.userData = userData;

        _purchaseFor(purchase);
    }

    /**
     * @dev Overrides inherited function
     */
    function purchaseFor(
        address payable recipient,
        address token,
        bytes32 sku,
        uint256 quantity,
        bytes calldata userData
    ) public payable override whenStarted {
        require(false, "Sale: Deprecated function");
    }

    /**
     * Creates an SKU.
     * @dev Reverts if `totalSupply` is zero.
     * @dev Reverts if `sku` already exists.
     * @dev Reverts if the update results in too many SKUs.
     * @dev Reverts if one of `tokenIds` is not a fungible token identifier.
     * @dev Emits the `SkuCreation` event.
     * @param sku The SKU identifier.
     * @param totalSupply The initial total supply.
     * @param maxQuantityPerPurchase The maximum allowed quantity for a single purchase.
     * @param tokenIds The inventory contract token IDs to associate with the SKU, used for purchase delivery.
     * @param startTimestamp The start timestamp of the sale.
     * @param endTimestamp The end timestamp of the sale, or zero to indicate there is no end.
     */
    function createSku(
        bytes32 sku,
        uint256 totalSupply,
        uint256 maxQuantityPerPurchase,
        uint256[] calldata tokenIds,
        uint256 startTimestamp,
        uint256 endTimestamp
    ) external {
        _requireOwnership(_msgSender());
        uint256 length = tokenIds.length;
        require(length != 0, "Sale: empty tokens");
        for (uint256 i; i != length; ++i) {
            require(vouchersContract.isFungible(tokenIds[i]), "Sale: not a fungible token");
        }
        _skuAdditionalInfo[sku] = SkuAdditionalInfo(tokenIds, startTimestamp, endTimestamp);
        _createSku(sku, totalSupply, maxQuantityPerPurchase, address(0));
    }

    /**
     * Updates start and end timestamps of a SKU.
     * @dev Reverts if not sent by the contract owner.
     * @dev Reverts if the SKU does not exist.
     * @param sku the SKU identifier.
     * @param startTimestamp The start timestamp of the sale.
     * @param endTimestamp The end timestamp of the sale, or zero to indicate there is no end.
     */
    function updateSkuTimestamps(
        bytes32 sku,
        uint256 startTimestamp,
        uint256 endTimestamp
    ) external {
        _requireOwnership(_msgSender());
        require(_skuInfos[sku].totalSupply != 0, "Sale: non-existent sku");
        SkuAdditionalInfo storage info = _skuAdditionalInfo[sku];
        info.startTimestamp = startTimestamp;
        info.endTimestamp = endTimestamp;
    }

    /**
     * Gets the additional sku info.
     * @dev Reverts if the SKU does not exist.
     * @param sku the SKU identifier.
     * @return tokenIds The identifiers of the tokens delivered via this SKU.
     * @return startTimestamp The start timestamp of the SKU sale.
     * @return endTimestamp The end timestamp of the SKU sale (zero if there is no end).
     */
    function getSkuAdditionalInfo(bytes32 sku)
        external
        view
        returns (
            uint256[] memory tokenIds,
            uint256 startTimestamp,
            uint256 endTimestamp
        )
    {
        require(_skuInfos[sku].totalSupply != 0, "Sale: non-existent sku");
        SkuAdditionalInfo memory info = _skuAdditionalInfo[sku];
        return (info.tokenIds, info.startTimestamp, info.endTimestamp);
    }

    /**
     * Returns whether a SKU is currently within the sale time range.
     * @dev Reverts if the SKU does not exist.
     * @param sku the SKU identifier.
     * @return true if `sku` is currently within the sale time range, false otherwise.
     */
    function canPurchaseSku(bytes32 sku) external view returns (bool) {
        require(_skuInfos[sku].totalSupply != 0, "Sale: non-existent sku");
        SkuAdditionalInfo memory info = _skuAdditionalInfo[sku];
        return block.timestamp > info.startTimestamp && (info.endTimestamp == 0 || block.timestamp < info.endTimestamp);
    }

    /// @inheritdoc Sale
    function _delivery(PurchaseData memory purchase) internal override {
        super._delivery(purchase);
        SkuAdditionalInfo memory info = _skuAdditionalInfo[purchase.sku];
        uint256 startTimestamp = info.startTimestamp;
        uint256 endTimestamp = info.endTimestamp;
        require(block.timestamp > startTimestamp, "Sale: not started yet");
        require(endTimestamp == 0 || block.timestamp < endTimestamp, "Sale: already ended");

        uint256 length = info.tokenIds.length;
        if (length == 1) {
            vouchersContract.safeMint(purchase.recipient, info.tokenIds[0], purchase.quantity, "");
        } else {
            uint256 purchaseQuantity = purchase.quantity;
            uint256[] memory quantities = new uint256[](length);
            for (uint256 i; i != length; ++i) {
                quantities[i] = purchaseQuantity;
            }
            vouchersContract.safeBatchMint(purchase.recipient, info.tokenIds, quantities, "");
        }
    }
}

interface IVouchersContract {
    function isFungible(uint256 id) external pure returns (bool);

    function safeMint(
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external;

    function safeBatchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external;
}
