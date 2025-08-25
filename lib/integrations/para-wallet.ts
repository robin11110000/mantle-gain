import { ethers } from 'ethers';

// Para Wallet Integration Types
export interface ParaWalletConfig {
  apiKey: string;
  environment: 'development' | 'production';
  chainId: number;
  appName?: string;
  appUrl?: string;
}

export interface ParaWalletInstance {
  address: string;
  isConnected: boolean;
  provider: ethers.JsonRpcProvider | ethers.BrowserProvider;
  signer: ethers.Signer;
  chainId: number;
}

export interface ParaWalletEvents {
  onConnect: (wallet: ParaWalletInstance) => void;
  onDisconnect: () => void;
  onChainChanged: (chainId: number) => void;
  onAccountChanged: (address: string) => void;
}

// Para Wallet SDK Mock Interface (for when actual SDK is available)
interface ParaSDK {
  ParaWallet: new (config: any) => ParaWalletProvider;
}

interface ParaWalletProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string>;
  getChainId(): Promise<number>;
  provider: any;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
}

// Singleton Para Wallet Manager
class ParaWalletManager {
  private static instance: ParaWalletManager;
  private paraWallet: ParaWalletInstance | null = null;
  private paraProvider: ParaWalletProvider | null = null;
  private eventHandlers: Partial<ParaWalletEvents> = {};

  private constructor() {}

  static getInstance(): ParaWalletManager {
    if (!ParaWalletManager.instance) {
      ParaWalletManager.instance = new ParaWalletManager();
    }
    return ParaWalletManager.instance;
  }

  /**
   * Initialize Para Embedded Wallet
   * @param config Para wallet configuration
   * @param events Event handlers for wallet events
   * @returns Para wallet instance
   */
  async initialize(config: ParaWalletConfig, events?: Partial<ParaWalletEvents>): Promise<ParaWalletInstance> {
    if (this.paraWallet?.isConnected) {
      return this.paraWallet;
    }

    this.eventHandlers = events || {};

    try {
      // Try to import Para SDK
      const ParaSDK = await this.importParaSDK();
      
      if (ParaSDK) {
        return await this.initializeParaSDK(ParaSDK, config);
      } else {
        console.warn('Para SDK not available, falling back to injected wallet');
        return await this.initializeFallbackWallet(config);
      }
    } catch (error) {
      console.error('Error initializing Para wallet:', error);
      return await this.initializeFallbackWallet(config);
    }
  }

  /**
   * Import Para SDK with fallback
   */
  private async importParaSDK(): Promise<ParaSDK | null> {
    try {
      // Attempt to dynamically import Para SDK
      // This would be the actual Para SDK import when available
      const ParaSDK = await import('@para-wallet/sdk').catch(() => null);
      return ParaSDK as ParaSDK | null;
    } catch {
      return null;
    }
  }

  /**
   * Initialize using Para SDK
   */
  private async initializeParaSDK(ParaSDK: ParaSDK, config: ParaWalletConfig): Promise<ParaWalletInstance> {
    const paraProvider = new ParaSDK.ParaWallet({
      apiKey: config.apiKey,
      environment: config.environment,
      chainId: config.chainId,
      appName: config.appName || 'Mantle-Gain',
      appUrl: config.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      theme: {
        primaryColor: '#3b82f6',
        backgroundColor: '#ffffff',
        textColor: '#1f2937'
      }
    });

    // Set up event listeners
    this.setupParaEventListeners(paraProvider);

    // Connect to Para wallet
    await paraProvider.connect();
    
    const address = await paraProvider.getAddress();
    const chainId = await paraProvider.getChainId();
    
    // Create ethers provider and signer
    const provider = new ethers.BrowserProvider(paraProvider.provider);
    const signer = provider.getSigner();

    this.paraProvider = paraProvider;
    this.paraWallet = {
      address,
      isConnected: true,
      provider,
      signer,
      chainId
    };

    // Trigger connect event
    if (this.eventHandlers.onConnect) {
      this.eventHandlers.onConnect(this.paraWallet);
    }

    return this.paraWallet;
  }

  /**
   * Initialize fallback wallet (MetaMask/injected)
   */
  private async initializeFallbackWallet(config: ParaWalletConfig): Promise<ParaWalletInstance> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No wallet provider available. Please install MetaMask or use a supported browser.');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await provider.send('eth_requestAccounts', []);
      
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      // Set up event listeners for injected wallet
      this.setupInjectedEventListeners(provider);

      this.paraWallet = {
        address,
        isConnected: true,
        provider,
        signer,
        chainId: network.chainId
      };

      // Trigger connect event
      if (this.eventHandlers.onConnect) {
        this.eventHandlers.onConnect(this.paraWallet);
      }

      return this.paraWallet;
    } catch (error) {
      console.error('Error initializing fallback wallet:', error);
      throw new Error('Failed to connect to wallet. Please check your wallet connection.');
    }
  }

  /**
   * Setup Para SDK event listeners
   */
  private setupParaEventListeners(paraProvider: ParaWalletProvider): void {
    paraProvider.on('accountChanged', (address: string) => {
      if (this.paraWallet) {
        this.paraWallet.address = address;
        if (this.eventHandlers.onAccountChanged) {
          this.eventHandlers.onAccountChanged(address);
        }
      }
    });

    paraProvider.on('chainChanged', (chainId: number) => {
      if (this.paraWallet) {
        this.paraWallet.chainId = chainId;
        if (this.eventHandlers.onChainChanged) {
          this.eventHandlers.onChainChanged(chainId);
        }
      }
    });

    paraProvider.on('disconnect', () => {
      this.paraWallet = null;
      if (this.eventHandlers.onDisconnect) {
        this.eventHandlers.onDisconnect();
      }
    });
  }

  /**
   * Setup injected wallet event listeners
   */
  private setupInjectedEventListeners(provider: ethers.BrowserProvider): void {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length === 0) {
          await this.disconnect();
        } else if (this.paraWallet && accounts[0] !== this.paraWallet.address) {
          this.paraWallet.address = accounts[0];
          if (this.eventHandlers.onAccountChanged) {
            this.eventHandlers.onAccountChanged(accounts[0]);
          }
        }
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        const numericChainId = parseInt(chainId, 16);
        if (this.paraWallet) {
          this.paraWallet.chainId = numericChainId;
          if (this.eventHandlers.onChainChanged) {
            this.eventHandlers.onChainChanged(numericChainId);
          }
        }
      });

      window.ethereum.on('disconnect', () => {
        this.disconnect();
      });
    }
  }

  /**
   * Get current wallet instance
   */
  getWallet(): ParaWalletInstance | null {
    return this.paraWallet;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.paraWallet?.isConnected || false;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.paraWallet?.address || null;
  }

  /**
   * Get current chain ID
   */
  getChainId(): number | null {
    return this.paraWallet?.chainId || null;
  }

  /**
   * Switch to a different chain
   * @param chainId Target chain ID
   */
  async switchChain(chainId: number): Promise<void> {
    if (!this.paraWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      if (this.paraProvider) {
        // Para SDK chain switching (when available)
        await this.paraProvider.provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }]
        });
      } else if (window.ethereum) {
        // Injected wallet chain switching
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }]
        });
      }
    } catch (error: any) {
      if (error.code === 4902) {
        throw new Error(`Chain ${chainId} is not added to your wallet. Please add it manually.`);
      }
      throw error;
    }
  }

  /**
   * Add a new chain to the wallet
   * @param chainConfig Chain configuration
   */
  async addChain(chainConfig: {
    chainId: number;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    blockExplorerUrls: string[];
  }): Promise<void> {
    if (!this.paraWallet) {
      throw new Error('Wallet not connected');
    }

    const params = {
      chainId: `0x${chainConfig.chainId.toString(16)}`,
      chainName: chainConfig.chainName,
      rpcUrls: chainConfig.rpcUrls,
      nativeCurrency: chainConfig.nativeCurrency,
      blockExplorerUrls: chainConfig.blockExplorerUrls
    };

    try {
      if (this.paraProvider) {
        await this.paraProvider.provider.request({
          method: 'wallet_addEthereumChain',
          params: [params]
        });
      } else if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [params]
        });
      }
    } catch (error) {
      console.error('Error adding chain:', error);
      throw error;
    }
  }

  /**
   * Sign a message with the connected wallet
   * @param message Message to sign
   * @returns Signature
   */
  async signMessage(message: string): Promise<string> {
    if (!this.paraWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.paraWallet.signer.signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  /**
   * Get native token balance
   * @returns Balance in ETH units
   */
  async getBalance(): Promise<string> {
    if (!this.paraWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.paraWallet.provider.getBalance(this.paraWallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }

  /**
   * Disconnect the wallet
   */
  async disconnect(): Promise<void> {
    try {
      if (this.paraProvider) {
        await this.paraProvider.disconnect();
        this.paraProvider = null;
      }
      
      this.paraWallet = null;
      
      if (this.eventHandlers.onDisconnect) {
        this.eventHandlers.onDisconnect();
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const paraWalletManager = ParaWalletManager.getInstance();

// Export convenience functions
export const initializeParaWallet = (config: ParaWalletConfig, events?: Partial<ParaWalletEvents>) => 
  paraWalletManager.initialize(config, events);

export const getParaWallet = () => paraWalletManager.getWallet();
export const isParaWalletConnected = () => paraWalletManager.isConnected();
export const getParaWalletAddress = () => paraWalletManager.getAddress();
export const getParaWalletChainId = () => paraWalletManager.getChainId();
export const switchParaWalletChain = (chainId: number) => paraWalletManager.switchChain(chainId);
export const addParaWalletChain = (chainConfig: any) => paraWalletManager.addChain(chainConfig);
export const signParaWalletMessage = (message: string) => paraWalletManager.signMessage(message);
export const getParaWalletBalance = () => paraWalletManager.getBalance();
export const disconnectParaWallet = () => paraWalletManager.disconnect();