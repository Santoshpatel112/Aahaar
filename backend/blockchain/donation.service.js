import { DonationRequestContract, DonationContract, isDeployed } from "./contracts.js";

/**
 * Fetches all active food requests directly from smart contracts.
 * @returns {Promise<Array>} List of requests.
 */
export const getActiveRequestsFromChain = async () => {
  if (!isDeployed || !DonationRequestContract) {
    return [];
  }

  try {
    const rawRequests = await DonationRequestContract.getActiveRequests();
    return rawRequests.map(r => ({
      requestId: Number(r.requestId),
      ngo: r.ngo,
      foodType: r.foodType,
      quantity: Number(r.quantity),
      city: r.city,
      createdAt: new Date(Number(r.createdAt) * 1000),
      active: r.active
    }));
  } catch (error) {
    console.error("❌ Error fetching active requests from chain:", error.message);
    return [];
  }
};

/**
 * Fetches the entire ledger of donations directly from the smart contract.
 * @returns {Promise<Array>} Complete donation list.
 */
export const getAllDonationsFromChain = async () => {
  if (!isDeployed || !DonationContract) {
    return [];
  }

  try {
    const rawDonations = await DonationContract.getAllDonations();
    return rawDonations.map(d => ({
      donationId: Number(d.donationId),
      requestId: Number(d.requestId),
      donor: d.donor,
      ngo: d.ngo,
      donationCID: d.donationCID,
      status: Number(d.status) // enum index
    }));
  } catch (error) {
    console.error("❌ Error fetching all donations from chain:", error.message);
    return [];
  }
};

/**
 * Submits a new food request to the blockchain.
 */
export const createFoodRequestOnChain = async (foodType, quantity, city, ngoWalletSigner) => {
  if (!isDeployed || !DonationRequestContract) {
    throw new Error("Blockchain contracts not deployed.");
  }

  const contract = ngoWalletSigner 
    ? DonationRequestContract.connect(ngoWalletSigner) 
    : DonationRequestContract;

  try {
    const tx = await contract.createRequest(foodType, quantity, city);
    const receipt = await tx.wait();
    console.log(`✅ On-chain food request created. TX: ${receipt.hash}`);
    return receipt;
  } catch (error) {
    console.error("❌ Failed to create food request on-chain:", error.message);
    throw error;
  }
};

/**
 * NGO verifies delivery on-chain, unlocking reputation score rewards.
 */
export const verifyDonationOnChain = async (donationId, ngoWalletSigner) => {
  if (!isDeployed || !DonationContract) {
    throw new Error("Blockchain contracts not deployed.");
  }

  const contract = ngoWalletSigner 
    ? DonationContract.connect(ngoWalletSigner) 
    : DonationContract;

  try {
    const tx = await contract.verifyDonation(donationId);
    const receipt = await tx.wait();
    console.log(`✅ Donation ${donationId} verified on-chain. TX: ${receipt.hash}`);
    return receipt;
  } catch (error) {
    console.error(`❌ Failed to verify donation ${donationId} on-chain:`, error.message);
    throw error;
  }
};
