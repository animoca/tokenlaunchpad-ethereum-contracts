// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6 <0.8.0;

import {IERC1155InventoryBurnable, IWrappedERC20, TokenLaunchpadVouchersRedeemer} from "../../../token/ERC1155/TokenLaunchpadVouchersRedeemer.sol";

contract TokenLaunchpadVouchersRedeemerMock is TokenLaunchpadVouchersRedeemer {
    constructor(
        IERC1155InventoryBurnable vouchersContract,
        IWrappedERC20 tokenContract,
        address tokenHolder
    ) TokenLaunchpadVouchersRedeemer(vouchersContract, tokenContract, tokenHolder) {}

    function _voucherValue(uint256 tokenId) internal pure override returns (uint256) {
        return tokenId;
    }
}
