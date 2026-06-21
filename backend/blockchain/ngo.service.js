import { NGORegistryContract, isDeployed } from "./contracts.js";

/**
 * Checks if an NGO is registered and verified on the blockchain.
 * @param {string} walletAddress - NGO wallet address.
 * @returns {Promise<boolean>} True if verified.
 */
export const isNGOVerified = async (walletAddress) => {
  if (!isDeployed || !NGORegistryContract) {
    console.warn("⚠️ Blockchain contracts not deployed. Returning cached/default true.");
    return true; // fallback
  }

  try {
    return await NGORegistryContract.isNGOVerified(walletAddress);
  } catch (error) {
    console.error(`❌ Error checking NGO verification for ${walletAddress}:`, error.message);
    return false;
  }
};

/**
 * Fetches NGO profile from blockchain registry.
 * @param {string} walletAddress - NGO wallet address.
 * @returns {Promise<object|null>} The NGO data object or null.
 */
export const getNGODetails = async (walletAddress) => {
  if (!isDeployed || !NGORegistryContract) {
    return null;
  }

  try {
    const rawNgo = await NGORegistryContract.getNGO(walletAddress);
    return {
      ngoId: Number(rawNgo.ngoId),
      wallet: rawNgo.wallet,
      ngoName: rawNgo.ngoName,
      ipfsDocumentCID: rawNgo.ipfsDocumentCID,
      verified: rawNgo.verified,
      reputation: Number(rawNgo.reputation)
    };
  } catch (error) {
    console.error(`❌ Error fetching NGO details for ${walletAddress}:`, error.message);
    return null;
  }
};

/**
 * Registers NGO on-chain using the system's administrative key.
 * Used as fallback or backend-initiated registry helper.
 */
export const registerNGOOnChain = async (ngoName, ipfsDocumentCID, ngoWalletSigner) => {
  const contract = ngoWalletSigner 
    ? NGORegistryContract.connect(ngoWalletSigner) 
    : NGORegistryContract;

  try {
    const tx = await contract.registerNGO(ngoName, ipfsDocumentCID);
    const receipt = await tx.wait();
    console.log(`✅ NGO Registered on-chain. TX: ${receipt.hash}`);
    return receipt;
  } catch (error) {
    console.error("❌ On-chain NGO registration failed:", error.message);
    throw error;
  }
};

/**
 * Verifies an NGO on-chain (Admin action).
 */
export const verifyNGOOnChain = async (ngoWalletAddress) => {
  if (!isDeployed || !NGORegistryContract) {
    throw new Error("Blockchain contracts not deployed.");
  }

  try {
    const tx = await NGORegistryContract.verifyNGO(ngoWalletAddress);
    const receipt = await tx.wait();
    console.log(`✅ NGO ${ngoWalletAddress} verified on-chain. TX: ${receipt.hash}`);
    return receipt;
  } catch (error) {
    console.error(`❌ NGO ${ngoWalletAddress} on-chain verification failed:`, error.message);
    throw error;
  }
};
