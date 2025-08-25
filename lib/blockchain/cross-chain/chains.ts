import { 
  OrbyChainConfig, 
  orbyChainManager,
  getSupportedChains,
  getChainConfig,
  initializeChain,
  getAllYieldOpportunities,
  getChainYieldOpportunities,
  type CrossChainYieldOpportunity,
  type DexProtocol,
  type LendingProtocol,
  type StakingProtocol,
  type FarmingProtocol
} from '../../integrations/orby-chain-abstraction';
import { Chain } from './types';

// Enhanced Chain interface with Orby integration
export interface OrbyEnhancedChain extends Omit<Chain, 'id' | 'nativeCurrency'> {
  chainId: number;
  id: string;
  name: string;
  displayName: string;
  rpcUrl: string;
  explorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  logo: string;
  isTestnet: boolean;
  
  // Orby-specific enhancements
  yieldProtocols: {
    dex: DexProtocol[];
    lending: LendingProtocol[];
    staking: StakingProtocol[];
    farming: FarmingProtocol[];
  };
  
  // Bridge configurations
  bridges: CrossChainBridge[];
  
  // Real-time metrics
  metrics: {
    avgGasPrice: string;
    blockTime: number;
    tps: number;
    tvl: string;
    activeProtocols: number;
  };
  
  // Yield farming specific data
  yieldStats: {
    totalOpportunities: number;
    highestApy: number;
    totalTvl: string;
    categories: string[];
    riskDistribution: { low: number; medium: number; high: number };
  };
}

export interface CrossChainBridge {
  name: string;
  protocol: 'layerzero' | 'axelar' | 'wormhole' | 'stargate' | 'anyswap' | 'celer';
  contractAddress: string;
  supportedTokens: string[];
  estimatedTime: string;
  fees: {
    fixed: string;
    percentage: number;
  };
  maxAmount: string;
  minAmount: string;
  isActive: boolean;
}

/**
 * Orby-Enhanced Chain Manager
 * Provides seamless multi-chain yield farming through unified interface
 */
class OrbyEnhancedChainManager {
  private static instance: OrbyEnhancedChainManager;
  private enhancedChains: Map<number, OrbyEnhancedChain> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): OrbyEnhancedChainManager {
    if (!OrbyEnhancedChainManager.instance) {
      OrbyEnhancedChainManager.instance = new OrbyEnhancedChainManager();
    }
    return OrbyEnhancedChainManager.instance;
  }

  /**
   * Initialize enhanced chains with Orby abstraction
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing Orby-enhanced chains...');

      // Get base configurations from Orby
      const orbyChains = getSupportedChains();
      
      // Enhance each chain with additional capabilities
      for (const orbyChain of orbyChains) {
        const enhancedChain = await this.enhanceChain(orbyChain);
        this.enhancedChains.set(orbyChain.chainId, enhancedChain);
      }

      // Initialize chain clients through Orby
      for (const [chainId] of this.enhancedChains) {
        try {
          await initializeChain(chainId);
          console.log(`✓ Enhanced chain ${chainId} initialized`);
        } catch (error) {
          console.warn(`⚠ Failed to initialize chain ${chainId}:`, error);
        }
      }

      this.initialized = true;
      console.log('✅ Orby-enhanced chains initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing enhanced chains:', error);
      throw error;
    }
  }

  /**
   * Enhance Orby chain with additional yield farming capabilities
   */
  private async enhanceChain(orbyChain: OrbyChainConfig): Promise<OrbyEnhancedChain> {
    // Get yield opportunities for this chain
    const chainOpportunities = await getChainYieldOpportunities(orbyChain.chainId).catch(() => []);

    // Calculate yield stats
    const yieldStats = this.calculateYieldStats(chainOpportunities);

    // Get real-time metrics
    const metrics = await this.fetchChainMetrics(orbyChain.chainId);

    // Configure bridges
    const bridges = this.configureBridges(orbyChain.chainId);

    return {
      chainId: orbyChain.chainId,
      id: orbyChain.name,
      name: orbyChain.name,
      displayName: orbyChain.displayName,
      rpcUrl: orbyChain.rpcUrl,
      explorer: orbyChain.blockExplorer,
      nativeCurrency: orbyChain.nativeCurrency,
      logo: orbyChain.logoUrl,
      isTestnet: orbyChain.isTestnet,
      
      yieldProtocols: {
        dex: orbyChain.dexProtocols,
        lending: orbyChain.lendingProtocols,
        staking: orbyChain.stakingProtocols,
        farming: orbyChain.farmingProtocols
      },
      
      bridges,
      metrics,
      yieldStats
    };
  }

  /**
   * Calculate yield statistics for a chain
   */
  private calculateYieldStats(opportunities: CrossChainYieldOpportunity[]): OrbyEnhancedChain['yieldStats'] {
    if (opportunities.length === 0) {
      return {
        totalOpportunities: 0,
        highestApy: 0,
        totalTvl: '$0',
        categories: [],
        riskDistribution: { low: 0, medium: 0, high: 0 }
      };
    }

    const highestApy = Math.max(...opportunities.map(op => op.apy));
    const categories = [...new Set(opportunities.map(op => op.category))];
    
    // Calculate risk distribution
    const riskCounts = opportunities.reduce((acc, op) => {
      acc[op.riskLevel]++;
      return acc;
    }, { low: 0, medium: 0, high: 0 });

    const total = opportunities.length;
    const riskDistribution = {
      low: Math.round((riskCounts.low / total) * 100),
      medium: Math.round((riskCounts.medium / total) * 100),
      high: Math.round((riskCounts.high / total) * 100)
    };

    // Calculate total TVL (simplified)
    const totalTvlValue = opportunities.reduce((sum, op) => {
      const tvlMatch = op.tvl.match(/\$([0-9.]+)([KMB]?)/);
      if (!tvlMatch) return sum;
      
      let value = parseFloat(tvlMatch[1]);
      const unit = tvlMatch[2];
      
      if (unit === 'K') value *= 1000;
      else if (unit === 'M') value *= 1000000;
      else if (unit === 'B') value *= 1000000000;
      
      return sum + value;
    }, 0);

    const formatTvl = (value: number): string => {
      if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    };

    return {
      totalOpportunities: opportunities.length,
      highestApy,
      totalTvl: formatTvl(totalTvlValue),
      categories,
      riskDistribution
    };
  }

  /**
   * Fetch real-time chain metrics
   */
  private async fetchChainMetrics(chainId: number): Promise<OrbyEnhancedChain['metrics']> {
    try {
      const gasPrice = await orbyChainManager.getGasPrice(chainId).catch(() => '20');
      
      // Mock additional metrics - in production these would be fetched from chain APIs
      const mockMetrics = {
        1: { blockTime: 12, tps: 15, tvl: '$45.2B', activeProtocols: 127 },
        137: { blockTime: 2, tps: 65, tvl: '$5.8B', activeProtocols: 89 },
        42161: { blockTime: 0.25, tps: 4000, tvl: '$12.3B', activeProtocols: 45 },
        10: { blockTime: 2, tps: 70, tvl: '$8.1B', activeProtocols: 67 },
        8453: { blockTime: 2, tps: 100, tvl: '$2.4B', activeProtocols: 34 },
        5000: { blockTime: 1, tps: 200, tvl: '$150M', activeProtocols: 12 },
        5003: { blockTime: 1, tps: 200, tvl: '$5M', activeProtocols: 8 }
      };

      const chainMetrics = mockMetrics[chainId as keyof typeof mockMetrics] || {
        blockTime: 2,
        tps: 50,
        tvl: '$100M',
        activeProtocols: 10
      };

      return {
        avgGasPrice: `${gasPrice} gwei`,
        ...chainMetrics
      };
    } catch (error) {
      console.error(`Error fetching metrics for chain ${chainId}:`, error);
      return {
        avgGasPrice: '20 gwei',
        blockTime: 2,
        tps: 50,
        tvl: '$100M',
        activeProtocols: 10
      };
    }
  }

  /**
   * Configure cross-chain bridges for a chain
   */
  private configureBridges(chainId: number): CrossChainBridge[] {
    const bridges: CrossChainBridge[] = [];

    // LayerZero bridges (most chains)
    if ([1, 137, 42161, 10, 8453, 5000].includes(chainId)) {
      bridges.push({
        name: 'LayerZero',
        protocol: 'layerzero',
        contractAddress: this.getLayerZeroAddress(chainId),
        supportedTokens: ['ETH', 'USDC', 'USDT', 'DAI'],
        estimatedTime: '2-5 minutes',
        fees: { fixed: '0.001 ETH', percentage: 0.1 },
        maxAmount: '1000000',
        minAmount: '10',
        isActive: true
      });
    }

    // Stargate (Ethereum, Polygon, Arbitrum, Optimism)
    if ([1, 137, 42161, 10].includes(chainId)) {
      bridges.push({
        name: 'Stargate',
        protocol: 'stargate',
        contractAddress: this.getStargateAddress(chainId),
        supportedTokens: ['USDC', 'USDT', 'ETH'],
        estimatedTime: '1-3 minutes',
        fees: { fixed: '0.0005 ETH', percentage: 0.06 },
        maxAmount: '500000',
        minAmount: '5',
        isActive: true
      });
    }

    // Axelar (Most major chains)
    if ([1, 137, 42161, 10, 8453].includes(chainId)) {
      bridges.push({
        name: 'Axelar',
        protocol: 'axelar',
        contractAddress: this.getAxelarAddress(chainId),
        supportedTokens: ['ETH', 'USDC', 'USDT', 'WBTC'],
        estimatedTime: '3-10 minutes',
        fees: { fixed: '0.002 ETH', percentage: 0.1 },
        maxAmount: '2000000',
        minAmount: '20',
        isActive: true
      });
    }

    // Mantle-specific bridges
    if (chainId === 5000 || chainId === 5003) {
      bridges.push({
        name: 'Mantle Bridge',
        protocol: 'layerzero',
        contractAddress: '0x...', // Actual Mantle bridge address
        supportedTokens: ['MNT', 'ETH', 'USDC', 'USDT'],
        estimatedTime: '5-15 minutes',
        fees: { fixed: '0.0001 MNT', percentage: 0.05 },
        maxAmount: '1000000',
        minAmount: '1',
        isActive: true
      });
    }

    return bridges;
  }

  /**
   * Helper functions to get bridge addresses
   */
  private getLayerZeroAddress(chainId: number): string {
    const addresses: Record<number, string> = {
      1: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
      137: '0x3c2269811836af69497E5F486A85D7316753cf62',
      42161: '0x3c2269811836af69497E5F486A85D7316753cf62',
      10: '0x3c2269811836af69497E5F486A85D7316753cf62',
      8453: '0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7',
      5000: '0x...', // Mantle LayerZero address
    };
    return addresses[chainId] || '0x...';
  }

  private getStargateAddress(chainId: number): string {
    const addresses: Record<number, string> = {
      1: '0x8731d54E9D02c286767d56ac03e8037C07e01e98',
      137: '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd',
      42161: '0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614',
      10: '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b',
    };
    return addresses[chainId] || '0x...';
  }

  private getAxelarAddress(chainId: number): string {
    const addresses: Record<number, string> = {
      1: '0x4F4495243837681061C4743b74B3eEdf548D56A5',
      137: '0x6f015F16De9fC8791b234eF68D486d2bF203FBA8',
      42161: '0xe432150cce91c13a887f7D836923d5597adD8E31',
      10: '0xe432150cce91c13a887f7D836923d5597adD8E31',
      8453: '0xe432150cce91c13a887f7D836923d5597adD8E31',
    };
    return addresses[chainId] || '0x...';
  }

  /**
   * Get all enhanced chains
   */
  getEnhancedChains(): OrbyEnhancedChain[] {
    return Array.from(this.enhancedChains.values());
  }

  /**
   * Get enhanced chain by ID
   */
  getEnhancedChain(chainId: number): OrbyEnhancedChain | undefined {
    return this.enhancedChains.get(chainId);
  }

  /**
   * Get chains by yield farming criteria
   */
  getChainsByYieldCriteria(criteria: {
    minApy?: number;
    maxRisk?: 'low' | 'medium' | 'high';
    categories?: string[];
    minTvl?: number;
  }): OrbyEnhancedChain[] {
    const chains = this.getEnhancedChains();
    
    return chains.filter(chain => {
      if (criteria.minApy && chain.yieldStats.highestApy < criteria.minApy) {
        return false;
      }

      if (criteria.categories && !criteria.categories.some(cat => 
        chain.yieldStats.categories.includes(cat)
      )) {
        return false;
      }

      // Add more filtering logic as needed
      return true;
    });
  }

  /**
   * Get optimal chain for a specific operation
   */
  getOptimalChain(operation: {
    type: 'farming' | 'staking' | 'lending' | 'bridge';
    amount: string;
    token: string;
    targetApy?: number;
  }): OrbyEnhancedChain | null {
    const chains = this.getEnhancedChains();
    
    // Score chains based on operation requirements
    const scoredChains = chains.map(chain => {
      let score = 0;

      // Gas cost efficiency (lower is better)
      const gasCost = parseFloat(chain.metrics.avgGasPrice.split(' ')[0]);
      score += Math.max(0, 100 - gasCost);

      // APY potential
      score += chain.yieldStats.highestApy * 2;

      // TVL (liquidity depth)
      const tvlValue = this.parseTvl(chain.metrics.tvl);
      score += Math.log10(tvlValue + 1) * 10;

      // Active protocols (ecosystem maturity)
      score += chain.metrics.activeProtocols * 0.5;

      return { chain, score };
    });

    // Return highest scoring chain
    const best = scoredChains.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return best.chain;
  }

  /**
   * Parse TVL string to numeric value
   */
  private parseTvl(tvl: string): number {
    const match = tvl.match(/\$([0-9.]+)([KMB]?)/);
    if (!match) return 0;
    
    let value = parseFloat(match[1]);
    const unit = match[2];
    
    if (unit === 'K') value *= 1000;
    else if (unit === 'M') value *= 1000000;
    else if (unit === 'B') value *= 1000000000;
    
    return value;
  }

  /**
   * Update chain metrics (to be called periodically)
   */
  async updateChainMetrics(chainId?: number): Promise<void> {
    const chainsToUpdate = chainId ? [chainId] : Array.from(this.enhancedChains.keys());

    for (const id of chainsToUpdate) {
      const chain = this.enhancedChains.get(id);
      if (chain) {
        try {
          const updatedMetrics = await this.fetchChainMetrics(id);
          chain.metrics = updatedMetrics;
          
          // Update yield stats
          const opportunities = await getChainYieldOpportunities(id).catch(() => []);
          chain.yieldStats = this.calculateYieldStats(opportunities);
        } catch (error) {
          console.error(`Error updating metrics for chain ${id}:`, error);
        }
      }
    }
  }
}

// Export singleton instance
export const orbyEnhancedChainManager = OrbyEnhancedChainManager.getInstance();

// Legacy compatibility exports
export const supportedChains: Chain[] = [];

// Enhanced exports using Orby abstraction
export const getEnhancedChains = () => orbyEnhancedChainManager.getEnhancedChains();
export const getEnhancedChain = (chainId: number) => orbyEnhancedChainManager.getEnhancedChain(chainId);
export const initializeEnhancedChains = () => orbyEnhancedChainManager.initialize();

// Updated helper functions with Orby integration
export function getChainById(chainId: string | number): OrbyEnhancedChain | undefined {
  const numericId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
  return orbyEnhancedChainManager.getEnhancedChain(numericId);
}

export function getChainByName(chainName: string): OrbyEnhancedChain | undefined {
  const chains = orbyEnhancedChainManager.getEnhancedChains();
  return chains.find(chain => 
    chain.name.toLowerCase() === chainName.toLowerCase() ||
    chain.displayName.toLowerCase() === chainName.toLowerCase()
  );
}

export function isChainSupported(chainId: string | number): boolean {
  const numericId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
  return orbyEnhancedChainManager.getEnhancedChain(numericId) !== undefined;
}

export function getEthereumCompatibleChains(): OrbyEnhancedChain[] {
  const chains = orbyEnhancedChainManager.getEnhancedChains();
  return chains.filter(chain => !chain.isTestnet && chain.chainId !== 5000); // Exclude Mantle for now
}

export function getMantleChains(): OrbyEnhancedChain[] {
  const chains = orbyEnhancedChainManager.getEnhancedChains();
  return chains.filter(chain => [5000, 5003].includes(chain.chainId));
}

export function getTestnetChains(): OrbyEnhancedChain[] {
  const chains = orbyEnhancedChainManager.getEnhancedChains();
  return chains.filter(chain => chain.isTestnet);
}

export function getMainnetChains(): OrbyEnhancedChain[] {
  const chains = orbyEnhancedChainManager.getEnhancedChains();
  return chains.filter(chain => !chain.isTestnet);
}

// Yield farming specific functions
export function getChainsByYieldCriteria(criteria: {
  minApy?: number;
  maxRisk?: 'low' | 'medium' | 'high';
  categories?: string[];
  minTvl?: number;
}): OrbyEnhancedChain[] {
  return orbyEnhancedChainManager.getChainsByYieldCriteria(criteria);
}

export function getOptimalChainForYield(operation: {
  type: 'farming' | 'staking' | 'lending' | 'bridge';
  amount: string;
  token: string;
  targetApy?: number;
}): OrbyEnhancedChain | null {
  return orbyEnhancedChainManager.getOptimalChain(operation);
}

// Real-time data functions
export function updateChainMetrics(chainId?: number): Promise<void> {
  return orbyEnhancedChainManager.updateChainMetrics(chainId);
}

// Chain icons mapping with enhanced chains
export const chainIcons: Record<string, string> = {
  ethereum: '/blockchain-logos/ethereum.svg',
  arbitrum: '/blockchain-logos/arbitrum.svg',
  polygon: '/blockchain-logos/polygon.svg',
  optimism: '/blockchain-logos/optimism.svg',
  base: '/blockchain-logos/base.svg',
  mantle: '/blockchain-logos/mantle.svg',
  avalanche: '/blockchain-logos/avalanche.svg'
};

// Cross-chain bridge utilities
export function getBestBridge(
  fromChainId: number, 
  toChainId: number, 
  token: string, 
  amount: string
): CrossChainBridge | null {
  const fromChain = getEnhancedChain(fromChainId);
  const toChain = getEnhancedChain(toChainId);
  
  if (!fromChain || !toChain) return null;

  // Find common bridges between chains
  const commonBridges = fromChain.bridges.filter(bridge => 
    bridge.supportedTokens.includes(token) &&
    bridge.isActive &&
    parseFloat(amount) >= parseFloat(bridge.minAmount) &&
    parseFloat(amount) <= parseFloat(bridge.maxAmount)
  );

  if (commonBridges.length === 0) return null;

  // Score bridges by fees and time
  const scoredBridges = commonBridges.map(bridge => {
    const timeScore = bridge.estimatedTime.includes('minute') ? 
      100 - parseInt(bridge.estimatedTime.split('-')[0]) * 5 : 50;
    const feeScore = 100 - bridge.fees.percentage * 10;
    
    return { bridge, score: timeScore + feeScore };
  });

  return scoredBridges.reduce((best, current) => 
    current.score > best.score ? current : best
  ).bridge;
}