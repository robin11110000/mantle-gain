/**
 * Integration Hub - Central export point for all integrations
 * Provides unified access to Para wallet, Orby chain abstraction, and cross-chain aggregation
 */

// Para Wallet Integration
export {
  paraWalletManager,
  initializeParaWallet,
  getParaWallet,
  isParaWalletConnected,
  getParaWalletAddress,
  getParaWalletChainId,
  switchParaWalletChain,
  addParaWalletChain,
  signParaWalletMessage,
  getParaWalletBalance,
  disconnectParaWallet,
  type ParaWalletConfig,
  type ParaWalletInstance,
  type ParaWalletEvents
} from './para-wallet';

// Orby Chain Abstraction
export {
  orbyChainManager,
  getSupportedChains,
  getChainConfig,
  initializeChain,
  getAllYieldOpportunities,
  getChainYieldOpportunities,
  getTopYieldOpportunities,
  setCurrentChain,
  getCurrentChain,
  getCurrentChainConfig,
  isChainSupported,
  getGasPrice,
  estimateGas,
  type OrbyChainConfig,
  type CrossChainYieldOpportunity,
  type DexProtocol,
  type LendingProtocol,
  type StakingProtocol,
  type FarmingProtocol,
  type CrossChainBridge
} from './orby-chain-abstraction';

// Cross-Chain Aggregator
export {
  crossChainAggregator,
  getAggregatedOpportunities,
  getOptimalAllocation,
  getMarketConditions,
  type AggregatedOpportunity,
  type ChainPresence,
  type CrossChainBenefit,
  type CrossChainRoute,
  type OptimizedAllocation,
  type AllocationTarget,
  type MarketConditions
} from './cross-chain-aggregator';

// Utility functions for integration management
export class IntegrationManager {
  private static instance: IntegrationManager;
  private initialized = false;

  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Initialize all integrations in the correct order
   */
  async initializeAll(config: {
    paraWallet: ParaWalletConfig;
    preferredChains?: number[];
  }): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing Mantle-Gain integrations...');

      // 1. Initialize Para Wallet
      console.log('Step 1: Initializing Para Wallet...');
      const wallet = await initializeParaWallet(config.paraWallet, {
        onConnect: (wallet) => console.log(`Wallet connected: ${wallet.address}`),
        onDisconnect: () => console.log('Wallet disconnected'),
        onChainChanged: (chainId) => console.log(`Chain changed to: ${chainId}`),
        onAccountChanged: (address) => console.log(`Account changed to: ${address}`)
      });

      // 2. Initialize supported chains
      console.log('Step 2: Initializing supported chains...');
      const supportedChains = getSupportedChains();
      const targetChains = config.preferredChains || supportedChains.map(c => c.chainId);

      for (const chainId of targetChains) {
        try {
          await initializeChain(chainId, wallet.provider.provider || window.ethereum);
          console.log(`✓ Chain ${chainId} initialized`);
        } catch (error) {
          console.warn(`⚠ Failed to initialize chain ${chainId}:`, error);
        }
      }

      // 3. Set current chain
      console.log('Step 3: Setting current chain...');
      setCurrentChain(wallet.chainId);

      // 4. Initialize aggregator (will cache market data)
      console.log('Step 4: Initializing cross-chain aggregator...');
      await getAggregatedOpportunities({ categories: ['farming', 'staking', 'lending'] });

      this.initialized = true;
      console.log('✅ All integrations initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing integrations:', error);
      throw error;
    }
  }

  /**
   * Check if integrations are properly initialized
   */
  isInitialized(): boolean {
    return this.initialized && isParaWalletConnected();
  }

  /**
   * Get system status
   */
  getStatus(): {
    wallet: { connected: boolean; address: string | null; chainId: number | null };
    chains: { supported: number; initialized: number };
    integrations: { para: boolean; orby: boolean; aggregator: boolean };
  } {
    const wallet = getParaWallet();
    const supportedChains = getSupportedChains();
    
    return {
      wallet: {
        connected: isParaWalletConnected(),
        address: getParaWalletAddress(),
        chainId: getParaWalletChainId()
      },
      chains: {
        supported: supportedChains.length,
        initialized: supportedChains.filter(c => orbyChainManager.getPublicClient(c.chainId)).length
      },
      integrations: {
        para: wallet !== null,
        orby: getCurrentChain() !== null,
        aggregator: getMarketConditions() !== null
      }
    };
  }

  /**
   * Reinitialize integrations (useful after wallet reconnection)
   */
  async reinitialize(config: { paraWallet: ParaWalletConfig }): Promise<void> {
    this.initialized = false;
    await this.initializeAll(config);
  }
}

// Export singleton
export const integrationManager = IntegrationManager.getInstance();

// Export types from cross-chain farming
export type {
  CrossChainYieldTransaction,
  CrossChainYieldResult,
  YieldPortfolioSummary,
  YieldPosition
} from '../blockchain/cross-chain-yield-farming';