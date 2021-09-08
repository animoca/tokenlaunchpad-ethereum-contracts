// SPDX-License-Identifier: MIT

pragma solidity >=0.7.6 <0.8.0;

import {IForwarderRegistry, TokenLaunchpadVouchers} from "../../../token/ERC1155/TokenLaunchpadVouchers.sol";

contract TokenLaunchpadVouchersMock is TokenLaunchpadVouchers {
    constructor(IForwarderRegistry forwarderRegistry, address universalForwarder) TokenLaunchpadVouchers(forwarderRegistry, universalForwarder) {}

    function msgData() external view returns (bytes memory ret) {
        return _msgData();
    }
}
