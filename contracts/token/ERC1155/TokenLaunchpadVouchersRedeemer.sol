// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6 <0.8.0;

import {ERC1155TokenReceiver} from "@animoca/ethereum-contracts-assets-1.1.5/contracts/token/ERC1155/ERC1155TokenReceiver.sol";
import {IERC1155InventoryBurnable} from "@animoca/ethereum-contracts-assets-1.1.5/contracts/token/ERC1155/IERC1155InventoryBurnable.sol";
import {IWrappedERC20, ERC20Wrapper} from "@animoca/ethereum-contracts-core-1.1.2/contracts/utils/ERC20Wrapper.sol";
import {Ownable} from "@animoca/ethereum-contracts-core-1.1.2/contracts/access/Ownable.sol";
import {Pausable} from "@animoca/ethereum-contracts-core-1.1.2/contracts/lifecycle/Pausable.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title TokenLaunchpadVouchersRedeemer
 * An ERC1155TokenReceiver contract implementation used to redeem (burn) TokenLaunchpad vouchers for
 * their representative value in a given ERC20 token.
 */
abstract contract TokenLaunchpadVouchersRedeemer is ERC1155TokenReceiver, Ownable, Pausable {
    using ERC20Wrapper for IWrappedERC20;
    using SafeMath for uint256;

    IERC1155InventoryBurnable public immutable vouchersContract;
    IWrappedERC20 public immutable tokenContract;
    address public tokenHolder;

    /**
     * Constructor.
     * @param vouchersContract_ the address of the vouchers contract.
     * @param tokenContract_ the address of the ERC20 token contract.
     * @param tokenHolder_ the address of the ERC20 token holder.
     */
    constructor(
        IERC1155InventoryBurnable vouchersContract_,
        IWrappedERC20 tokenContract_,
        address tokenHolder_
    ) Ownable(msg.sender) Pausable(false) {
        vouchersContract = vouchersContract_;
        tokenContract = tokenContract_;
        tokenHolder = tokenHolder_;
    }

    /**
     * Handle the receipt of a single ERC1155 token type.
     * @dev See {IERC1155TokenReceiver-onERC1155Received(address,address,uint256,uint256,bytes)}.
     */
    function onERC1155Received(
        address, /*operator*/
        address from,
        uint256 id,
        uint256 value,
        bytes calldata /*data*/
    ) external virtual override returns (bytes4) {
        _requireNotPaused();
        require(msg.sender == address(vouchersContract), "Redeemer: wrong sender");
        vouchersContract.burnFrom(address(this), id, value);
        uint256 tokenAmount = _voucherValue(id).mul(value);
        tokenContract.wrappedTransferFrom(tokenHolder, from, tokenAmount);
        return _ERC1155_RECEIVED;
    }

    /**
     * Handle the receipt of multiple ERC1155 token types.
     * @dev See {IERC1155TokenReceiver-onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)}.
     */
    function onERC1155BatchReceived(
        address, /*operator*/
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata /*data*/
    ) external virtual override returns (bytes4) {
        _requireNotPaused();
        require(msg.sender == address(vouchersContract), "Redeemer: wrong sender");
        vouchersContract.batchBurnFrom(address(this), ids, values);
        uint256 tokenAmount;
        for (uint256 i; i != ids.length; ++i) {
            uint256 id = ids[i];
            tokenAmount = tokenAmount.add(_voucherValue(id).mul(values[i]));
        }
        tokenContract.wrappedTransferFrom(tokenHolder, from, tokenAmount);
        return _ERC1155_BATCH_RECEIVED;
    }

    /**
     * Sets the token holder address.
     * @dev Reverts if the sender is not the contract owner.
     * @param tokenHolder_ the new address for the token holder.
     */
    function setTokenHolder(address tokenHolder_) external virtual {
        _requireOwnership(_msgSender());
        tokenHolder = tokenHolder_;
    }

    /**
     * Pauses the contract.
     * @dev Reverts if the sender is not the contract owner.
     * @dev Reverts if the contract is already paused.
     * @dev Emits a {Pausable-Paused} event.
     */
    function pause() external virtual {
        _requireOwnership(_msgSender());
        _pause();
    }

    /**
     * Unpauses the contract.
     * @dev Reverts if the sender is not the contract owner.
     * @dev Reverts if the contract is not paused.
     * @dev Emits a {Pausable-Unpaused} event.
     */
    function unpause() external virtual {
        _requireOwnership(_msgSender());
        _unpause();
    }

    /**
     * Validates the validity of the voucher for a specific redeemer deployment and returns the value of the voucher.
     * @dev Reverts if the voucher is not valid for this redeemer.
     * @param tokenId the id of the voucher.
     * @return the value of the voucher in ERC20 token.
     */
    function _voucherValue(uint256 tokenId) internal pure virtual returns (uint256);
}
