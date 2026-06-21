// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./DonationRequest.sol";
import "./ReputationSystem.sol";

contract Donation is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    enum DonationStatus {
        Created,
        Accepted,
        PickedUp,
        Delivered,
        Verified
    }

    struct DonationInfo {
        uint256 donationId;
        uint256 requestId;
        address donor;
        address ngo;
        string donationCID;
        DonationStatus status;
    }

    DonationRequest public donationRequestContract;
    ReputationSystem public reputationSystem;
    uint256 private _nextDonationId;

    mapping(uint256 => DonationInfo) private _donations;
    uint256[] private _donationIds;

    event DonationAccepted(uint256 indexed donationId, uint256 indexed requestId, address indexed donor, address ngo);
    event DonationPickedUp(uint256 indexed donationId);
    event DonationDelivered(uint256 indexed donationId, string deliveryProofCID);
    event DonationVerified(uint256 indexed donationId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, address _donationRequestAddr, address _reputationSystemAddr) public initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        donationRequestContract = DonationRequest(_donationRequestAddr);
        reputationSystem = ReputationSystem(_reputationSystemAddr);
        _nextDonationId = 1;
    }

    function setContracts(address _donationRequestAddr, address _reputationSystemAddr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        donationRequestContract = DonationRequest(_donationRequestAddr);
        reputationSystem = ReputationSystem(_reputationSystemAddr);
    }

    function acceptDonation(uint256 requestId, string calldata donationCID) external whenNotPaused returns (uint256) {
        // Fetch request info from request contract
        DonationRequest.RequestInfo memory req = donationRequestContract.getRequest(requestId);
        require(req.active, "Food request is not active or already completed");
        require(req.ngo != msg.sender, "NGO cannot fulfill their own request");

        uint256 donationId = _nextDonationId++;
        _donations[donationId] = DonationInfo({
            donationId: donationId,
            requestId: requestId,
            donor: msg.sender,
            ngo: req.ngo,
            donationCID: donationCID,
            status: DonationStatus.Accepted
        });
        _donationIds.push(donationId);

        // Deactivate the request upon acceptance (so other donors cannot accept it)
        // Wait, the Donation contract can trigger request deactivation.
        try donationRequestContract.deactivateRequest(requestId) {} catch {}

        emit DonationAccepted(donationId, requestId, msg.sender, req.ngo);
        return donationId;
    }

    function markPickedUp(uint256 donationId) external whenNotPaused {
        DonationInfo storage don = _donations[donationId];
        require(don.donor != address(0), "Donation not found");
        require(don.status == DonationStatus.Accepted, "Donation is not in Accepted status");
        require(msg.sender == don.donor || msg.sender == don.ngo, "Only donor or NGO can mark picked up");

        don.status = DonationStatus.PickedUp;
        emit DonationPickedUp(donationId);
    }

    function markDelivered(uint256 donationId, string calldata deliveryProofCID) external whenNotPaused {
        DonationInfo storage don = _donations[donationId];
        require(don.donor != address(0), "Donation not found");
        require(don.status == DonationStatus.PickedUp || don.status == DonationStatus.Accepted, "Donation must be accepted or picked up");
        require(msg.sender == don.donor || msg.sender == don.ngo, "Only donor or NGO can mark delivered");

        don.status = DonationStatus.Delivered;
        don.donationCID = deliveryProofCID; // Store IPFS proof CID

        emit DonationDelivered(donationId, deliveryProofCID);
    }

    function verifyDonation(uint256 donationId) external whenNotPaused {
        DonationInfo storage don = _donations[donationId];
        require(don.donor != address(0), "Donation not found");
        require(don.status == DonationStatus.Delivered, "Donation not in Delivered status");
        require(msg.sender == don.ngo || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Only NGO or Admin can verify");

        don.status = DonationStatus.Verified;

        // Reward reputation to both Donor and NGO upon successful verification
        if (address(reputationSystem) != address(0)) {
            try reputationSystem.increaseReputation(don.donor, 50) {} catch {}
            try reputationSystem.increaseReputation(don.ngo, 30) {} catch {}
        }

        emit DonationVerified(donationId);
    }

    function getDonation(uint256 donationId) external view returns (DonationInfo memory) {
        DonationInfo memory don = _donations[donationId];
        require(don.donor != address(0), "Donation not found");
        return don;
    }

    function getAllDonations() external view returns (DonationInfo[] memory) {
        uint256 total = _donationIds.length;
        DonationInfo[] memory all = new DonationInfo[](total);
        for (uint256 i = 0; i < total; i++) {
            all[i] = _donations[_donationIds[i]];
        }
        return all;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
