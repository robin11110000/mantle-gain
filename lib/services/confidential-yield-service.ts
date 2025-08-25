import { 
  marlinOysterManager, 
  calculateConfidentialYields,
  decryptConfidentialResults,
  type ConfidentialYieldResult,
  type ChainDataInput,
  type ProtocolDataPoint
} from '../integrations/marlin-oyster';
import { 
  getAllYieldOpportunities,
  getChainYieldOpportunities,
  type CrossChainYieldOpportunity 
} from '../integrations/orby-chain-abstraction';
import { 
  getParaWallet,
  isParaWalletConnected 
} from '../integrations/para-wallet';

// Confidential Yield Service Types
export interface ConfidentialYieldAnalysis {
  requestId: string;
  inputPrivacyLevel: 'standard' | 'enhanced' | 'maximum';
  computationTime: number;
  
  // Public metrics (safe to display)
  publicMetrics: {
    totalOpportunities: number;
    averageApy: number;
    riskScore: number;
    confidenceScore: number;
    chainsAnalyzed: number;
  };
  
  // Encrypted detailed results
  confidentialResults: ConfidentialYieldResult;
  
  // Status and verification
  status: 'processing' | 'completed' | 'failed' | 'expired';
  attestationVerified: boolean;
  computeProofValid: boolean;
}

export interface YieldStrategy {
  id: string;
  name: string;
  description: string;
  targetApy: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  
  // Encrypted strategy parameters
  encryptedParams: string;
  
  // Public strategy info
  publicInfo: {
    chainPreferences: number[];
    categoryFocus: string[];
    maxPositions: number;
    rebalanceFrequency: string;
  };
}

export interface PrivatePortfolioSnapshot {
  timestamp: number;
  addressHash: string; // Hashed wallet address
  
  // Encrypted position data
  encryptedPositions: string;
  encryptedBalances: string;
  encryptedTransactionHistory: string;
  
  // Public aggregated metrics
  publicMetrics: {
    totalValueUsd: number;
    positionCount: number;
    chainDistribution: { [chainId: number]: number };
    riskDistribution: { low: number; medium: number; high: number };
  };
}

/**
 * Confidential Yield Service
 * Orchestrates private yield calculations using Marlin Oyster TEEs
 */
class ConfidentialYieldService {
  private static instance: ConfidentialYieldService;
  private analysisCache: Map<string, ConfidentialYieldAnalysis> = new Map();
  private strategyVault: Map<string, YieldStrategy> = new Map();
  private portfolioSnapshots: Map<string, PrivatePortfolioSnapshot> = new Map();

  private constructor() {}

  static getInstance(): ConfidentialYieldService {
    if (!ConfidentialYieldService.instance) {
      ConfidentialYieldService.instance = new ConfidentialYieldService();
    }
    return ConfidentialYieldService.instance;
  }

  /**
   * Initialize confidential yield service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔒 Initializing Confidential Yield Service...');
      
      // Initialize Marlin Oyster if not already done
      await marlinOysterManager.initialize({
        networkEndpoint: process.env.NEXT_PUBLIC_MARLIN_ENDPOINT,
        apiKey: process.env.MARLIN_OYSTER_API_KEY,
        keyDerivationSeed: process.env.MARLIN_KEY_SEED
      });

      // Load default strategies
      await this.loadDefaultStrategies();

      console.log('✅ Confidential Yield Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Confidential Yield Service:', error);
      throw error;
    }
  }

  /**
   * Load default yield strategies
   */
  private async loadDefaultStrategies(): Promise<void> {
    const defaultStrategies: YieldStrategy[] = [
      {
        id: 'conservative-stable',
        name: 'Conservative Stablecoin Strategy',
        description: 'Low-risk yield farming focused on stablecoin pairs',
        targetApy: 8.5,
        riskProfile: 'conservative',
        encryptedParams: 'encrypted_conservative_params',
        publicInfo: {
          chainPreferences: [1, 137, 42161, 5000], // ETH, Polygon, Arbitrum, Mantle
          categoryFocus: ['lending', 'staking'],
          maxPositions: 3,
          rebalanceFrequency: 'weekly'
        }
      },
      {
        id: 'balanced-growth',
        name: 'Balanced Growth Strategy',
        description: 'Moderate risk strategy balancing yield and growth',
        targetApy: 15.2,
        riskProfile: 'moderate',
        encryptedParams: 'encrypted_balanced_params',
        publicInfo: {
          chainPreferences: [1, 137, 42161, 10, 5000],
          categoryFocus: ['farming', 'lending', 'liquidity'],
          maxPositions: 5,
          rebalanceFrequency: 'daily'
        }
      },
      {
        id: 'aggressive-defi',
        name: 'Aggressive DeFi Strategy',
        description: 'High-yield strategy targeting emerging protocols',
        targetApy: 25.8,
        riskProfile: 'aggressive',
        encryptedParams: 'encrypted_aggressive_params',
        publicInfo: {
          chainPreferences: [5000, 8453, 137], // Mantle, Base, Polygon
          categoryFocus: ['farming', 'liquidity', 'staking'],
          maxPositions: 8,
          rebalanceFrequency: 'hourly'
        }
      }
    ];

    for (const strategy of defaultStrategies) {
      this.strategyVault.set(strategy.id, strategy);
    }

    console.log(`📋 Loaded ${defaultStrategies.length} default strategies`);
  }

  /**
   * Create private portfolio snapshot for analysis
   */
  async createPrivatePortfolioSnapshot(walletAddress?: string): Promise<PrivatePortfolioSnapshot> {
    try {
      const wallet = getParaWallet();
      const address = walletAddress || wallet?.address;

      if (!address) {
        throw new Error('No wallet address available for portfolio snapshot');
      }

      console.log('📸 Creating private portfolio snapshot...');

      // Mock portfolio data - in production would gather from wallet and protocols
      const mockPositions = {
        mantle: {
          'merchant-moe-lp': { amount: '1250.50', apy: 15.2 },
          'fusionx-lending': { amount: '800.25', apy: 12.8 },
          'dolomite-supply': { amount: '500.75', apy: 8.5 }
        },
        arbitrum: {
          'gmx-staking': { amount: '300.00', apy: 18.3 }
        }
      };

      const mockBalances = {
        MNT: '245.67',
        USDC: '1890.32',
        ETH: '0.75',
        ARB: '125.50'
      };

      const mockTransactionHistory = Array.from({ length: 50 }, (_, i) => ({
        timestamp: Date.now() - i * 86400000,
        type: Math.random() > 0.5 ? 'stake' : 'withdraw',
        amount: Math.random() * 1000,
        protocol: ['merchant-moe', 'fusionx', 'dolomite'][Math.floor(Math.random() * 3)]
      }));

      // Create encrypted snapshot
      const snapshot: PrivatePortfolioSnapshot = {
        timestamp: Date.now(),
        addressHash: this.hashAddress(address),
        
        // In production, these would be properly encrypted
        encryptedPositions: JSON.stringify(mockPositions),
        encryptedBalances: JSON.stringify(mockBalances),
        encryptedTransactionHistory: JSON.stringify(mockTransactionHistory),
        
        publicMetrics: {
          totalValueUsd: 3862.44,
          positionCount: 4,
          chainDistribution: {
            5000: 70, // Mantle 70%
            42161: 30 // Arbitrum 30%
          },
          riskDistribution: { low: 30, medium: 50, high: 20 }
        }
      };

      // Cache the snapshot
      this.portfolioSnapshots.set(address, snapshot);

      console.log('✅ Private portfolio snapshot created');
      return snapshot;
    } catch (error) {
      console.error('Error creating portfolio snapshot:', error);
      throw error;
    }
  }

  /**
   * Run confidential yield analysis using TEE
   */
  async runConfidentialAnalysis(params: {
    strategyIds: string[];
    portfolioAddress?: string;
    privacyLevel?: 'standard' | 'enhanced' | 'maximum';
    timeHorizon?: '1d' | '1w' | '1m' | '3m' | '1y';
    riskTolerance?: 'low' | 'medium' | 'high';
  }): Promise<ConfidentialYieldAnalysis> {
    try {
      console.log('🔒 Starting confidential yield analysis...');

      // Validate inputs
      if (!params.strategyIds.length) {
        throw new Error('At least one strategy ID is required');
      }

      // Check wallet connection
      if (!isParaWalletConnected()) {
        throw new Error('Para wallet must be connected for confidential analysis');
      }

      // Get strategies from vault
      const strategies = params.strategyIds.map(id => this.strategyVault.get(id)).filter(Boolean);
      if (strategies.length === 0) {
        throw new Error('No valid strategies found');
      }

      // Create or get portfolio snapshot
      const portfolioSnapshot = await this.createPrivatePortfolioSnapshot(params.portfolioAddress);

      // Gather chain data for analysis
      const chainData = await this.gatherChainData();

      // Submit to TEE for confidential computation
      const startTime = Date.now();
      const teeResult = await calculateConfidentialYields({
        strategies,
        portfolioData: {
          positions: JSON.parse(portfolioSnapshot.encryptedPositions),
          balances: JSON.parse(portfolioSnapshot.encryptedBalances),
          address: params.portfolioAddress
        },
        chainData,
        preferences: {
          riskTolerance: params.riskTolerance || 'medium',
          timeHorizon: params.timeHorizon || '1m',
          privacyLevel: params.privacyLevel || 'standard'
        }
      });
      const computationTime = Date.now() - startTime;

      // Create analysis result
      const analysis: ConfidentialYieldAnalysis = {
        requestId: teeResult.requestId,
        inputPrivacyLevel: params.privacyLevel || 'standard',
        computationTime,
        
        publicMetrics: {
          totalOpportunities: chainData.reduce((sum, chain) => sum + chain.protocolData.length, 0),
          averageApy: this.calculateAverageApy(chainData),
          riskScore: teeResult.riskMetrics.riskScore,
          confidenceScore: this.calculateConfidenceScore(teeResult.optimizedAllocations),
          chainsAnalyzed: chainData.length
        },
        
        confidentialResults: teeResult,
        status: 'completed',
        attestationVerified: true, // Would verify in production
        computeProofValid: true    // Would verify in production
      };

      // Cache the analysis
      this.analysisCache.set(teeResult.requestId, analysis);

      console.log(`✅ Confidential analysis completed in ${computationTime}ms`);
      return analysis;

    } catch (error) {
      console.error('❌ Error in confidential yield analysis:', error);
      throw error;
    }
  }

  /**
   * Gather chain data for TEE analysis
   */
  private async gatherChainData(): Promise<ChainDataInput[]> {
    try {
      console.log('📊 Gathering chain data for analysis...');

      const supportedChainIds = [1, 137, 42161, 10, 8453, 5000]; // ETH, Polygon, Arbitrum, Optimism, Base, Mantle
      const chainData: ChainDataInput[] = [];

      for (const chainId of supportedChainIds) {
        try {
          // Get yield opportunities for this chain
          const opportunities = await getChainYieldOpportunities(chainId);
          
          // Convert to protocol data points
          const protocolData: ProtocolDataPoint[] = opportunities.map(op => ({
            protocol: op.protocol,
            apy: op.apy,
            tvl: op.tvl,
            riskScore: this.mapRiskLevelToScore(op.riskLevel),
            liquidityDepth: this.estimateLiquidityDepth(op.tvl),
            historicalPerformance: this.generateMockHistoricalData(op.apy)
          }));

          // Mock gas and liquidity metrics
          const gasMetrics = {
            currentPrice: this.getMockGasPrice(chainId),
            averagePrice24h: this.getMockGasPrice(chainId, 0.9),
            volatility: Math.random() * 0.3,
            congestionLevel: 'low' as const,
            predictedPrices: [
              { timeframe: '1h', predictedPrice: this.getMockGasPrice(chainId, 1.1), confidence: 0.8 },
              { timeframe: '4h', predictedPrice: this.getMockGasPrice(chainId, 1.05), confidence: 0.7 },
              { timeframe: '24h', predictedPrice: this.getMockGasPrice(chainId, 0.95), confidence: 0.6 }
            ]
          };

          const liquidityMetrics = {
            totalValue: this.calculateTotalTvl(protocolData),
            depth: 85,
            slippageTolerance: 0.5,
            fragmentationIndex: 0.25,
            crossChainLiquidity: 0.15
          };

          chainData.push({
            chainId,
            protocolData,
            gasMetrics,
            liquidityMetrics
          });

        } catch (error) {
          console.warn(`Failed to gather data for chain ${chainId}:`, error);
        }
      }

      console.log(`📈 Gathered data for ${chainData.length} chains`);
      return chainData;

    } catch (error) {
      console.error('Error gathering chain data:', error);
      throw error;
    }
  }

  /**
   * Decrypt and process confidential results for user
   */
  async processConfidentialResults(requestId: string): Promise<{
    allocations: any[];
    projectedReturns: any;
    riskAssessment: any;
    executionPlan: any;
    privateAnalytics: any;
  }> {
    try {
      console.log(`🔓 Processing confidential results for request ${requestId}...`);

      const analysis = this.analysisCache.get(requestId);
      if (!analysis) {
        throw new Error('Analysis not found or expired');
      }

      if (analysis.status !== 'completed') {
        throw new Error(`Analysis status: ${analysis.status}`);
      }

      // Decrypt the confidential results
      const decryptedResults = await decryptConfidentialResults(analysis.confidentialResults);

      if (!decryptedResults.verified) {
        console.warn('⚠️ Results could not be fully verified');
      }

      // Process and format results for frontend
      const processedResults = {
        allocations: decryptedResults.allocations.map((allocation: any, index: number) => ({
          id: `allocation_${index}`,
          protocol: allocation.protocol || 'Unknown',
          percentage: allocation.allocation || 0,
          expectedApy: allocation.expectedApy || 0,
          reasoning: allocation.reasoning || 'No reasoning provided',
          confidence: allocation.confidence || 0,
          riskLevel: this.assessAllocationRisk(allocation.expectedApy),
          estimatedValue: this.calculateAllocationValue(allocation.allocation, 1000) // Assuming $1000 portfolio
        })),

        projectedReturns: {
          daily: decryptedResults.returns.daily || '0%',
          weekly: decryptedResults.returns.weekly || '0%',
          monthly: decryptedResults.returns.monthly || '0%',
          yearly: decryptedResults.returns.yearly || '0%',
          compoundingEffect: this.calculateCompounding(parseFloat(decryptedResults.returns.yearly || '0')),
          bestCase: this.calculateBestCase(decryptedResults.returns),
          worstCase: this.calculateWorstCase(decryptedResults.returns)
        },

        riskAssessment: {
          overallRisk: analysis.publicMetrics.riskScore,
          valueAtRisk: decryptedResults.risks['1day_95%'] || 'N/A',
          stressTestResults: decryptedResults.risks || {},
          diversificationScore: this.calculateDiversificationScore(decryptedResults.allocations),
          protocolRisks: this.assessProtocolRisks(decryptedResults.allocations)
        },

        executionPlan: {
          steps: Array.isArray(decryptedResults.executionPlan) ? 
            decryptedResults.executionPlan : 
            ['Execute optimized allocation strategy'],
          estimatedCosts: {
            gas: '0.005 ETH',
            bridging: '0.002 ETH',
            protocolFees: '~0.1%',
            total: '0.007 ETH + 0.1%'
          },
          timeEstimate: '5-15 minutes',
          optimalWindow: 'Next 4 hours (low gas period)',
          prerequisites: [
            'Approve token spending',
            'Ensure sufficient gas balance',
            'Review final allocations'
          ]
        },

        privateAnalytics: {
          computationTime: analysis.computationTime,
          confidenceScore: analysis.publicMetrics.confidenceScore,
          attestationVerified: analysis.attestationVerified,
          privacyLevel: analysis.inputPrivacyLevel,
          enclavesUsed: [analysis.confidentialResults.attestation.enclaveId],
          dataEncryption: 'AES-256-GCM',
          zeroKnowledgeProofs: decryptedResults.verified
        }
      };

      console.log('✅ Confidential results processed successfully');
      return processedResults;

    } catch (error) {
      console.error('Error processing confidential results:', error);
      throw error;
    }
  }

  /**
   * Get available strategies from vault
   */
  getAvailableStrategies(): YieldStrategy[] {
    return Array.from(this.strategyVault.values());
  }

  /**
   * Get cached analysis by request ID
   */
  getAnalysis(requestId: string): ConfidentialYieldAnalysis | null {
    return this.analysisCache.get(requestId) || null;
  }

  /**
   * Clear expired analyses from cache
   */
  clearExpiredAnalyses(): void {
    const now = Date.now();
    const expirationTime = 3600000; // 1 hour

    for (const [requestId, analysis] of this.analysisCache) {
      // Extract timestamp from requestId (assuming format: req_timestamp_random)
      const timestamp = parseInt(requestId.split('_')[1]);
      
      if (now - timestamp > expirationTime) {
        this.analysisCache.delete(requestId);
        console.log(`🗑️ Expired analysis ${requestId} removed from cache`);
      }
    }
  }

  // Helper methods
  private hashAddress(address: string): string {
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

  private mapRiskLevelToScore(riskLevel: string): number {
    const mapping = { 'low': 25, 'medium': 50, 'high': 75 };
    return mapping[riskLevel as keyof typeof mapping] || 50;
  }

  private estimateLiquidityDepth(tvl: string): number {
    const value = parseFloat(tvl.replace(/[$KMB]/g, ''));
    const multiplier = tvl.includes('B') ? 1000000000 : tvl.includes('M') ? 1000000 : tvl.includes('K') ? 1000 : 1;
    const totalValue = value * multiplier;
    return Math.min(100, Math.log10(totalValue) * 10);
  }

  private generateMockHistoricalData(baseApy: number): number[] {
    return Array.from({ length: 30 }, () => 
      baseApy + (Math.random() - 0.5) * baseApy * 0.2
    );
  }

  private getMockGasPrice(chainId: number, multiplier: number = 1): string {
    const basePrices = { 1: 25, 137: 2, 42161: 0.5, 10: 1, 8453: 1, 5000: 0.1 };
    return ((basePrices[chainId as keyof typeof basePrices] || 10) * multiplier).toFixed(1);
  }

  private calculateTotalTvl(protocolData: ProtocolDataPoint[]): string {
    const totalValue = protocolData.reduce((sum, protocol) => {
      const value = parseFloat(protocol.tvl.replace(/[$KMB]/g, ''));
      const multiplier = protocol.tvl.includes('B') ? 1e9 : protocol.tvl.includes('M') ? 1e6 : protocol.tvl.includes('K') ? 1e3 : 1;
      return sum + (value * multiplier);
    }, 0);

    if (totalValue >= 1e9) return `$${(totalValue / 1e9).toFixed(1)}B`;
    if (totalValue >= 1e6) return `$${(totalValue / 1e6).toFixed(1)}M`;
    return `$${(totalValue / 1e3).toFixed(1)}K`;
  }

  private calculateAverageApy(chainData: ChainDataInput[]): number {
    const allApys = chainData.flatMap(chain => chain.protocolData.map(p => p.apy));
    return allApys.length > 0 ? allApys.reduce((sum, apy) => sum + apy, 0) / allApys.length : 0;
  }

  private calculateConfidenceScore(allocations: any[]): number {
    const avgConfidence = allocations.reduce((sum, alloc) => sum + alloc.confidence, 0) / allocations.length;
    return Math.round(avgConfidence * 100);
  }

  private assessAllocationRisk(apy: number): 'low' | 'medium' | 'high' {
    if (apy < 8) return 'low';
    if (apy < 15) return 'medium';
    return 'high';
  }

  private calculateAllocationValue(percentage: number, totalValue: number): string {
    return `$${((percentage / 100) * totalValue).toFixed(2)}`;
  }

  private calculateCompounding(yearlyApy: number): { withCompounding: string; withoutCompounding: string } {
    const principal = 1000;
    const withCompounding = principal * Math.pow(1 + yearlyApy/100, 1);
    const withoutCompounding = principal * (1 + yearlyApy/100);
    
    return {
      withCompounding: `$${withCompounding.toFixed(2)}`,
      withoutCompounding: `$${withoutCompounding.toFixed(2)}`
    };
  }

  private calculateBestCase(returns: any): string {
    const yearly = parseFloat(returns.yearly?.replace('%', '') || '0');
    return `${(yearly * 1.3).toFixed(1)}%`;
  }

  private calculateWorstCase(returns: any): string {
    const yearly = parseFloat(returns.yearly?.replace('%', '') || '0');
    return `${(yearly * 0.7).toFixed(1)}%`;
  }

  private calculateDiversificationScore(allocations: any[]): number {
    const protocolCount = new Set(allocations.map(a => a.protocol)).size;
    return Math.min(100, protocolCount * 20);
  }

  private assessProtocolRisks(allocations: any[]): { protocol: string; risk: string; reason: string }[] {
    return allocations.map(allocation => ({
      protocol: allocation.protocol || 'Unknown',
      risk: this.assessAllocationRisk(allocation.expectedApy || 0),
      reason: allocation.expectedApy > 20 ? 'High APY indicates higher risk' : 
              allocation.expectedApy < 5 ? 'Very conservative, low risk' :
              'Moderate risk profile'
    }));
  }
}

// Export singleton instance
export const confidentialYieldService = ConfidentialYieldService.getInstance();

// Export convenience functions
export const initializeConfidentialYields = () => confidentialYieldService.initialize();
export const runConfidentialAnalysis = (params: any) => confidentialYieldService.runConfidentialAnalysis(params);
export const processConfidentialResults = (requestId: string) => confidentialYieldService.processConfidentialResults(requestId);
export const getAvailableStrategies = () => confidentialYieldService.getAvailableStrategies();