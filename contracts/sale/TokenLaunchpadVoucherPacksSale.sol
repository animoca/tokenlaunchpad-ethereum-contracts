// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6 <0.8.0;

import {Sale, FixedPricesSale} from "@animoca/ethereum-contracts-sale-2.0.0/contracts/sale/FixedPricesSale.sol";
import {Recoverable} from "@animoca/ethereum-contracts-core-1.1.2/contracts/utils/Recoverable.sol";

/**
 * @title TokenLaunchpad Vouchers Sale
 * A FixedPricesSale contract that handles the purchase and delivery of TokenLaunchpad vouchers.
 */
contract TokenLaunchpadVoucherPacksSale is FixedPricesSale, Recoverable {
    IVouchersContract public immutable vouchersContract;

    mapping(bytes32 => uint256[]) public skuTokenIds;

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
     * Creates an SKU.
     * @dev Reverts if `totalSupply` is zero.
     * @dev Reverts if `sku` already exists.
     * @dev Reverts if `notificationsReceiver` is not the zero address and is not a contract address.
     * @dev Reverts if the update results in too many SKUs.
     * @dev Reverts if `tokenId` is zero.
     * @dev Emits the `SkuCreation` event.
     * @param sku The SKU identifier.
     * @param totalSupply The initial total supply.
     * @param maxQuantityPerPurchase The maximum allowed quantity for a single purchase.
     * param notificationsReceiver The purchase notifications receiver contract address.
     *  If set to the zero address, the notification is not enabled.
     * @param tokenIds The inventory contract token IDs to associate with the SKU, used for purchase delivery.
     */
    function createSku(
        bytes32 sku,
        uint256 totalSupply,
        uint256 maxQuantityPerPurchase,
        uint256[] calldata tokenIds
    ) external {
        _requireOwnership(_msgSender());
        for (uint256 i; i != tokenIds.length; ++i) {
            require(vouchersContract.isFungible(tokenIds[i]), "Sale: not a fungible token");
        }
        skuTokenIds[sku] = tokenIds;
        _createSku(sku, totalSupply, maxQuantityPerPurchase, address(0));
    }

    /// @inheritdoc Sale
    function _delivery(PurchaseData memory purchase) internal override {
        super._delivery(purchase);

        uint256 purchaseQuantity = purchase.quantity;

        uint256[] memory pack = skuTokenIds[purchase.sku];
        uint256 length = pack.length;

        uint256[] memory tokenIds = new uint256[](length);
        uint256[] memory quantities = new uint256[](length);
        for (uint256 i; i != length; ++i) {
            tokenIds[i] = pack[i];
            quantities[i] = purchaseQuantity;
        }

        vouchersContract.safeBatchMint(purchase.recipient, tokenIds, quantities, "");
    }
}

interface IVouchersContract {
    function isFungible(uint256 id) external pure returns (bool);

    function safeBatchMint(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external;
}
