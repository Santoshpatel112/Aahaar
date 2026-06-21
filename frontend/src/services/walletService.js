/**
 * AAHAAR Web3 Wallet Service
 * Provides robust provider resolution, chain switching, and network parameters setup.
 */

const LOCAL_NETWORKS = {
  "0x7a69": { // 31337 Hardhat
    chainId: "0x7a69",
    chainName: "Hardhat Localhost",
    rpcUrls: ["http://127.0.0.1:8545"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: null
  },
  "0x539": { // 1337 Ganache
    chainId: "0x539",
    chainName: "Ganache Localhost",
    rpcUrls: ["http://127.0.0.1:8545"],
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorerUrls: null
  }
};

/**
 * Resolves the active ethereum provider, handling conflicts where multiple wallets (MetaMask, Coinbase, Rabby) are installed.
 */
export const getEthereumProvider = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    return null;
  }
  
  // Handle multiple injected wallets
  if (window.ethereum.providers && window.ethereum.providers.length) {
    // Prioritize MetaMask
    const metamaskProvider = window.ethereum.providers.find(prov => prov.isMetaMask);
    if (metamaskProvider) return metamaskProvider;
    
    // Fallback to Coinbase or first provider
    const coinbaseProvider = window.ethereum.providers.find(prov => prov.isCoinbaseWallet);
    if (coinbaseProvider) return coinbaseProvider;

    return window.ethereum.providers[0];
  }

  return window.ethereum;
};

/**
 * Checks if a Web3 wallet is injected.
 */
export const isWalletInstalled = () => {
  return !!getEthereumProvider();
};

/**
 * Switches the active network in MetaMask, or adds the network if not already present.
 * Supports Hardhat (31337) and Ganache (1337) Localhost networks.
 */
export const switchOrAddLocalNetwork = async (chainIdHex) => {
  const provider = getEthereumProvider();
  if (!provider) throw new Error("No Web3 provider found");

  const networkDetails = LOCAL_NETWORKS[chainIdHex];
  if (!networkDetails) {
    throw new Error(`Unsupported network chain ID: ${chainIdHex}`);
  }

  try {
    // Try switching
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }]
    });
    console.log(`Successfully switched to network: ${networkDetails.chainName}`);
  } catch (switchError) {
    // 4902 error code indicates the chain has not been added to MetaMask
    if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain ID")) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [networkDetails]
        });
        console.log(`Successfully added and switched to local network: ${networkDetails.chainName}`);
      } catch (addError) {
        throw new Error(`Failed to add local network: ${addError.message}`, { cause: addError });
      }
    } else {
      throw switchError;
    }
  }
};
