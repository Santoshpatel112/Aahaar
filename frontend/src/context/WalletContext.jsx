/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import api from "../api/axios";
import { showToast } from "../components/Toast";
import { AuthContext } from "./AuthContext";
import { getEthereumProvider, switchOrAddLocalNetwork, isWalletInstalled } from "../services/walletService";

export const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const { user, refreshUser } = useContext(AuthContext);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({});
  const [loading, setLoading] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [networkName, setNetworkName] = useState("");
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [networkError, setNetworkError] = useState(null);

  // Sync profile walletAddress on user change
  useEffect(() => {
    if (user?.walletAddress) {
      setWalletAddress(user.walletAddress.toLowerCase());
      setIsConnected(true);
    } else {
      setWalletAddress(null);
      setIsConnected(false);
    }
  }, [user]);

  // Load contracts when provider/signer change
  useEffect(() => {
    const initContracts = async () => {
      if (!signer) return;

      try {
        const detailsModule = await import("../blockchain/contract-details.json");
        const { addresses, abis } = detailsModule.default;

        const newContracts = {
          ReputationSystem: new ethers.Contract(addresses.ReputationSystem, abis.ReputationSystem, signer),
          NGORegistry: new ethers.Contract(addresses.NGORegistry, abis.NGORegistry, signer),
          DonationRequest: new ethers.Contract(addresses.DonationRequest, abis.DonationRequest, signer),
          Donation: new ethers.Contract(addresses.Donation, abis.Donation, signer),
          AahaarDAO: new ethers.Contract(addresses.AahaarDAO, abis.AahaarDAO, signer)
        };
        setContracts(newContracts);
        console.log("🦊 Web3 Contracts initialized in frontend.");
      } catch (err) {
        console.warn("⚠️ Contract details not available yet or failed to load:", err.message);
      }
    };

    initContracts();
  }, [signer]);

  const handleDisconnectState = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setWalletAddress(null);
    setIsConnected(false);
    setContracts({});
    setChainId(null);
    setNetworkName("");
    setIsCorrectNetwork(true);
    setNetworkError(null);
  }, []);

  const validateNetwork = useCallback((currentChainId) => {
    console.log("Ethereum:", getEthereumProvider());
    console.log("Chain:", currentChainId);
    console.log("Account:", walletAddress);

    if (currentChainId === 31337 || currentChainId === 1337) {
      setIsCorrectNetwork(true);
      setNetworkError(null);
      setNetworkName(currentChainId === 31337 ? "Hardhat Localhost" : "Ganache Localhost");
      return true;
    } else {
      setIsCorrectNetwork(false);
      setNetworkName("Unsupported Network");
      const errMessage = "Incorrect network. Please switch your wallet to Hardhat (31337) or Ganache (1337) Localhost.";
      setNetworkError(errMessage);
      return false;
    }
  }, [walletAddress]);

  const refreshProviderAndSigner = useCallback(async (ethereumInstance) => {
    try {
      const browserProvider = new ethers.BrowserProvider(ethereumInstance);
      const web3Signer = await browserProvider.getSigner();
      const address = await web3Signer.getAddress();
      const network = await browserProvider.getNetwork();
      const currentChainId = Number(network.chainId);

      setProvider(browserProvider);
      setSigner(web3Signer);
      setWalletAddress(address.toLowerCase());
      setIsConnected(true);
      setChainId(currentChainId);

      validateNetwork(currentChainId);
    } catch (err) {
      console.error("Error refreshing provider/signer:", err);
      handleDisconnectState();
    }
  }, [validateNetwork, handleDisconnectState]);

  // Wallet event listeners setup
  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (!ethereum) return;

    const handleAccounts = async (accounts) => {
      console.log("🦊 Accounts changed event received:", accounts);
      if (accounts.length === 0) {
        handleDisconnectState();
      } else {
        await refreshProviderAndSigner(ethereum);
      }
    };

    const handleChain = async (hexChainId) => {
      const numericChainId = Number(hexChainId);
      console.log("🦊 Chain changed event received:", numericChainId);
      await refreshProviderAndSigner(ethereum);
    };

    const handleDisconnect = () => {
      console.log("🦊 MetaMask disconnected event received");
      handleDisconnectState();
    };

    ethereum.on("accountsChanged", handleAccounts);
    ethereum.on("chainChanged", handleChain);
    ethereum.on("disconnect", handleDisconnect);

    // Initial check if already connected in browser
    ethereum.request({ method: "eth_accounts" })
      .then(async (accounts) => {
        if (accounts && accounts.length > 0) {
          await refreshProviderAndSigner(ethereum);
        }
      })
      .catch((err) => console.warn("Failed to check active accounts:", err.message));

    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener("accountsChanged", handleAccounts);
        ethereum.removeListener("chainChanged", handleChain);
        ethereum.removeListener("disconnect", handleDisconnect);
      }
    };
  }, [refreshProviderAndSigner, handleDisconnectState]);

  const switchNetwork = async (networkType = "hardhat") => {
    const hexChainId = networkType === "ganache" ? "0x539" : "0x7a69";
    setLoading(true);
    try {
      await switchOrAddLocalNetwork(hexChainId);
      const ethereum = getEthereumProvider();
      if (ethereum) {
        await refreshProviderAndSigner(ethereum);
      }
    } catch (err) {
      console.error("Failed to switch network:", err);
      showToast(err.message || "Failed to switch network", "error");
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    const ethereum = getEthereumProvider();
    if (!ethereum) {
      showToast("MetaMask or compatible Web3 wallet not found. Please install an extension.", "error");
      return;
    }

    setLoading(true);
    try {
      // Prompt user to unlock wallet and request accounts
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from wallet connection request.");
      }

      await refreshProviderAndSigner(ethereum);

      const web3Provider = new ethers.BrowserProvider(ethereum);
      const web3Signer = await web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      const network = await web3Provider.getNetwork();
      const currentChainId = Number(network.chainId);

      // Trigger automatic switch if network mismatch
      if (currentChainId !== 31337 && currentChainId !== 1337) {
        showToast("Incorrect network detected. Attempting switch to Localhost... 🔄", "warning");
        try {
          await switchOrAddLocalNetwork("0x7a69"); // Auto Hardhat Localhost
          await refreshProviderAndSigner(ethereum);
        } catch (switchErr) {
          console.warn("Auto switch failed, user must switch manually:", switchErr.message);
        }
      }

      // Perform cryptographic linking if user is authenticated and backend link is missing
      if (user?._id && (!user.walletAddress || user.walletAddress.toLowerCase() !== address.toLowerCase())) {
        await linkWalletToProfile(address, web3Signer);
      } else {
        showToast("Wallet connected successfully! 🦊", "success");
      }
    } catch (err) {
      console.error("❌ Failed to connect wallet:", err);
      if (err.code === 4001) {
        showToast("Connection request rejected by user.", "error");
      } else if (err.code === -32002) {
        showToast("Request already pending. Please open MetaMask to approve.", "warning");
      } else {
        showToast(err.message || "Failed to connect wallet", "error");
      }
      handleDisconnectState();
    } finally {
      setLoading(false);
    }
  };

  const linkWalletToProfile = async (address, activeSigner) => {
    if (!user?._id) return;
    try {
      const message = `Sign this message to link your wallet to AAHAAR: ${user._id}`;
      const signature = await activeSigner.signMessage(message);

      const res = await api.put("/aahar/users/link-wallet", {
        walletAddress: address,
        signature
      });

      if (res.data?.walletAddress) {
        showToast("Wallet linked to profile successfully! 🔒", "success");
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      console.error("❌ Link wallet signature error:", err);
      showToast("Link signature rejected. Wallet connected but profile unlinked.", "warning");
    }
  };

  const disconnectWallet = () => {
    handleDisconnectState();
    showToast("Wallet disconnected.", "info");
  };

  return (
    <WalletContext.Provider value={{
      walletAddress,
      account: walletAddress, // Compatibility alias
      isConnected,
      provider,
      signer,
      contracts,
      loading,
      chainId,
      networkName,
      isCorrectNetwork,
      networkError,
      connectWallet,
      disconnectWallet,
      switchNetwork,
      isWalletInstalled: isWalletInstalled()
    }}>
      {children}
    </WalletContext.Provider>
  );
};
