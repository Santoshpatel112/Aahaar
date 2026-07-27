import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || "https://polygon-amoy.drpc.org";
const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;

// Pass static network to prevent ethers from running an infinite 1s detectNetwork retry loop when offline
const network = new ethers.Network("polygon-amoy", 80002);
export const provider = new ethers.JsonRpcProvider(rpcUrl, network, { staticNetwork: network });

let tempSigner;
if (privateKey) {
  try {
    tempSigner = new ethers.Wallet(privateKey, provider);
    console.log("🔒 Backend blockchain wallet initialized. Address:", tempSigner.address);
  } catch (error) {
    console.error("❌ Error parsing BACKEND_WALLET_PRIVATE_KEY:", error.message);
    tempSigner = ethers.Wallet.createRandom().connect(provider);
    console.log("⚠️ Initialized a temporary random wallet address:", tempSigner.address);
  }
} else {
  tempSigner = ethers.Wallet.createRandom().connect(provider);
  console.log("⚠️ No BACKEND_WALLET_PRIVATE_KEY found. Initialized temporary random wallet address:", tempSigner.address);
}

export const signer = tempSigner;
