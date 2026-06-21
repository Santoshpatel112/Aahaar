// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./ReputationSystem.sol";

contract NGORegistry is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    struct NGO {
        uint256 ngoId;
        address wallet;
        string ngoName;
        string ipfsDocumentCID;
        bool verified;
        uint256 reputation; // Fetched dynamically or cached
    }

    ReputationSystem public reputationSystem;
    uint256 private _nextNgoId;

    mapping(address => NGO) private _ngos;
    address[] private _ngoAddresses;

    event NGORegistered(uint256 indexed ngoId, address indexed wallet, string ngoName, string ipfsDocumentCID);
    event NGOVerified(address indexed wallet);
    event NGORejected(address indexed wallet);
    event NGOStatusUpdated(address indexed wallet, bool verified);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, address _reputationSystemAddr) public initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);

        reputationSystem = ReputationSystem(_reputationSystemAddr);
        _nextNgoId = 1;
    }

    function setReputationSystem(address _reputationSystemAddr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reputationSystem = ReputationSystem(_reputationSystemAddr);
    }

    function registerNGO(string calldata ngoName, string calldata ipfsDocumentCID) external whenNotPaused {
        require(_ngos[msg.sender].wallet == address(0), "NGO already registered");
        require(bytes(ngoName).length > 0, "NGO Name cannot be empty");

        uint256 id = _nextNgoId++;
        _ngos[msg.sender] = NGO({
            ngoId: id,
            wallet: msg.sender,
            ngoName: ngoName,
            ipfsDocumentCID: ipfsDocumentCID,
            verified: false,
            reputation: 0
        });
        _ngoAddresses.push(msg.sender);

        emit NGORegistered(id, msg.sender, ngoName, ipfsDocumentCID);
    }

    function verifyNGO(address ngoWallet) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        NGO storage ngo = _ngos[ngoWallet];
        require(ngo.wallet != address(0), "NGO not found");
        require(!ngo.verified, "NGO already verified");

        ngo.verified = true;
        
        // Onboarding initial reputation
        try reputationSystem.increaseReputation(ngoWallet, 100) {} catch {}

        emit NGOVerified(ngoWallet);
        emit NGOStatusUpdated(ngoWallet, true);
    }

    function rejectNGO(address ngoWallet) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        NGO storage ngo = _ngos[ngoWallet];
        require(ngo.wallet != address(0), "NGO not found");
        
        ngo.verified = false;
        
        emit NGORejected(ngoWallet);
        emit NGOStatusUpdated(ngoWallet, false);
    }

    function updateNGOStatus(address ngoWallet, bool verified) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        NGO storage ngo = _ngos[ngoWallet];
        require(ngo.wallet != address(0), "NGO not found");
        ngo.verified = verified;
        emit NGOStatusUpdated(ngoWallet, verified);
    }

    function getNGO(address ngoWallet) external view returns (NGO memory) {
        NGO memory ngo = _ngos[ngoWallet];
        require(ngo.wallet != address(0), "NGO not found");
        
        // Fetch latest reputation from the ReputationSystem contract
        if (address(reputationSystem) != address(0)) {
            ngo.reputation = reputationSystem.getReputation(ngoWallet);
        }
        return ngo;
    }

    function isNGOVerified(address ngoWallet) external view returns (bool) {
        return _ngos[ngoWallet].verified;
    }

    function getAllNGOAddresses() external view returns (address[] memory) {
        return _ngoAddresses;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
