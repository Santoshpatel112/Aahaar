import pkg from "hardhat";
const { ethers, upgrades } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();
  const adminAddress = deployer.address;
  console.log("Starting deployment with signer:", adminAddress);

  // 1. Deploy ReputationSystem
  console.log("Deploying ReputationSystem...");
  const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
  const reputation = await upgrades.deployProxy(ReputationSystem, [adminAddress], { initializer: "initialize", kind: "uups" });
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("ReputationSystem deployed to:", reputationAddress);

  // 2. Deploy NGORegistry
  console.log("Deploying NGORegistry...");
  const NGORegistry = await ethers.getContractFactory("NGORegistry");
  const ngoRegistry = await upgrades.deployProxy(NGORegistry, [adminAddress, reputationAddress], { initializer: "initialize", kind: "uups" });
  await ngoRegistry.waitForDeployment();
  const ngoRegistryAddress = await ngoRegistry.getAddress();
  console.log("NGORegistry deployed to:", ngoRegistryAddress);

  // 3. Deploy DonationRequest
  console.log("Deploying DonationRequest...");
  const DonationRequest = await ethers.getContractFactory("DonationRequest");
  const donationRequest = await upgrades.deployProxy(DonationRequest, [adminAddress, ngoRegistryAddress], { initializer: "initialize", kind: "uups" });
  await donationRequest.waitForDeployment();
  const donationRequestAddress = await donationRequest.getAddress();
  console.log("DonationRequest deployed to:", donationRequestAddress);

  // 4. Deploy Donation
  console.log("Deploying Donation...");
  const Donation = await ethers.getContractFactory("Donation");
  const donation = await upgrades.deployProxy(Donation, [adminAddress, donationRequestAddress, reputationAddress], { initializer: "initialize", kind: "uups" });
  await donation.waitForDeployment();
  const donationAddress = await donation.getAddress();
  console.log("Donation deployed to:", donationAddress);

  // 5. Deploy AahaarDAO
  console.log("Deploying AahaarDAO...");
  const AahaarDAO = await ethers.getContractFactory("AahaarDAO");
  const aahaarDAO = await upgrades.deployProxy(AahaarDAO, [adminAddress, ngoRegistryAddress], { initializer: "initialize", kind: "uups" });
  await aahaarDAO.waitForDeployment();
  const aahaarDAOAddress = await aahaarDAO.getAddress();
  console.log("AahaarDAO deployed to:", aahaarDAOAddress);

  // --- Setting up roles and permissions ---
  console.log("Setting up contract roles and links...");

  // Grant UPDATER_ROLE to NGORegistry and Donation contracts in ReputationSystem
  const UPDATER_ROLE = await reputation.UPDATER_ROLE();
  await reputation.grantRole(UPDATER_ROLE, ngoRegistryAddress);
  await reputation.grantRole(UPDATER_ROLE, donationAddress);
  console.log("Granted UPDATER_ROLE to NGORegistry and Donation contracts.");

  // Grant VERIFIER_ROLE to AahaarDAO contract in NGORegistry
  const VERIFIER_ROLE = await ngoRegistry.VERIFIER_ROLE();
  await ngoRegistry.grantRole(VERIFIER_ROLE, aahaarDAOAddress);
  console.log("Granted VERIFIER_ROLE to AahaarDAO.");

  // Link Donation contract to DonationRequest
  await donationRequest.setDonationContract(donationAddress);
  console.log("Linked Donation contract in DonationRequest.");

  console.log("All roles and linkages completed successfully!");

  // --- Helper to read ABI from artifacts ---
  const readAbi = (contractName) => {
    const artifactPath = path.join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    const fileContent = fs.readFileSync(artifactPath, "utf-8");
    return JSON.parse(fileContent).abi;
  };

  // --- Outputting ABIs and addresses to backend and frontend ---
  const contractDetails = {
    addresses: {
      ReputationSystem: reputationAddress,
      NGORegistry: ngoRegistryAddress,
      DonationRequest: donationRequestAddress,
      Donation: donationAddress,
      AahaarDAO: aahaarDAOAddress,
    },
    abis: {
      ReputationSystem: readAbi("ReputationSystem"),
      NGORegistry: readAbi("NGORegistry"),
      DonationRequest: readAbi("DonationRequest"),
      Donation: readAbi("Donation"),
      AahaarDAO: readAbi("AahaarDAO"),
    },
  };

  const outputFileName = "contract-details.json";
  
  // Write to Backend
  const backendDir = path.join(__dirname, "../../backend/blockchain");
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }
  fs.writeFileSync(path.join(backendDir, outputFileName), JSON.stringify(contractDetails, null, 2));
  console.log("Exported contract details to backend:", path.join(backendDir, outputFileName));

  // Write to Frontend
  const frontendDir = path.join(__dirname, "../../frontend/src/blockchain");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  fs.writeFileSync(path.join(frontendDir, outputFileName), JSON.stringify(contractDetails, null, 2));
  console.log("Exported contract details to frontend:", path.join(frontendDir, outputFileName));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
