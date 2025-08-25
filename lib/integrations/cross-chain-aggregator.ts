import { ethers } from 'ethers';
import { 
  CrossChainYieldOpportunity, 
  orbyChainManager,
  getAllYieldOpportunities,
  getChainConfig,
  OrbyChainConfig
} from './orby-chain-abstraction';
import { 
  paraWalletManager,
  getParaWallet,
  isParaWalletConnected
} from './para-wallet';

// Cross-chain aggregation types
export interface AggregatedOpportunity {
  id: string;
  protocol: string;
  category: 'lending' | 'farming' | 'staking' | 'liquidity';
  baseApy: number;
  boostedApy?: number;
  totalTvl: string;
  riskScore: number;
  chains: ChainPresence[];
  bestChain: ChainPresence;
  crossChainBenefits: CrossChainBenefit[];
}

export interface ChainPresence {
  chainId: number;
  chainName: string;
  apy: number;
  tvl: string;
  contractAddress: string;
  gasEstimate: string;
  liquidityDepth: string;
}

export interface CrossChainBenefit {
  type: 'gas_savings' | 'higher_yield' | 'better_liquidity' | 'risk_diversification';
  description: string;
  value: string;
  impact: 'low' | 'medium' | 'high';
}

export interface CrossChainRoute {
  from: ChainPresence;
  to: ChainPresence;
  bridgeProtocol: string;
  estimatedTime: string;
  bridgeFee: string;
  gasEstimate: string;
  totalCost: string;
  netBenefit: string;
  isRecommended: boolean;
}

export interface OptimizedAllocation {
  totalAmount: string;
  allocations: AllocationTarget[];
  expectedApy: number;
  riskScore: number;
  gasCosts: string;
  projectedYield: {
    daily: string;
    monthly: string;
    yearly: string;
  };
}

export interface AllocationTarget {
  opportunity: CrossChainYieldOpportunity;
  allocatedAmount: string;
  percentage: number;
  expectedYield: string;
  reasoning: string;
}

export interface MarketConditions {
  gasPrice: { [chainId: number]: string };
  tokenPrices: { [symbol: string]: number };
  liquidityMetrics: { [chainId: number]: { [protocol: string]: string } };
  yieldTrends: { [protocol: string]: { trend: 'up' | 'down' | 'stable'; change: number } };
}

/**
 * Cross-Chain Opportunity Aggregator
 * Intelligently aggregates and optimizes yield opportunities across multiple chains
 */
class CrossChainAggregator {
  private static instance: CrossChainAggregator;
  private marketData: MarketConditions | null = null;
  private lastUpdate: number = 0;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): CrossChainAggregator {
    if (!CrossChainAggregator.instance) {
      CrossChainAggregator.instance = new CrossChainAggregator();
    }
    return CrossChainAggregator.instance;
  }

  /**
   * Get aggregated opportunities with intelligent grouping and optimization
   */
  async getAggregatedOpportunities(filters: {
    minAmount?: string;
    maxRisk?: number;
    preferredChains?: number[];
    categories?: string[];
  } = {}): Promise<AggregatedOpportunity[]> {
    try {
      // Refresh market data if needed
      await this.updateMarketConditions();

      // Get all opportunities
      const allOpportunities = await getAllYieldOpportunities();

      // Group opportunities by protocol and category
      const groupedOps = this.groupOpportunitiesByProtocol(allOpportunities);

      // Create aggregated opportunities
      const aggregated: AggregatedOpportunity[] = [];

      for (const [protocolKey, opportunities] of groupedOps) {
        const aggregatedOp = await this.createAggregatedOpportunity(protocolKey, opportunities);
        
        // Apply filters
        if (this.passesFilters(aggregatedOp, filters)) {
          aggregated.push(aggregatedOp);
        }
      }

      // Sort by optimization score (weighted combination of APY, TVL, risk)
      return aggregated.sort((a, b) => this.calculateOptimizationScore(b) - this.calculateOptimizationScore(a));
    } catch (error) {
      console.error('Error getting aggregated opportunities:', error);
      return [];
    }
  }

  /**
   * Group opportunities by protocol and category
   */
  private groupOpportunitiesByProtocol(opportunities: CrossChainYieldOpportunity[]): Map<string, CrossChainYieldOpportunity[]> {
    const grouped = new Map<string, CrossChainYieldOpportunity[]>();

    for (const opportunity of opportunities) {
      const key = `${opportunity.protocol}-${opportunity.category}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key)!.push(opportunity);
    }

    return grouped;
  }

  /**
   * Create aggregated opportunity from multiple chain instances
   */
  private async createAggregatedOpportunity(
    protocolKey: string,
    opportunities: CrossChainYieldOpportunity[]
  ): Promise<AggregatedOpportunity> {
    const [protocol, category] = protocolKey.split('-');
    
    // Calculate aggregated metrics
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

    const baseApy = Math.max(...opportunities.map(op => op.apy));
    const averageRisk = this.calculateAverageRiskScore(opportunities);

    // Create chain presences
    const chains: ChainPresence[] = await Promise.all(
      opportunities.map(async op => {
        const chainConfig = getChainConfig(op.chainId);
        const gasEstimate = await this.estimateGasCost(op.chainId, op.category);
        
        return {
          chainId: op.chainId,
          chainName: op.chainName,
          apy: op.apy,
          tvl: op.tvl,
          contractAddress: op.contractAddress,
          gasEstimate,
          liquidityDepth: this.calculateLiquidityDepth(op)
        };
      })
    );

    // Find best chain (highest APY after gas costs)
    const bestChain = chains.reduce((best, current) => 
      this.calculateNetYield(current) > this.calculateNetYield(best) ? current : best
    );

    // Calculate cross-chain benefits
    const crossChainBenefits = this.calculateCrossChainBenefits(chains, category);

    // Calculate boosted APY from cross-chain optimization
    const boostedApy = this.calculateBoostedApy(baseApy, crossChainBenefits);

    return {
      id: `aggregated-${protocolKey}`,
      protocol,
      category: category as any,
      baseApy,
      boostedApy,
      totalTvl: this.formatTvl(totalTvlValue),
      riskScore: averageRisk,
      chains,
      bestChain,
      crossChainBenefits
    };
  }

  /**
   * Calculate average risk score from risk levels
   */
  private calculateAverageRiskScore(opportunities: CrossChainYieldOpportunity[]): number {
    const riskValues = { 'low': 1, 'medium': 2, 'high': 3 };
    const totalRisk = opportunities.reduce((sum, op) => sum + riskValues[op.riskLevel], 0);
    return totalRisk / opportunities.length;
  }

  /**
   * Estimate gas cost for a transaction type on a specific chain
   */
  private async estimateGasCost(chainId: number, category: string): Promise<string> {
    try {
      const gasPrice = await orbyChainManager.getGasPrice(chainId);
      
      // Estimate gas units based on transaction type
      let gasUnits: number;
      switch (category) {
        case 'staking': gasUnits = 150000; break;
        case 'farming': gasUnits = 200000; break;
        case 'lending': gasUnits = 180000; break;
        case 'liquidity': gasUnits = 250000; break;
        default: gasUnits = 150000;
      }

      const gasCost = parseFloat(gasPrice) * gasUnits / 1e9; // Convert to ETH
      const chainConfig = getChainConfig(chainId);
      
      return `${gasCost.toFixed(6)} ${chainConfig?.nativeCurrency.symbol || 'ETH'}`;
    } catch (error) {
      console.error(`Error estimating gas for chain ${chainId}:`, error);
      return '0.01 ETH';
    }
  }

  /**
   * Calculate liquidity depth (mock implementation)
   */
  private calculateLiquidityDepth(opportunity: CrossChainYieldOpportunity): string {
    // This would analyze actual liquidity depth from DEX pools
    // For now, return a mock value based on TVL
    const tvlMatch = opportunity.tvl.match(/\$([0-9.]+)([KMB]?)/);
    if (!tvlMatch) return 'Low';
    
    let value = parseFloat(tvlMatch[1]);
    const unit = tvlMatch[2];
    
    if (unit === 'B') return 'Very High';
    if (unit === 'M' && value > 50) return 'High';
    if (unit === 'M' && value > 10) return 'Medium';
    return 'Low';
  }

  /**
   * Calculate net yield after gas costs
   */
  private calculateNetYield(chain: ChainPresence): number {
    // Simplified calculation - in reality would consider investment amount
    const gasCostEth = parseFloat(chain.gasEstimate.split(' ')[0]);
    const gasCostImpact = gasCostEth * 365 * 2000; // Assume ETH at $2000, 365 transactions per year
    
    // For $10,000 investment, what's the gas impact?
    const gasImpactPercent = (gasCostImpact / 10000) * 100;
    
    return Math.max(0, chain.apy - gasImpactPercent);
  }

  /**
   * Calculate cross-chain benefits
   */
  private calculateCrossChainBenefits(chains: ChainPresence[], category: string): CrossChainBenefit[] {
    const benefits: CrossChainBenefit[] = [];

    // Gas savings benefit
    const gasCosts = chains.map(c => parseFloat(c.gasEstimate.split(' ')[0]));
    const minGas = Math.min(...gasCosts);
    const maxGas = Math.max(...gasCosts);
    
    if (maxGas > minGas * 2) {
      benefits.push({
        type: 'gas_savings',
        description: `Save up to ${((maxGas - minGas) / maxGas * 100).toFixed(0)}% on transaction fees`,
        value: `${(maxGas - minGas).toFixed(4)} ETH per transaction`,
        impact: maxGas > minGas * 5 ? 'high' : 'medium'
      });
    }

    // Higher yield benefit
    const apys = chains.map(c => c.apy);
    const minApy = Math.min(...apys);
    const maxApy = Math.max(...apys);
    
    if (maxApy > minApy * 1.2) {
      benefits.push({
        type: 'higher_yield',
        description: `Access up to ${(maxApy - minApy).toFixed(1)}% higher APY on different chains`,
        value: `+${(maxApy - minApy).toFixed(1)}% APY`,
        impact: maxApy > minApy * 1.5 ? 'high' : 'medium'
      });
    }

    // Liquidity benefit
    const liquidityLevels = chains.map(c => c.liquidityDepth);
    if (liquidityLevels.includes('Very High') && liquidityLevels.includes('Low')) {
      benefits.push({
        type: 'better_liquidity',
        description: 'Access deeper liquidity pools for large transactions',
        value: 'Reduced slippage on large trades',
        impact: 'medium'
      });
    }

    // Risk diversification
    if (chains.length > 2) {
      benefits.push({
        type: 'risk_diversification',
        description: `Spread risk across ${chains.length} different chains`,
        value: 'Reduced protocol and chain-specific risks',
        impact: 'high'
      });
    }

    return benefits;
  }

  /**
   * Calculate boosted APY from cross-chain benefits
   */
  private calculateBoostedApy(baseApy: number, benefits: CrossChainBenefit[]): number {
    let boost = 0;

    for (const benefit of benefits) {
      switch (benefit.type) {
        case 'gas_savings':
          boost += benefit.impact === 'high' ? 0.5 : 0.2;
          break;
        case 'higher_yield':
          const yieldBoost = parseFloat(benefit.value.replace('+', '').replace('% APY', ''));
          boost += yieldBoost * 0.8; // 80% of the benefit due to allocation overhead
          break;
        case 'better_liquidity':
          boost += 0.1;
          break;
        case 'risk_diversification':
          boost += 0.3; // Risk-adjusted return improvement
          break;
      }
    }

    return baseApy + boost;
  }

  /**
   * Format TVL value
   */
  private formatTvl(value: number): string {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }

  /**
   * Check if aggregated opportunity passes filters
   */
  private passesFilters(opportunity: AggregatedOpportunity, filters: any): boolean {
    if (filters.maxRisk && opportunity.riskScore > filters.maxRisk) return false;
    if (filters.preferredChains && !opportunity.chains.some(c => filters.preferredChains.includes(c.chainId))) return false;
    if (filters.categories && !filters.categories.includes(opportunity.category)) return false;
    return true;
  }

  /**
   * Calculate optimization score for sorting
   */
  private calculateOptimizationScore(opportunity: AggregatedOpportunity): number {
    const apyScore = (opportunity.boostedApy || opportunity.baseApy) * 0.4;
    const tvlScore = this.parseTvl(opportunity.totalTvl) / 1e6 * 0.2;
    const riskScore = (4 - opportunity.riskScore) * 0.2; // Lower risk = higher score
    const diversificationScore = opportunity.chains.length * 0.1;
    const benefitScore = opportunity.crossChainBenefits.length * 0.1;
    
    return apyScore + tvlScore + riskScore + diversificationScore + benefitScore;
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
   * Get optimal allocation strategy for a given amount
   */
  async getOptimalAllocation(
    totalAmount: string,
    preferences: {
      riskTolerance: 'conservative' | 'balanced' | 'aggressive';
      preferredChains?: number[];
      categories?: string[];
      maxPositions?: number;
    }
  ): Promise<OptimizedAllocation> {
    try {
      const aggregatedOps = await this.getAggregatedOpportunities({
        preferredChains: preferences.preferredChains,
        categories: preferences.categories
      });

      // Filter by risk tolerance
      const riskThresholds = { conservative: 1.5, balanced: 2.5, aggressive: 3.5 };
      const filteredOps = aggregatedOps.filter(op => op.riskScore <= riskThresholds[preferences.riskTolerance]);

      // Limit number of positions
      const maxPositions = preferences.maxPositions || 5;
      const selectedOps = filteredOps.slice(0, maxPositions);

      // Calculate allocations using modern portfolio theory principles
      const allocations = this.calculateOptimalAllocations(selectedOps, totalAmount, preferences.riskTolerance);

      // Calculate metrics
      const expectedApy = allocations.reduce((sum, alloc) => {
        const op = aggregatedOps.find(o => o.id === alloc.opportunity.id);
        return sum + (op?.boostedApy || op?.baseApy || 0) * alloc.percentage / 100;
      }, 0);

      const averageRisk = allocations.reduce((sum, alloc) => {
        const op = aggregatedOps.find(o => o.id === alloc.opportunity.id);
        return sum + (op?.riskScore || 0) * alloc.percentage / 100;
      }, 0);

      // Estimate gas costs
      const gasCosts = await this.estimateTotalGasCosts(allocations);

      // Calculate projected yields
      const totalAmountNum = parseFloat(totalAmount);
      const yearlyYield = totalAmountNum * expectedApy / 100;
      
      return {
        totalAmount,
        allocations,
        expectedApy,
        riskScore: averageRisk,
        gasCosts,
        projectedYield: {
          daily: (yearlyYield / 365).toFixed(2),
          monthly: (yearlyYield / 12).toFixed(2),
          yearly: yearlyYield.toFixed(2)
        }
      };
    } catch (error) {
      console.error('Error calculating optimal allocation:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal allocations using portfolio optimization
   */
  private calculateOptimalAllocations(
    opportunities: AggregatedOpportunity[],
    totalAmount: string,
    riskTolerance: string
  ): AllocationTarget[] {
    const allocations: AllocationTarget[] = [];
    const totalAmountNum = parseFloat(totalAmount);

    // Simple allocation strategy based on risk tolerance
    let weights: number[];
    
    switch (riskTolerance) {
      case 'conservative':
        // Equal weight with preference for lower risk
        weights = opportunities.map(op => 1 / (op.riskScore * op.riskScore));
        break;
      case 'balanced':
        // Balance between APY and risk
        weights = opportunities.map(op => (op.boostedApy || op.baseApy) / op.riskScore);
        break;
      case 'aggressive':
        // Weight by APY
        weights = opportunities.map(op => Math.pow(op.boostedApy || op.baseApy, 2));
        break;
      default:
        weights = new Array(opportunities.length).fill(1);
    }

    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    // Create allocations
    for (let i = 0; i < opportunities.length; i++) {
      const opportunity = opportunities[i];
      const percentage = normalizedWeights[i] * 100;
      const allocatedAmount = (totalAmountNum * percentage / 100).toString();
      const expectedYield = (parseFloat(allocatedAmount) * (opportunity.boostedApy || opportunity.baseApy) / 100).toString();

      // Find best chain for this opportunity
      const bestChainOp = opportunity.chains.reduce((best, chain) => 
        this.calculateNetYield(chain) > this.calculateNetYield(best) ? chain : best
      );

      // Create corresponding CrossChainYieldOpportunity
      const crossChainOp: CrossChainYieldOpportunity = {
        id: opportunity.id,
        chainId: bestChainOp.chainId,
        chainName: bestChainOp.chainName,
        protocol: opportunity.protocol,
        category: opportunity.category,
        pair: '', // Would need to be derived from opportunity details
        apy: bestChainOp.apy,
        tvl: bestChainOp.tvl,
        contractAddress: bestChainOp.contractAddress,
        riskLevel: this.riskScoreToLevel(opportunity.riskScore),
        autoCompoundAvailable: true,
        minimumDeposit: '10'
      };

      allocations.push({
        opportunity: crossChainOp,
        allocatedAmount,
        percentage,
        expectedYield,
        reasoning: this.generateAllocationReasoning(opportunity, percentage, riskTolerance)
      });
    }

    return allocations;
  }

  /**
   * Convert risk score to risk level
   */
  private riskScoreToLevel(score: number): 'low' | 'medium' | 'high' {
    if (score <= 1.5) return 'low';
    if (score <= 2.5) return 'medium';
    return 'high';
  }

  /**
   * Generate reasoning for allocation
   */
  private generateAllocationReasoning(
    opportunity: AggregatedOpportunity,
    percentage: number,
    riskTolerance: string
  ): string {
    const reasons = [];

    if (percentage > 30) {
      reasons.push(`High allocation due to ${(opportunity.boostedApy || opportunity.baseApy).toFixed(1)}% APY`);
    }

    if (opportunity.crossChainBenefits.some(b => b.impact === 'high')) {
      reasons.push('Significant cross-chain optimization benefits');
    }

    if (opportunity.riskScore < 2 && riskTolerance === 'conservative') {
      reasons.push('Low risk profile matches conservative strategy');
    }

    if (opportunity.chains.length > 3) {
      reasons.push('Good diversification across multiple chains');
    }

    return reasons.join('; ') || `${percentage.toFixed(1)}% allocation based on risk-adjusted returns`;
  }

  /**
   * Estimate total gas costs for allocations
   */
  private async estimateTotalGasCosts(allocations: AllocationTarget[]): Promise<string> {
    let totalCost = 0;

    for (const allocation of allocations) {
      const gasCost = parseFloat(allocation.opportunity.contractAddress); // This would be actual gas estimation
      totalCost += gasCost * 0.001; // Mock calculation
    }

    return totalCost.toFixed(4) + ' ETH';
  }

  /**
   * Update market conditions cache
   */
  private async updateMarketConditions(): Promise<void> {
    const now = Date.now();
    
    if (this.marketData && (now - this.lastUpdate) < this.cacheTimeout) {
      return; // Use cached data
    }

    try {
      // This would fetch real market data from various sources
      this.marketData = {
        gasPrice: {},
        tokenPrices: {},
        liquidityMetrics: {},
        yieldTrends: {}
      };

      // Update gas prices for all supported chains
      const supportedChains = orbyChainManager.getSupportedChains();
      for (const chain of supportedChains) {
        try {
          const gasPrice = await orbyChainManager.getGasPrice(chain.chainId);
          this.marketData.gasPrice[chain.chainId] = gasPrice;
        } catch (error) {
          console.error(`Error fetching gas price for ${chain.name}:`, error);
        }
      }

      this.lastUpdate = now;
    } catch (error) {
      console.error('Error updating market conditions:', error);
    }
  }

  /**
   * Get current market conditions
   */
  getMarketConditions(): MarketConditions | null {
    return this.marketData;
  }
}

// Export singleton instance
export const crossChainAggregator = CrossChainAggregator.getInstance();

// Export convenience functions
export const getAggregatedOpportunities = (filters?: any) => 
  crossChainAggregator.getAggregatedOpportunities(filters);

export const getOptimalAllocation = (totalAmount: string, preferences: any) => 
  crossChainAggregator.getOptimalAllocation(totalAmount, preferences);

export const getMarketConditions = () => 
  crossChainAggregator.getMarketConditions();