// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./NGORegistry.sol";

contract AahaarDAO is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    enum ProposalType { Onboard, Remove }
    enum ProposalState { Pending, Passed, Failed, Executed }

    struct Proposal {
        uint256 id;
        address targetNGO;
        ProposalType proposalType;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        ProposalState state;
    }

    NGORegistry public ngoRegistry;
    uint256 private _nextProposalId;
    uint256 public votingDuration;

    mapping(uint256 => Proposal) private _proposals;
    uint256[] private _proposalIds;
    
    // proposalId => (voter => hasVoted)
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    event ProposalCreated(uint256 indexed proposalId, address targetNGO, ProposalType proposalType, string description, uint256 deadline);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 currentVotesFor, uint256 currentVotesAgainst);
    event ProposalExecuted(uint256 indexed proposalId, ProposalState finalState);

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
        _nextProposalId = 1;
        votingDuration = 3 days; // 3 days default voting period
    }

    function setNgoRegistry(address _ngoRegistryAddr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ngoRegistry = NGORegistry(_ngoRegistryAddr);
    }

    function setVotingDuration(uint256 duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingDuration = duration;
    }

    function createProposal(address targetNGO, ProposalType pType, string calldata description) external whenNotPaused returns (uint256) {
        // Only verified NGOs or Admin can create proposals
        require(ngoRegistry.isNGOVerified(msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Only verified NGOs or Admin can create proposals");
        require(targetNGO != address(0), "Invalid target NGO address");

        uint256 proposalId = _nextProposalId++;
        uint256 deadline = block.timestamp + votingDuration;

        _proposals[proposalId] = Proposal({
            id: proposalId,
            targetNGO: targetNGO,
            proposalType: pType,
            description: description,
            votesFor: 0,
            votesAgainst: 0,
            deadline: deadline,
            executed: false,
            state: ProposalState.Pending
        });
        _proposalIds.push(proposalId);

        emit ProposalCreated(proposalId, targetNGO, pType, description, deadline);
        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external whenNotPaused {
        require(ngoRegistry.isNGOVerified(msg.sender), "Only verified NGOs can vote");
        Proposal storage prop = _proposals[proposalId];
        require(block.timestamp < prop.deadline, "Voting period has ended");
        require(!prop.executed, "Proposal already executed");
        require(!_hasVoted[proposalId][msg.sender], "Already voted on this proposal");

        _hasVoted[proposalId][msg.sender] = true;
        if (support) {
            prop.votesFor++;
        } else {
            prop.votesAgainst++;
        }

        emit Voted(proposalId, msg.sender, support, prop.votesFor, prop.votesAgainst);
    }

    function executeProposal(uint256 proposalId) external whenNotPaused {
        Proposal storage prop = _proposals[proposalId];
        require(!prop.executed, "Proposal already executed");
        require(block.timestamp >= prop.deadline || (prop.votesFor > 2 && prop.votesFor > prop.votesAgainst), "Voting period not finished or quorum not met");

        prop.executed = true;
        bool isPassed = prop.votesFor > prop.votesAgainst;

        if (isPassed) {
            prop.state = ProposalState.Passed;
            if (prop.proposalType == ProposalType.Onboard) {
                // Verify the NGO using the NGORegistry reference
                // AahaarDAO contract must be granted VERIFIER_ROLE on NGORegistry to perform this action
                ngoRegistry.verifyNGO(prop.targetNGO);
            } else if (prop.proposalType == ProposalType.Remove) {
                // Reject/Remove the NGO
                ngoRegistry.rejectNGO(prop.targetNGO);
            }
        } else {
            prop.state = ProposalState.Failed;
            if (prop.proposalType == ProposalType.Onboard) {
                ngoRegistry.rejectNGO(prop.targetNGO);
            }
        }

        prop.state = ProposalState.Executed;
        emit ProposalExecuted(proposalId, prop.state);
    }

    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address targetNGO,
        ProposalType proposalType,
        string memory description,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 deadline,
        bool executed,
        ProposalState state,
        bool voterVoted
    ) {
        Proposal memory prop = _proposals[proposalId];
        require(prop.targetNGO != address(0), "Proposal not found");
        return (
            prop.id,
            prop.targetNGO,
            prop.proposalType,
            prop.description,
            prop.votesFor,
            prop.votesAgainst,
            prop.deadline,
            prop.executed,
            prop.state,
            _hasVoted[proposalId][msg.sender]
        );
    }

    function getAllProposals() external view returns (Proposal[] memory) {
        uint256 total = _proposalIds.length;
        Proposal[] memory all = new Proposal[](total);
        for (uint256 i = 0; i < total; i++) {
            all[i] = _proposals[_proposalIds[i]];
        }
        return all;
    }

    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _hasVoted[proposalId][voter];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
