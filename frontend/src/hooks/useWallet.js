import { useContext } from "react";
import { WalletContext } from "../context/WalletContext";

/**
 * Custom hook to consume the global Web3 wallet context.
 */
export default function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
