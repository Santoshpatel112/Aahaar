import { expect } from "chai";
import pkg from "hardhat";
const { ethers, upgrades } = pkg;

describe("AAHAAR Smart Contracts End-to-End Tests", function () {
  let reputation;
  let ngoRegistry;
  let donationRequest;
  let donation;
  let aahaarDAO;

  let owner;
  let ngo1;
  let ngo2;
  let donor1;

  beforeEach(async function () {
    [owner, ngo1, ngo2, donor1] = await ethers.getSigners();

    // 1. Deploy ReputationSystem
    const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
    reputation = await upgrades.deployProxy(ReputationSystem, [owner.address], { initializer: "initialize", kind: "uups" });
    await reputation.waitForDeployment();

    // 2. Deploy NGORegistry
    const NGORegistry = await ethers.getContractFactory("NGORegistry");
    ngoRegistry = await upgrades.deployProxy(NGORegistry, [owner.address, await reputation.getAddress()], { initializer: "initialize", kind: "uups" });
    await ngoRegistry.waitForDeployment();

    // 3. Deploy DonationRequest
    const DonationRequest = await ethers.getContractFactory("DonationRequest");
    donationRequest = await upgrades.deployProxy(DonationRequest, [owner.address, await ngoRegistry.getAddress()], { initializer: "initialize", kind: "uups" });
    await donationRequest.waitForDeployment();

    // 4. Deploy Donation
    const Donation = await ethers.getContractFactory("Donation");
    donation = await upgrades.deployProxy(Donation, [owner.address, await donationRequest.getAddress(), await reputation.getAddress()], { initializer: "initialize", kind: "uups" });
    await donation.waitForDeployment();

    // 5. Deploy AahaarDAO
    const AahaarDAO = await ethers.getContractFactory("AahaarDAO");
    aahaarDAO = await upgrades.deployProxy(AahaarDAO, [owner.address, await ngoRegistry.getAddress()], { initializer: "initialize", kind: "uups" });
    await aahaarDAO.waitForDeployment();

    // Setup contract permissions
    const UPDATER_ROLE = await reputation.UPDATER_ROLE();
    await reputation.grantRole(UPDATER_ROLE, await ngoRegistry.getAddress());
    await reputation.grantRole(UPDATER_ROLE, await donation.getAddress());

    const VERIFIER_ROLE = await ngoRegistry.VERIFIER_ROLE();
    await ngoRegistry.grantRole(VERIFIER_ROLE, await aahaarDAO.getAddress());

    // Link Donation contract to DonationRequest
    await donationRequest.setDonationContract(await donation.getAddress());
  });

  describe("NGO Registration & Verification Flow", function () {
    it("Should register an NGO with pending verification status", async function () {
      await ngoRegistry.connect(ngo1).registerNGO("Feed India", "QmHashCert1");
      const ngo = await ngoRegistry.getNGO(ngo1.address);

      expect(ngo.ngoName).to.equal("Feed India");
      expect(ngo.ipfsDocumentCID).to.equal("QmHashCert1");
      expect(ngo.verified).to.be.false;
      expect(ngo.reputation).to.equal(0);
    });

    it("Should verify NGO registration and award starting reputation", async function () {
      await ngoRegistry.connect(ngo1).registerNGO("Feed India", "QmHashCert1");
      await ngoRegistry.connect(owner).verifyNGO(ngo1.address);

      const ngo = await ngoRegistry.getNGO(ngo1.address);
      expect(ngo.verified).to.be.true;
      expect(ngo.reputation).to.equal(100);
    });

    it("Should prevent unverified NGOs from creating requests", async function () {
      await ngoRegistry.connect(ngo1).registerNGO("Feed India", "QmHashCert1");
      await expect(
        donationRequest.connect(ngo1).createRequest("Rice & Dal", 50, "Varanasi")
      ).to.be.revertedWith("Only verified NGOs can create food requests");
    });
  });

  describe("Food Request and Donation Flow", function () {
    beforeEach(async function () {
      await ngoRegistry.connect(ngo1).registerNGO("Feed India", "QmHashCert1");
      await ngoRegistry.connect(owner).verifyNGO(ngo1.address);
    });

    it("Should allow verified NGO to create food requests", async function () {
      await donationRequest.connect(ngo1).createRequest("Cooked Meals", 100, "Mumbai");
      const requests = await donationRequest.getActiveRequests();

      expect(requests.length).to.equal(1);
      expect(requests[0].foodType).to.equal("Cooked Meals");
      expect(requests[0].quantity).to.equal(100);
      expect(requests[0].city).to.equal("Mumbai");
      expect(requests[0].active).to.be.true;
    });

    it("Should allow a donor to accept a food request", async function () {
      const tx = await donationRequest.connect(ngo1).createRequest("Cooked Meals", 100, "Mumbai");
      await tx.wait();
      
      // RequestId is 1 since it's the first request
      await donation.connect(donor1).acceptDonation(1, "QmDonationDetailsCID");
      
      const don = await donation.getDonation(1);
      expect(don.requestId).to.equal(1);
      expect(don.donor).to.equal(donor1.address);
      expect(don.status).to.equal(1); // Accepted (DonationStatus enum Index 1)

      // Request should become inactive
      const reqActive = await donationRequest.getRequestStatus(1);
      expect(reqActive).to.be.false;
    });

    it("Should complete the delivery verification lifecycle and reward reputation", async function () {
      await donationRequest.connect(ngo1).createRequest("Cooked Meals", 100, "Mumbai");
      await donation.connect(donor1).acceptDonation(1, "QmDonationDetailsCID");

      await donation.connect(donor1).markPickedUp(1);
      await donation.connect(donor1).markDelivered(1, "QmDeliveryProofCID");
      
      const beforeDonorRep = await reputation.getReputation(donor1.address);
      const beforeNgoRep = await reputation.getReputation(ngo1.address);

      await donation.connect(ngo1).verifyDonation(1);

      const afterDonorRep = await reputation.getReputation(donor1.address);
      const afterNgoRep = await reputation.getReputation(ngo1.address);

      expect(afterDonorRep - beforeDonorRep).to.equal(50);
      expect(afterNgoRep - beforeNgoRep).to.equal(30);

      const don = await donation.getDonation(1);
      expect(don.status).to.equal(4); // Verified (DonationStatus enum Index 4)
    });
  });

  describe("DAO Governance Voting", function () {
    beforeEach(async function () {
      // Setup first NGO, verified by owner/admin
      await ngoRegistry.connect(ngo1).registerNGO("Feed India", "QmHashCert1");
      await ngoRegistry.connect(owner).verifyNGO(ngo1.address);

      // Register second NGO (needs DAO onboarding)
      await ngoRegistry.connect(ngo2).registerNGO("Roti Bank", "QmHashCert2");
    });

    it("Should allow verified NGO to create an onboarding proposal", async function () {
      await aahaarDAO.connect(ngo1).createProposal(ngo2.address, 0, "Onboard Roti Bank NGO");
      const proposal = await aahaarDAO.connect(ngo1).getProposal(1);

      expect(proposal.targetNGO).to.equal(ngo2.address);
      expect(proposal.proposalType).to.equal(0); // Onboard enum Index 0
      expect(proposal.executed).to.be.false;
    });

    it("Should onboard NGO automatically upon execution with majority votes", async function () {
      await aahaarDAO.connect(ngo1).createProposal(ngo2.address, 0, "Onboard Roti Bank NGO");
      
      // Vote support = true
      await aahaarDAO.connect(ngo1).vote(1, true);

      // Fast forward time to finish voting period or execute directly since quorum of 1 is met in test parameters
      await ethers.provider.send("evm_increaseTime", [3 * 86400]); // 3 days
      await ethers.provider.send("evm_mine");

      await aahaarDAO.connect(owner).executeProposal(1);

      const proposal = await aahaarDAO.connect(ngo1).getProposal(1);
      expect(proposal.executed).to.be.true;

      const isVerified = await ngoRegistry.isNGOVerified(ngo2.address);
      expect(isVerified).to.be.true;
    });
  });
});
