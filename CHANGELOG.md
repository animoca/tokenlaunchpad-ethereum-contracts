# Changelog

## 2.2.1

### New features

- Added `UMADMock.sol` with 8 decimals.

## 2.2.0

### New features

- Added `updateSkuTimestamps(bytes32,uint256,uint256)` and `canPurchaseSku(bytes32)` functions to `TokenLaunchpadVoucherPacksSale.sol`.

### Bug fixes

- `TokenLaunchpadVoucherPacksSale.getSkuAdditionalInfo(bytes32)` correctly reverts if the SKU does not exist.

## 2.1.0

### New features

- Added `TokenLaunchpadVoucherPacksSale.sol` which handles multiple tokens delivery and start/end timestamp per sku.

## 2.0.1

- Identical to 2.0.0, but publishing on npmjs bugged.

## 2.0.0

### Breaking changes

- Updated dependency to `@animoca/ethereum-contracts-assets@2.0.0`.
- Removed `TokenLaunchpadVouchersRedeemer.sol` to integrated it as generic `ERC1155VouchersRedeemer.sol` in `@animoca/ethereum-contracts-assets`.
- Removed Pausable feature from TokenLaunchpadVouchers.

## 1.1.0

### Improvements

- Removed mintable ERC165 interface from TokenLaunchpadVouchers.

## 1.0.0

- Initial release.
