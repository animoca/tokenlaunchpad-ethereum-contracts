// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6 <0.8.0;

import {ERC1155InventoryBurnable} from "@animoca/ethereum-contracts-assets-1.1.5/contracts/token/ERC1155/ERC1155InventoryBurnable.sol";
import {IERC1155InventoryMintable} from "@animoca/ethereum-contracts-assets-1.1.5/contracts/token/ERC1155/IERC1155InventoryMintable.sol";
import {IERC1155InventoryCreator} from "@animoca/ethereum-contracts-assets-1.1.5/contracts/token/ERC1155/IERC1155InventoryCreator.sol";
import {BaseMetadataURI} from "@animoca/ethereum-contracts-assets-1.1.5/contracts/metadata/BaseMetadataURI.sol";
import {ManagedIdentity, Recoverable} from "@animoca/ethereum-contracts-core-1.1.2/contracts/utils/Recoverable.sol";
import {MinterRole} from "@animoca/ethereum-contracts-core-1.1.2/contracts/access/MinterRole.sol";
import {Pausable} from "@animoca/ethereum-contracts-core-1.1.2/contracts/lifecycle/Pausable.sol";
import {IForwarderRegistry, UsingUniversalForwarding} from "ethereum-universal-forwarder/src/solc_0.7/ERC2771/UsingUniversalForwarding.sol";

/**
 * @title TokenLaunchpadVouchers
 */
contract TokenLaunchpadVouchers is
    ERC1155InventoryBurnable,
    IERC1155InventoryMintable,
    IERC1155InventoryCreator,
    BaseMetadataURI,
    MinterRole,
    Pausable,
    Recoverable,
    UsingUniversalForwarding
{
    constructor(IForwarderRegistry forwarderRegistry, address universalForwarder)
        MinterRole(msg.sender)
        Pausable(false)
        UsingUniversalForwarding(forwarderRegistry, universalForwarder)
    {}

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC1155InventoryCreator).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * Creates a collection.
     * @dev Reverts if the sender is not the contract owner.
     * @dev Reverts if `collectionId` does not represent a collection.
     * @dev Reverts if `collectionId` has already been created.
     * @dev Emits a {IERC1155Inventory-CollectionCreated} event.
     * @param collectionId Identifier of the collection.
     */
    function createCollection(uint256 collectionId) external {
        _requireOwnership(_msgSender());
        _createCollection(collectionId);
    }

    /**
     * Returns the creator of a collection, or the zero address if the collection has not been created.
     * @dev See {IERC1155InventoryCreator-creator(uint256)}.
     */
    function creator(uint256 collectionId) external view override returns (address) {
        return _creator(collectionId);
    }

    /**
     * A distinct Uniform Resource Identifier (URI) for a given token.
     * @dev See {IERC1155MetadataURI-uri(uint256)}.
     */
    function uri(uint256 id) public view virtual override returns (string memory) {
        return _uri(id);
    }

    /**
     * Safely transfers some token.
     * @dev See {IERC1155-safeTransferFrom(address,address,uint256,uint256,bytes)}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public virtual override {
        _requireNotPaused();
        super.safeTransferFrom(from, to, id, value, data);
    }

    /**
     * Safely transfers a batch of tokens.
     * @dev See {IERC1155-safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)}.
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual override {
        _requireNotPaused();
        super.safeBatchTransferFrom(from, to, ids, values, data);
    }

    /**
     * Burns some token.
     * @dev See {IERC1155InventoryBurnable-burnFrom(address,uint256,uint256)}.
     */
    function burnFrom(
        address from,
        uint256 id,
        uint256 value
    ) public virtual override {
        _requireNotPaused();
        super.burnFrom(from, id, value);
    }

    /**
     * Burns multiple tokens.
     * @dev See {IERC1155InventoryBurnable-batchBurnFrom(address,uint256[],uint256[])}.
     */
    function batchBurnFrom(
        address from,
        uint256[] memory ids,
        uint256[] memory values
    ) public virtual override {
        _requireNotPaused();
        super.batchBurnFrom(from, ids, values);
    }

    /**
     * Safely mints some token.
     * @dev See {IERC1155InventoryMintable-safeMint(address,uint256,uint256,bytes)}.
     */
    function safeMint(
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public virtual override {
        _requireMinter(_msgSender());
        _safeMint(to, id, value, data);
    }

    /**
     * Safely mints a batch of tokens.
     * @dev See {IERC1155InventoryMintable-safeBatchMint(address,uint256[],uint256[],bytes)}.
     */
    function safeBatchMint(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual override {
        _requireMinter(_msgSender());
        _safeBatchMint(to, ids, values, data);
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

    function _msgSender() internal view virtual override(ManagedIdentity, UsingUniversalForwarding) returns (address payable) {
        return UsingUniversalForwarding._msgSender();
    }

    function _msgData() internal view virtual override(ManagedIdentity, UsingUniversalForwarding) returns (bytes memory ret) {
        return UsingUniversalForwarding._msgData();
    }
}
