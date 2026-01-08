/**
 * Wallet detection utilities for injected wallets like Rabby and Trust Wallet
 */

// Type for Ethereum provider - using Record to handle dynamic wallet properties
type EthereumProvider = Record<string, unknown> & {
  isRabby?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  providerName?: string;
  switchChain?: (chainId: string) => Promise<void>;
};

type WalletProviders = {
  rabby?: EthereumProvider;
  trustWallet?: EthereumProvider;
  metaMask?: EthereumProvider;
  ethereum?: EthereumProvider;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    rabby?: EthereumProvider;
    trustwallet?: EthereumProvider;
  }
}

export function detectInjectedWallets(): WalletProviders {
  if (typeof window === "undefined") {
    return {};
  }

  const result: WalletProviders = {};

  const { ethereum } = window;

  if (!ethereum) {
    return result;
  }

  // Check if it's a provider array (multiple wallets installed)
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    // Find Rabby
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rabbyProvider = ethereum.providers.find((p: any) => p.isRabby);
    if (rabbyProvider) {
      result.rabby = rabbyProvider as EthereumProvider;
    }

    // Find Trust Wallet
    const trustProvider = ethereum.providers.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.isTrust || p.isTrustWallet
    );
    if (trustProvider) {
      result.trustWallet = trustProvider as EthereumProvider;
    }

    // Find MetaMask
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaMaskProvider = ethereum.providers.find((p: any) => p.isMetaMask);
    if (metaMaskProvider) {
      result.metaMask = metaMaskProvider as EthereumProvider;
    }
  } else {
    // Single provider case
    if (ethereum.isRabby) {
      result.rabby = ethereum;
    }
    if (ethereum.isTrust || ethereum.isTrustWallet) {
      result.trustWallet = ethereum;
    }
    if (ethereum.isMetaMask) {
      result.metaMask = ethereum;
    }
  }

  // Always include ethereum if it exists
  result.ethereum = ethereum;

  return result;
}

export function getPrimaryWalletProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const wallets = detectInjectedWallets();

  // Priority: Rabby > Trust Wallet > MetaMask > generic ethereum
  return wallets.rabby || wallets.trustWallet || wallets.metaMask || wallets.ethereum;
}

/**
 * Ensure wallet providers are properly exposed on window.ethereum
 * This helps with wallet detection in wagmi/OnchainKit
 */
export function ensureWalletProviders(): void {
  if (typeof window === "undefined") {
    return;
  }

  const { ethereum } = window;

  if (!ethereum) {
    return;
  }

  // If ethereum is an array or has providers, ensure it's accessible
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    // Ensure providers array is accessible
    if (!window.ethereum?.providers) {
      window.ethereum = {
        ...ethereum,
        providers: ethereum.providers,
      } as EthereumProvider;
    }
    
    // Make sure Rabby provider is easily accessible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rabbyProvider = ethereum.providers.find((p: any) => p.isRabby);
    if (rabbyProvider) {
      // Also set it directly on window for easier access
      window.rabby = rabbyProvider as EthereumProvider;
      // Ensure it's flagged correctly
      if (!rabbyProvider.isRabby) {
        rabbyProvider.isRabby = true;
      }
      // Make sure the provider name is set for wagmi detection
      if (!rabbyProvider.providerName) {
        rabbyProvider.providerName = "rabby";
      }
    }
    
    // Make sure Trust Wallet provider is easily accessible
    const trustProvider = ethereum.providers.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.isTrust || p.isTrustWallet
    );
    if (trustProvider) {
      window.trustwallet = trustProvider as EthereumProvider;
      if (!trustProvider.isTrust && !trustProvider.isTrustWallet) {
        trustProvider.isTrust = true;
        trustProvider.isTrustWallet = true;
      }
      if (!trustProvider.providerName) {
        trustProvider.providerName = "trustWallet";
      }
    }
  }

  // Ensure individual wallet flags are set on the main ethereum object
  const wallets = detectInjectedWallets();
  if (wallets.rabby) {
    if (!ethereum.isRabby) {
      ethereum.isRabby = true;
    }
    // Also expose Rabby-specific methods if available
    if (wallets.rabby.switchChain) {
      ethereum.switchChain = wallets.rabby.switchChain.bind(wallets.rabby);
    }
  }
  if (wallets.trustWallet) {
    if (!ethereum.isTrust && !ethereum.isTrustWallet) {
      ethereum.isTrust = true;
      ethereum.isTrustWallet = true;
    }
  }
  
  // Set provider name for wagmi detection
  if (wallets.rabby && !ethereum.providerName) {
    ethereum.providerName = "rabby";
  } else if (wallets.trustWallet && !ethereum.providerName) {
    ethereum.providerName = "trustWallet";
  } else if (wallets.metaMask && !ethereum.providerName) {
    ethereum.providerName = "metaMask";
  }
}

