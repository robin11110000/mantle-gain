import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, custom, http, Chain } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, mantle, mantleTestnet } from 'viem/chains';

// Orby Chain Abstraction Types
export interface OrbyChainConfig {
  chainId: number;
  name: string;
  displayName: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  logoUrl: string;
  isTestnet: boolean;
  bridgeContracts?: {
    [protocol: string]: string;
  };
  dexProtocols: DexProtocol[];
  lendingProtocols: LendingProtocol[];
  stakingProtocols: StakingProtocol[];
  farmingProtocols: FarmingProtocol[];
}

export interface DexProtocol {
  name: string;
  routerAddress: string;
  factoryAddress: string;
  feeStructure: 'uniswap' | 'curve' | 'balancer';
  supportedPairs: string[];
}

export interface LendingProtocol {
  name: string;
  comptrollerAddress: string;
  supportedAssets: LendingAsset[];
}

export interface LendingAsset {
  symbol: string;
  tokenAddress: string;
  cTokenAddress: string;
  supplyApy: number;
  borrowApy: number;
  collateralFactor: number;
}

export interface StakingProtocol {
  name: string;
  stakingAddress: string;
  rewardToken: string;
  stakingToken: string;
  apy: number;
  lockupPeriod?: number;
}

export interface FarmingProtocol {
  name: string;
  masterChefAddress: string;
  pools: FarmingPool[];
}

export interface FarmingPool {
  pid: number;
  lpToken: string;
  token0: string;
  token1: string;
  apy: number;
  tvl: string;
}

export interface CrossChainBridge {
  name: string;
  contractAddress: string;
  supportedChains: number[];
  supportedTokens: string[];
  fees: {
    [chainId: number]: string;
  };
}

// Orby Chain Configuration Registry
const ORBY_CHAINS: Record<number, OrbyChainConfig> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_ID}`,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://etherscan.io',
    logoUrl: '/blockchain-logos/ethereum.svg',
    isTestnet: false,
    dexProtocols: [
      {
        name: 'Uniswap V3',
        routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        feeStructure: 'uniswap',
        supportedPairs: ['ETH/USDC', 'ETH/USDT', 'ETH/DAI']
      }
    ],
    lendingProtocols: [
      {
        name: 'Aave V3',
        comptrollerAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        supportedAssets: []
      }
    ],
    stakingProtocols: [],
    farmingProtocols: []
  },

  // Polygon
  137: {
    chainId: 137,
    name: 'polygon',
    displayName: 'Polygon',
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorer: 'https://polygonscan.com',
    logoUrl: '/blockchain-logos/polygon.svg',
    isTestnet: false,
    dexProtocols: [
      {
        name: 'QuickSwap',
        routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
        factoryAddress: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
        feeStructure: 'uniswap',
        supportedPairs: ['MATIC/USDC', 'MATIC/ETH']
      }
    ],
    lendingProtocols: [],
    stakingProtocols: [],
    farmingProtocols: []
  },

  // Arbitrum
  42161: {
    chainId: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    rpcUrl: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://arbiscan.io',
    logoUrl: '/blockchain-logos/arbitrum.svg',
    isTestnet: false,
    dexProtocols: [],
    lendingProtocols: [],
    stakingProtocols: [],
    farmingProtocols: []
  },

  // Optimism
  10: {
    chainId: 10,
    name: 'optimism',
    displayName: 'Optimism',
    rpcUrl: process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://optimistic.etherscan.io',
    logoUrl: '/blockchain-logos/optimism.svg',
    isTestnet: false,
    dexProtocols: [],
    lendingProtocols: [],
    stakingProtocols: [],
    farmingProtocols: []
  },

  // Base
  8453: {
    chainId: 8453,
    name: 'base',
    displayName: 'Base',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://basescan.org',
    logoUrl: '/blockchain-logos/base.svg',
    isTestnet: false,
    dexProtocols: [],
    lendingProtocols: [],
    stakingProtocols: [],
    farmingProtocols: []
  },

  // Mantle Mainnet
  5000: {
    chainId: 5000,
    name: 'mantle',
    displayName: 'Mantle Network',
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://rpc.mantle.xyz',
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18
    },
    blockExplorer: 'https://explorer.mantle.xyz',
    logoUrl: '/blockchain-logos/mantle.svg',
    isTestnet: false,
    dexProtocols: [
      {
        name: 'Merchant Moe',
        routerAddress: '0x...', // Actual addresses would be here
        factoryAddress: '0x...',
        feeStructure: 'uniswap',
        supportedPairs: ['MNT/USDC', 'MNT/ETH', 'USDC/USDT']
      },
      {
        name: 'FusionX',
        routerAddress: '0x...',
        factoryAddress: '0x...',
        feeStructure: 'uniswap',
        supportedPairs: ['MNT/USDC', 'MNT/ETH']
      }
    ],
    lendingProtocols: [
      {
        name: 'Dolomite',
        comptrollerAddress: '0x...',
        supportedAssets: [
          {
            symbol: 'MNT',
            tokenAddress: '0x...',
            cTokenAddress: '0x...',
            supplyApy: 5.2,
            borrowApy: 8.5,
            collateralFactor: 0.75
          },
          {
            symbol: 'USDC',
            tokenAddress: '0x...',
            cTokenAddress: '0x...',
            supplyApy: 4.1,
            borrowApy: 6.8,
            collateralFactor: 0.85
          }
        ]
      }
    ],
    stakingProtocols: [
      {
        name: 'Mantle Staking',
        stakingAddress: '0x...',
        rewardToken: 'MNT',
        stakingToken: 'MNT',
        apy: 8.7,
        lockupPeriod: 0
      }
    ],
    farmingProtocols: [
      {
        name: 'Merchant Moe Farms',
        masterChefAddress: '0x...',
        pools: [
          {
            pid: 0,
            lpToken: '0x...',
            token0: 'MNT',
            token1: 'USDC',
            apy: 15.2,
            tvl: '$2.1M'
          }
        ]
      }
    ]
  },

  // Mantle Sepolia Testnet
  5003: {
    chainId: 5003,
    name: 'mantle-sepolia',
    displayName: 'Mantle Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.mantle.xyz',
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18
    },
    blockExplorer: 'https://explorer.sepolia.mantle.xyz',
    logoUrl: '/blockchain-logos/mantle.svg',
    isTestnet: true,
    dexProtocols: [],
    lendingProtocols: [],
    stakingProtocols: [],
    farmingProtocols: []
  }
};

// Orby Chain Abstraction Manager
class OrbyChainManager {
  private static instance: OrbyChainManager;
  private clients: Map<number, { public: any; wallet?: any }> = new Map();
  private currentChainId: number = 5003; // Default to Mantle Sepolia

  private constructor() {}

  static getInstance(): OrbyChainManager {
    if (!OrbyChainManager.instance) {
      OrbyChainManager.instance = new OrbyChainManager();
    }
    return OrbyChainManager.instance;
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): OrbyChainConfig[] {
    return Object.values(ORBY_CHAINS);
  }

  /**
   * Get chain configuration by ID
   */
  getChainConfig(chainId: number): OrbyChainConfig | null {
    return ORBY_CHAINS[chainId] || null;
  }

  /**
   * Get chain configuration by name
   */
  getChainConfigByName(name: string): OrbyChainConfig | null {
    return Object.values(ORBY_CHAINS).find(chain => chain.name === name) || null;
  }

  /**
   * Initialize clients for a specific chain
   */
  async initializeChain(chainId: number, walletProvider?: any): Promise<void> {
    const chainConfig = this.getChainConfig(chainId);
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Create public client
    const viemChain = this.getViemChain(chainId);
    const publicClient = createPublicClient({
      chain: viemChain,
      transport: http(chainConfig.rpcUrl)
    });

    const clients: { public: any; wallet?: any } = { public: publicClient };

    // Create wallet client if provider is available
    if (walletProvider) {
      const walletClient = createWalletClient({
        chain: viemChain,
        transport: custom(walletProvider)
      });
      clients.wallet = walletClient;
    }

    this.clients.set(chainId, clients);
  }

  /**
   * Get Viem chain configuration
   */
  private getViemChain(chainId: number): Chain {
    switch (chainId) {
      case 1: return mainnet;
      case 137: return polygon;
      case 42161: return arbitrum;
      case 10: return optimism;
      case 8453: return base;
      case 5000: return mantle;
      case 5003: return mantleTestnet;
      default: throw new Error(`No Viem chain configuration for chain ID: ${chainId}`);
    }
  }

  /**
   * Get public client for a chain
   */
  getPublicClient(chainId: number): any {
    return this.clients.get(chainId)?.public;
  }

  /**
   * Get wallet client for a chain
   */
  getWalletClient(chainId: number): any {
    return this.clients.get(chainId)?.wallet;
  }

  /**
   * Set current active chain
   */
  setCurrentChain(chainId: number): void {
    if (!ORBY_CHAINS[chainId]) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    this.currentChainId = chainId;
  }

  /**
   * Get current chain ID
   */
  getCurrentChain(): number {
    return this.currentChainId;
  }

  /**
   * Get current chain configuration
   */
  getCurrentChainConfig(): OrbyChainConfig {
    return ORBY_CHAINS[this.currentChainId];
  }

  /**
   * Check if a chain is supported
   */
  isChainSupported(chainId: number): boolean {
    return chainId in ORBY_CHAINS;
  }

  /**
   * Get all yield opportunities across supported chains
   */
  async getAllYieldOpportunities(): Promise<CrossChainYieldOpportunity[]> {
    const opportunities: CrossChainYieldOpportunity[] = [];

    for (const chainConfig of Object.values(ORBY_CHAINS)) {
      if (chainConfig.isTestnet && process.env.NODE_ENV === 'production') {
        continue; // Skip testnets in production
      }

      // Collect DEX farming opportunities
      for (const dex of chainConfig.dexProtocols) {
        for (const pair of dex.supportedPairs) {
          opportunities.push({
            id: `${chainConfig.name}-${dex.name}-${pair}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            chainId: chainConfig.chainId,
            chainName: chainConfig.displayName,
            protocol: dex.name,
            category: 'farming',
            pair,
            apy: Math.random() * 20 + 5, // Mock APY
            tvl: `$${(Math.random() * 10 + 1).toFixed(1)}M`,
            contractAddress: dex.routerAddress,
            riskLevel: 'medium',
            autoCompoundAvailable: true,
            minimumDeposit: '10'
          });
        }
      }

      // Collect lending opportunities
      for (const lending of chainConfig.lendingProtocols) {
        for (const asset of lending.supportedAssets) {
          opportunities.push({
            id: `${chainConfig.name}-${lending.name}-${asset.symbol}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            chainId: chainConfig.chainId,
            chainName: chainConfig.displayName,
            protocol: lending.name,
            category: 'lending',
            pair: asset.symbol,
            apy: asset.supplyApy,
            tvl: `$${(Math.random() * 50 + 10).toFixed(1)}M`,
            contractAddress: asset.cTokenAddress,
            riskLevel: 'low',
            autoCompoundAvailable: true,
            minimumDeposit: '1'
          });
        }
      }

      // Collect staking opportunities
      for (const staking of chainConfig.stakingProtocols) {
        opportunities.push({
          id: `${chainConfig.name}-${staking.name}-${staking.stakingToken}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          chainId: chainConfig.chainId,
          chainName: chainConfig.displayName,
          protocol: staking.name,
          category: 'staking',
          pair: staking.stakingToken,
          apy: staking.apy,
          tvl: `$${(Math.random() * 100 + 50).toFixed(1)}M`,
          contractAddress: staking.stakingAddress,
          riskLevel: 'low',
          autoCompoundAvailable: false,
          minimumDeposit: '0.1'
        });
      }

      // Collect farming opportunities
      for (const farming of chainConfig.farmingProtocols) {
        for (const pool of farming.pools) {
          opportunities.push({
            id: `${chainConfig.name}-${farming.name}-${pool.token0}-${pool.token1}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            chainId: chainConfig.chainId,
            chainName: chainConfig.displayName,
            protocol: farming.name,
            category: 'farming',
            pair: `${pool.token0}/${pool.token1}`,
            apy: pool.apy,
            tvl: pool.tvl,
            contractAddress: farming.masterChefAddress,
            riskLevel: 'medium',
            autoCompoundAvailable: true,
            minimumDeposit: '50'
          });
        }
      }
    }

    // Sort by APY descending
    return opportunities.sort((a, b) => b.apy - a.apy);
  }

  /**
   * Get yield opportunities for a specific chain
   */
  async getChainYieldOpportunities(chainId: number): Promise<CrossChainYieldOpportunity[]> {
    const allOpportunities = await this.getAllYieldOpportunities();
    return allOpportunities.filter(op => op.chainId === chainId);
  }

  /**
   * Get top yield opportunities across all chains
   */
  async getTopYieldOpportunities(limit: number = 10): Promise<CrossChainYieldOpportunity[]> {
    const allOpportunities = await this.getAllYieldOpportunities();
    return allOpportunities.slice(0, limit);
  }

  /**
   * Execute cross-chain transaction
   */
  async executeCrossChainTransaction(
    fromChainId: number,
    toChainId: number,
    tokenAddress: string,
    amount: string,
    recipientAddress: string
  ): Promise<{ txHash: string; bridgeId?: string }> {
    // This would implement actual cross-chain bridging logic
    // For now, return a mock response
    console.log('Executing cross-chain transaction:', {
      fromChainId,
      toChainId,
      tokenAddress,
      amount,
      recipientAddress
    });

    return {
      txHash: '0x' + Math.random().toString(16).substring(2, 66),
      bridgeId: 'bridge-' + Math.random().toString(36).substring(7)
    };
  }

  /**
   * Get gas price for a chain
   */
  async getGasPrice(chainId: number): Promise<string> {
    const publicClient = this.getPublicClient(chainId);
    if (!publicClient) {
      throw new Error(`No public client initialized for chain ${chainId}`);
    }

    try {
      const gasPrice = await publicClient.getGasPrice();
      return ethers.formatUnits(gasPrice.toString(), 'gwei');
    } catch (error) {
      console.error(`Error fetching gas price for chain ${chainId}:`, error);
      return '20'; // Default fallback
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(chainId: number, transaction: any): Promise<string> {
    const publicClient = this.getPublicClient(chainId);
    if (!publicClient) {
      throw new Error(`No public client initialized for chain ${chainId}`);
    }

    try {
      const gas = await publicClient.estimateGas(transaction);
      return gas.toString();
    } catch (error) {
      console.error(`Error estimating gas for chain ${chainId}:`, error);
      return '21000'; // Default fallback
    }
  }
}

// Export types for cross-chain yield opportunities
export interface CrossChainYieldOpportunity {
  id: string;
  chainId: number;
  chainName: string;
  protocol: string;
  category: 'lending' | 'farming' | 'staking' | 'liquidity';
  pair: string;
  apy: number;
  tvl: string;
  contractAddress: string;
  riskLevel: 'low' | 'medium' | 'high';
  autoCompoundAvailable: boolean;
  minimumDeposit: string;
}

// Export singleton instance
export const orbyChainManager = OrbyChainManager.getInstance();

// Export convenience functions
export const getSupportedChains = () => orbyChainManager.getSupportedChains();
export const getChainConfig = (chainId: number) => orbyChainManager.getChainConfig(chainId);
export const initializeChain = (chainId: number, walletProvider?: any) => orbyChainManager.initializeChain(chainId, walletProvider);
export const getAllYieldOpportunities = () => orbyChainManager.getAllYieldOpportunities();
export const getChainYieldOpportunities = (chainId: number) => orbyChainManager.getChainYieldOpportunities(chainId);
export const getTopYieldOpportunities = (limit?: number) => orbyChainManager.getTopYieldOpportunities(limit);
export const setCurrentChain = (chainId: number) => orbyChainManager.setCurrentChain(chainId);
export const getCurrentChain = () => orbyChainManager.getCurrentChain();
export const getCurrentChainConfig = () => orbyChainManager.getCurrentChainConfig();
export const isChainSupported = (chainId: number) => orbyChainManager.isChainSupported(chainId);
export const getGasPrice = (chainId: number) => orbyChainManager.getGasPrice(chainId);
export const estimateGas = (chainId: number, transaction: any) => orbyChainManager.estimateGas(chainId, transaction);