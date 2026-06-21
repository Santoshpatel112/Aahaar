import { AahaarDAOContract, isDeployed } from "./contracts.js";

/**
 * Fetches all proposals from the DAO governance contract.
 * @returns {Promise<Array>} List of proposals.
 */
export const getAllProposalsFromChain = async () => {
  if (!isDeployed || !AahaarDAOContract) {
    return [];
  }

  try {
    const rawProposals = await AahaarDAOContract.getAllProposals();
    return rawProposals.map(p => ({
      id: Number(p.id),
      targetNGO: p.targetNGO,
      proposalType: Number(p.proposalType), // 0: Onboard, 1: Remove
      description: p.description,
      votesFor: Number(p.votesFor),
      votesAgainst: Number(p.votesAgainst),
      deadline: new Date(Number(p.deadline) * 1000),
      executed: p.executed,
      state: Number(p.state) // enum index
    }));
  } catch (error) {
    console.error("❌ Error fetching all proposals from chain:", error.message);
    return [];
  }
};

/**
 * Creates a new DAO onboarding or removal proposal.
 */
export const createProposalOnChain = async (targetNGO, proposalType, description, creatorWalletSigner) => {
  if (!isDeployed || !AahaarDAOContract) {
    throw new Error("Blockchain contracts not deployed.");
  }

  const contract = creatorWalletSigner 
    ? AahaarDAOContract.connect(creatorWalletSigner) 
    : AahaarDAOContract;

  try {
    const tx = await contract.createProposal(targetNGO, proposalType, description);
    const receipt = await tx.wait();
    console.log(`✅ On-chain DAO proposal created. TX: ${receipt.hash}`);
    return receipt;
  } catch (error) {
    console.error("❌ Failed to create proposal on-chain:", error.message);
    throw error;
  }
};

/**
 * Casts a vote on a proposal.
 */
export const voteOnProposalOnChain = async (proposalId, support, voterWalletSigner) => {
  if (!isDeployed || !AahaarDAOContract) {
    throw new Error("Blockchain contracts not deployed.");
  }

  const contract = voterWalletSigner 
    ? AahaarDAOContract.connect(voterWalletSigner) 
    : AahaarDAOContract;

  try {
    const tx = await contract.vote(proposalId, support);
    const receipt = await tx.wait();
    console.log(`✅ Vote casted on proposal ${proposalId}. TX: ${receipt.hash}`);
    return receipt;
  } catch (error) {
    console.error(`❌ Failed to cast vote on proposal ${proposalId}:`, error.message);
    throw error;
  }
};

/**
 * Executes a proposal that has concluded.
 */
export const executeProposalOnChain = async (proposalId, executorWalletSigner) => {
  if (!isDeployed || !AahaarDAOContract) {
    throw new Error("Blockchain contracts not deployed.");
  }

  const contract = executorWalletSigner 
    ? AahaarDAOContract.connect(executorWalletSigner) 
    : AahaarDAOContract;

  try {
    const tx = await contract.executeProposal(proposalId);
    const receipt = await tx.wait();
    console.log(`✅ Proposal ${proposalId} executed on-chain. TX: ${receipt.hash}`);
    return receipt;
  } catch (error) {
    console.error(`❌ Failed to execute proposal ${proposalId}:`, error.message);
    throw error;
  }
};
