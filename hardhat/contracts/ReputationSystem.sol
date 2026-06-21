// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

contract ReputationSystem is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    mapping(address => uint256) private _reputation;

    event ReputationUpdated(address indexed user, uint256 oldReputation, uint256 newReputation);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
      __AccessControl_init();
      __Pausable_init();

      _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(UPDATER_ROLE, admin);
    }

    function increaseReputation(address user, uint256 amount) external onlyRole(UPDATER_ROLE) whenNotPaused {
        uint256 oldRepValue = _reputation[user];
        _reputation[user] = oldRepValue + amount;
        emit ReputationUpdated(user, oldRepValue, _reputation[user]);
    }

    function decreaseReputation(address user, uint256 amount) external onlyRole(UPDATER_ROLE) whenNotPaused {
        uint256 oldRepValue = _reputation[user];
        if (_reputation[user] > amount) {
            _reputation[user] = oldRepValue - amount;
        } else {
            _reputation[user] = 0;
        }
        emit ReputationUpdated(user, oldRepValue, _reputation[user]);
    }

    function getReputation(address user) external view returns (uint256) {
        return _reputation[user];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
