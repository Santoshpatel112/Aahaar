import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;

export const provider = new ethers.JsonRpcProvider(rpcUrl);

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
