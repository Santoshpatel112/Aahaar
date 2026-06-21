// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./NGORegistry.sol";

contract DonationRequest is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    struct RequestInfo {
        uint256 requestId;
        address ngo;
        string foodType;
        uint256 quantity;
        string city;
        uint256 createdAt;
        bool active;
    }

    NGORegistry public ngoRegistry;
    address public donationContract;
    uint256 private _nextRequestId;

    mapping(uint256 => RequestInfo) private _requests;
    uint256[] private _requestIds;

    event DonationRequestCreated(uint256 indexed requestId, address indexed ngo, string foodType, uint256 quantity, string city);
    event DonationRequestCancelled(uint256 indexed requestId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, address _ngoRegistryAddr) public initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        ngoRegistry = NGORegistry(_ngoRegistryAddr);
        _nextRequestId = 1;
    }

    function setNgoRegistry(address _ngoRegistryAddr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ngoRegistry = NGORegistry(_ngoRegistryAddr);
    }

    function setDonationContract(address _donationContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        donationContract = _donationContract;
    }

    function createRequest(string calldata foodType, uint256 quantity, string calldata city) external whenNotPaused returns (uint256) {
        // Enforce that only verified NGOs can request food
        require(ngoRegistry.isNGOVerified(msg.sender), "Only verified NGOs can create food requests");
        require(quantity > 0, "Quantity must be greater than 0");
        require(bytes(foodType).length > 0, "Food type cannot be empty");

        uint256 reqId = _nextRequestId++;
        _requests[reqId] = RequestInfo({
            requestId: reqId,
            ngo: msg.sender,
            foodType: foodType,
            quantity: quantity,
            city: city,
            createdAt: block.timestamp,
            active: true
        });
        _requestIds.push(reqId);

        emit DonationRequestCreated(reqId, msg.sender, foodType, quantity, city);
        return reqId;
    }

    function cancelRequest(uint256 requestId) external whenNotPaused {
        RequestInfo storage req = _requests[requestId];
        require(req.ngo == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not authorized to cancel this request");
        require(req.active, "Request is not active");

        req.active = false;
        emit DonationRequestCancelled(requestId);
    }

    function getRequest(uint256 requestId) external view returns (RequestInfo memory) {
        RequestInfo memory req = _requests[requestId];
        require(req.ngo != address(0), "Request not found");
        return req;
    }

    function getRequestStatus(uint256 requestId) external view returns (bool) {
        return _requests[requestId].active;
    }

    function getAllRequests() external view returns (RequestInfo[] memory) {
        uint256 total = _requestIds.length;
        RequestInfo[] memory all = new RequestInfo[](total);
        for (uint256 i = 0; i < total; i++) {
            all[i] = _requests[_requestIds[i]];
        }
        return all;
    }

    function getActiveRequests() external view returns (RequestInfo[] memory) {
        uint256 activeCount = 0;
        uint256 total = _requestIds.length;
        for (uint256 i = 0; i < total; i++) {
            if (_requests[_requestIds[i]].active) {
                activeCount++;
            }
        }

        RequestInfo[] memory activeReqs = new RequestInfo[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < total; i++) {
            if (_requests[_requestIds[i]].active) {
                activeReqs[index] = _requests[_requestIds[i]];
                index++;
            }
        }
        return activeReqs;
    }

    function deactivateRequest(uint256 requestId) external whenNotPaused {
        // Safe check for the Donation contract to deactivate requests when fully claimed
        require(msg.sender == donationContract || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not authorized");
        _requests[requestId].active = false;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
