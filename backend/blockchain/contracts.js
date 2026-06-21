import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { provider, signer } from "./provider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const detailsPath = path.join(__dirname, "contract-details.json");

let contractsData = null;
try {
  if (fs.existsSync(detailsPath)) {
    const rawData = fs.readFileSync(detailsPath, "utf-8");
    contractsData = JSON.parse(rawData);
  }
} catch (error) {
  console.error("⚠️ Failed to read contract-details.json:", error.message);
}

export const isDeployed = !!contractsData;

export let ReputationSystemContract = null;
export let NGORegistryContract = null;
export let DonationRequestContract = null;
export let DonationContract = null;
export let AahaarDAOContract = null;

if (isDeployed) {
  try {
    const { addresses, abis } = contractsData;
    
    ReputationSystemContract = new ethers.Contract(addresses.ReputationSystem, abis.ReputationSystem, signer);
    NGORegistryContract = new ethers.Contract(addresses.NGORegistry, abis.NGORegistry, signer);
    DonationRequestContract = new ethers.Contract(addresses.DonationRequest, abis.DonationRequest, signer);
    DonationContract = new ethers.Contract(addresses.Donation, abis.Donation, signer);
    AahaarDAOContract = new ethers.Contract(addresses.AahaarDAO, abis.AahaarDAO, signer);
    
    console.log("✅ Smart Contracts successfully loaded in backend.");
  } catch (error) {
    console.error("❌ Error initializing smart contract instances:", error.message);
  }
} else {
  console.warn("⚠️ contract-details.json not found. Run deployment script to setup contracts.");
}

/**
 * Helper to get user-specific contract instances for client interactions
 * @param {string} userPrivateKey - Optional user wallet key
 * @returns {object} Object containing contract instances signed by user or system
 */
export const getContractsForUser = (userPrivateKey) => {
  if (!isDeployed) return {};
  const { addresses, abis } = contractsData;
  const userSigner = userPrivateKey ? new ethers.Wallet(userPrivateKey, provider) : signer;
  return {
    ReputationSystem: new ethers.Contract(addresses.ReputationSystem, abis.ReputationSystem, userSigner),
    NGORegistry: new ethers.Contract(addresses.NGORegistry, abis.NGORegistry, userSigner),
    DonationRequest: new ethers.Contract(addresses.DonationRequest, abis.DonationRequest, userSigner),
    Donation: new ethers.Contract(addresses.Donation, abis.Donation, userSigner),
    AahaarDAO: new ethers.Contract(addresses.AahaarDAO, abis.AahaarDAO, userSigner)
  };
};
