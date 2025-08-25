import { ethers } from 'ethers';
import { 
  paraWalletManager, 
  ParaWalletInstance,
  getParaWallet,
  isParaWalletConnected 
} from '../integrations/para-wallet';
import { 
  orbyChainManager, 
  CrossChainYieldOpportunity,
  OrbyChainConfig,
  getAllYieldOpportunities,
  getChainYieldOpportunities,
  getTopYieldOpportunities,
  getChainConfig,
  getCurrentChain,
  initializeChain
} from '../integrations/orby-chain-abstraction';
import { getContract, getProvider, waitForTransaction } from './contract-utils';

// Enhanced ABI with cross-chain support
const CROSS_CHAIN_STAKING_ABI = [
  "function stake(uint256 amount) external returns (bool)",
  "function stakeWithAutoCompound(uint256 amount, bool autoCompound) external returns (bool)",
  "function withdraw(uint256 amount) external returns (bool)",
  "function withdrawAll() external returns (bool)",
  "function getReward() external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function earned(address account) external view returns (uint256)",
  "function rewardRate() external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function compound() external returns (bool)",
  "function setAutoCompound(bool enabled) external returns (bool)"
];

const FARMING_ABI = [
  "function deposit(uint256 pid, uint256 amount) external",
  "function withdraw(uint256 pid, uint256 amount) external",
  "function emergencyWithdraw(uint256 pid) external",
  "function harvest(uint256 pid) external",
  "function pendingRewards(uint256 pid, address user) external view returns (uint256)",
  "function userInfo(uint256 pid, address user) external view returns (uint256 amount, uint256 rewardDebt)",
  "function poolInfo(uint256 pid) external view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accRewardPerShare)"
];

const LENDING_ABI = [
  "function supply(uint256 amount) external returns (bool)",
  "function withdraw(uint256 amount) external returns (bool)",
  "function borrow(uint256 amount) external returns (bool)",
  "function repay(uint256 amount) external returns (bool)",
  "function getSupplyBalance(address account) external view returns (uint256)",
  "function getBorrowBalance(address account) external view returns (uint256)",
  "function getSupplyRate() external view returns (uint256)",
  "function getBorrowRate() external view returns (uint256)"
];

// Cross-chain yield farming types
export interface CrossChainYieldTransaction {
  opportunityId: string;
  chainId: number;
  amount: string;
  txType: 'stake' | 'withdraw' | 'harvest' | 'compound';
  autoCompound?: boolean;
  slippage?: number;
}

export interface CrossChainYieldResult {
  success: boolean;
  txHash?: string;
  chainId: number;
  amount: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  error?: string;
}

export interface YieldPortfolioSummary {
  totalValue: string;
  totalYield: string;
  positions: YieldPosition[];
  averageApy: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface YieldPosition {
  opportunityId: string;
  chainId: number;
  chainName: string;
  protocol: string;
  category: string;
  stakedAmount: string;
  currentValue: string;
  earnedRewards: string;
  apy: number;
  riskLevel: string;
  autoCompoundEnabled: boolean;
}

/**
 * Cross-Chain Yield Farming Manager
 * Orchestrates yield farming across multiple chains using Para wallet and Orby abstraction
 */
class CrossChainYieldFarming {
  private static instance: CrossChainYieldFarming;
  private activePositions: Map<string, YieldPosition> = new Map();

  private constructor() {}

  static getInstance(): CrossChainYieldFarming {
    if (!CrossChainYieldFarming.instance) {
      CrossChainYieldFarming.instance = new CrossChainYieldFarming();
    }
    return CrossChainYieldFarming.instance;
  }

  /**
   * Initialize cross-chain yield farming with wallet and chain setup
   */
  async initialize(walletConfig: any): Promise<void> {
    try {
      // Initialize Para wallet
      const wallet = await paraWalletManager.initialize(walletConfig, {
        onChainChanged: async (chainId: number) => {
          console.log(`Chain changed to ${chainId}`);
          await this.handleChainChange(chainId);
        },
        onAccountChanged: async (address: string) => {
          console.log(`Account changed to ${address}`);
          await this.refreshActivePositions();
        }
      });

      // Initialize supported chains
      const supportedChains = orbyChainManager.getSupportedChains();
      for (const chain of supportedChains) {
        await initializeChain(chain.chainId, wallet.provider.provider || window.ethereum);
      }

      // Set current chain
      orbyChainManager.setCurrentChain(wallet.chainId);

      console.log('Cross-chain yield farming initialized successfully');
    } catch (error) {
      console.error('Error initializing cross-chain yield farming:', error);
      throw error;
    }
  }

  /**
   * Handle chain change events
   */
  private async handleChainChange(chainId: number): Promise<void> {
    try {
      orbyChainManager.setCurrentChain(chainId);
      await this.refreshActivePositions();
    } catch (error) {
      console.error('Error handling chain change:', error);
    }
  }

  /**
   * Get all cross-chain yield opportunities with enhanced filtering
   */
  async getCrossChainYieldOpportunities(filters: {
    minApy?: number;
    maxRisk?: 'low' | 'medium' | 'high';
    chains?: number[];
    categories?: string[];
    minTvl?: number;
  } = {}): Promise<CrossChainYieldOpportunity[]> {
    try {
      let opportunities = await getAllYieldOpportunities();

      // Apply filters
      if (filters.minApy) {
        opportunities = opportunities.filter(op => op.apy >= filters.minApy!);
      }

      if (filters.maxRisk) {
        const riskOrder = { 'low': 0, 'medium': 1, 'high': 2 };
        const maxRiskLevel = riskOrder[filters.maxRisk];
        opportunities = opportunities.filter(op => riskOrder[op.riskLevel] <= maxRiskLevel);
      }

      if (filters.chains && filters.chains.length > 0) {
        opportunities = opportunities.filter(op => filters.chains!.includes(op.chainId));
      }

      if (filters.categories && filters.categories.length > 0) {
        opportunities = opportunities.filter(op => filters.categories!.includes(op.category));
      }

      if (filters.minTvl) {
        opportunities = opportunities.filter(op => {
          const tvlMatch = op.tvl.match(/\$([0-9.]+)([KMB]?)/);
          if (!tvlMatch) return false;
          
          let tvlValue = parseFloat(tvlMatch[1]);
          const unit = tvlMatch[2];
          
          if (unit === 'K') tvlValue *= 1000;
          else if (unit === 'M') tvlValue *= 1000000;
          else if (unit === 'B') tvlValue *= 1000000000;
          
          return tvlValue >= filters.minTvl!;
        });
      }

      return opportunities;
    } catch (error) {
      console.error('Error fetching cross-chain yield opportunities:', error);
      return [];
    }
  }

  /**
   * Execute cross-chain yield investment
   */
  async executeYieldInvestment(transaction: CrossChainYieldTransaction): Promise<CrossChainYieldResult> {
    if (!isParaWalletConnected()) {
      throw new Error('Para wallet not connected');
    }

    const wallet = getParaWallet();
    if (!wallet) {
      throw new Error('Wallet instance not available');
    }

    try {
      // Get opportunity details
      const opportunities = await getAllYieldOpportunities();
      const opportunity = opportunities.find(op => op.id === transaction.opportunityId);
      
      if (!opportunity) {
        throw new Error('Yield opportunity not found');
      }

      // Switch to the target chain if needed
      if (wallet.chainId !== transaction.chainId) {
        await paraWalletManager.switchChain(transaction.chainId);
      }

      // Get chain-specific clients
      const publicClient = orbyChainManager.getPublicClient(transaction.chainId);
      const walletClient = orbyChainManager.getWalletClient(transaction.chainId);

      if (!publicClient || !walletClient) {
        throw new Error(`Chain ${transaction.chainId} not properly initialized`);
      }

      // Execute transaction based on category and type
      const txHash = await this.executeTransaction(
        opportunity,
        transaction,
        wallet,
        publicClient,
        walletClient
      );

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`
      });

      // Update active positions
      await this.updatePosition(opportunity, transaction, wallet.address);

      // Record transaction in API
      await this.recordTransaction(transaction, txHash, wallet.address);

      return {
        success: true,
        txHash,
        chainId: transaction.chainId,
        amount: transaction.amount,
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      };
    } catch (error: any) {
      console.error('Error executing yield investment:', error);
      return {
        success: false,
        chainId: transaction.chainId,
        amount: transaction.amount,
        error: error.message
      };
    }
  }

  /**
   * Execute specific transaction type
   */
  private async executeTransaction(
    opportunity: CrossChainYieldOpportunity,
    transaction: CrossChainYieldTransaction,
    wallet: ParaWalletInstance,
    publicClient: any,
    walletClient: any
  ): Promise<string> {
    const amountWei = ethers.parseEther(transaction.amount);

    switch (opportunity.category) {
      case 'staking':
        return await this.executeStakingTransaction(opportunity, transaction, amountWei, walletClient);
      case 'farming':
        return await this.executeFarmingTransaction(opportunity, transaction, amountWei, walletClient);
      case 'lending':
        return await this.executeLendingTransaction(opportunity, transaction, amountWei, walletClient);
      default:
        throw new Error(`Unsupported opportunity category: ${opportunity.category}`);
    }
  }

  /**
   * Execute staking transaction
   */
  private async executeStakingTransaction(
    opportunity: CrossChainYieldOpportunity,
    transaction: CrossChainYieldTransaction,
    amountWei: ethers.BigNumber,
    walletClient: any
  ): Promise<string> {
    const functionName = transaction.autoCompound ? 'stakeWithAutoCompound' : 'stake';
    const args = transaction.autoCompound ? 
      [amountWei.toString(), transaction.autoCompound] : 
      [amountWei.toString()];

    const { hash } = await walletClient.writeContract({
      address: opportunity.contractAddress as `0x${string}`,
      abi: CROSS_CHAIN_STAKING_ABI,
      functionName,
      args,
      value: opportunity.pair.includes('MNT') || opportunity.pair.includes('ETH') ? amountWei.toString() : undefined
    });

    return hash;
  }

  /**
   * Execute farming transaction
   */
  private async executeFarmingTransaction(
    opportunity: CrossChainYieldOpportunity,
    transaction: CrossChainYieldTransaction,
    amountWei: ethers.BigNumber,
    walletClient: any
  ): Promise<string> {
    // For farming, we need the pool ID (assuming it's encoded in the opportunity ID)
    const poolId = this.extractPoolId(opportunity.id);

    const { hash } = await walletClient.writeContract({
      address: opportunity.contractAddress as `0x${string}`,
      abi: FARMING_ABI,
      functionName: 'deposit',
      args: [poolId, amountWei.toString()]
    });

    return hash;
  }

  /**
   * Execute lending transaction
   */
  private async executeLendingTransaction(
    opportunity: CrossChainYieldOpportunity,
    transaction: CrossChainYieldTransaction,
    amountWei: ethers.BigNumber,
    walletClient: any
  ): Promise<string> {
    const { hash } = await walletClient.writeContract({
      address: opportunity.contractAddress as `0x${string}`,
      abi: LENDING_ABI,
      functionName: 'supply',
      args: [amountWei.toString()]
    });

    return hash;
  }

  /**
   * Extract pool ID from opportunity ID (utility function)
   */
  private extractPoolId(opportunityId: string): number {
    // This would extract pool ID from the opportunity ID
    // For now, return 0 as default
    return 0;
  }

  /**
   * Update position tracking
   */
  private async updatePosition(
    opportunity: CrossChainYieldOpportunity,
    transaction: CrossChainYieldTransaction,
    walletAddress: string
  ): Promise<void> {
    const positionKey = `${opportunity.chainId}-${opportunity.id}`;
    
    const existingPosition = this.activePositions.get(positionKey);
    const newAmount = parseFloat(transaction.amount);
    
    if (existingPosition) {
      // Update existing position
      const currentStaked = parseFloat(existingPosition.stakedAmount);
      existingPosition.stakedAmount = (currentStaked + newAmount).toString();
      existingPosition.currentValue = existingPosition.stakedAmount; // Simplified
    } else {
      // Create new position
      const newPosition: YieldPosition = {
        opportunityId: opportunity.id,
        chainId: opportunity.chainId,
        chainName: opportunity.chainName,
        protocol: opportunity.protocol,
        category: opportunity.category,
        stakedAmount: transaction.amount,
        currentValue: transaction.amount,
        earnedRewards: '0',
        apy: opportunity.apy,
        riskLevel: opportunity.riskLevel,
        autoCompoundEnabled: transaction.autoCompound || false
      };
      
      this.activePositions.set(positionKey, newPosition);
    }
  }

  /**
   * Record transaction in API
   */
  private async recordTransaction(
    transaction: CrossChainYieldTransaction,
    txHash: string,
    walletAddress: string
  ): Promise<void> {
    try {
      const chainConfig = getChainConfig(transaction.chainId);
      
      await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress.toLowerCase(),
          type: transaction.txType,
          amount: transaction.amount,
          tokenSymbol: 'MNT', // Would be derived from opportunity
          chain: chainConfig?.name || 'unknown',
          protocol: 'cross-chain-farming',
          opportunityId: transaction.opportunityId,
          status: 'completed',
          transactionHash: txHash,
          chainId: transaction.chainId,
          autoCompound: transaction.autoCompound,
          timestamp: new Date(),
        }),
      });
    } catch (error) {
      console.error('Error recording transaction:', error);
      // Don't throw here as the main transaction succeeded
    }
  }

  /**
   * Get portfolio summary across all chains
   */
  async getPortfolioSummary(walletAddress?: string): Promise<YieldPortfolioSummary> {
    try {
      const wallet = getParaWallet();
      const address = walletAddress || wallet?.address;
      
      if (!address) {
        throw new Error('No wallet address available');
      }

      await this.refreshActivePositions();

      const positions = Array.from(this.activePositions.values());
      
      const totalValue = positions.reduce((sum, pos) => sum + parseFloat(pos.currentValue), 0);
      const totalYield = positions.reduce((sum, pos) => sum + parseFloat(pos.earnedRewards), 0);
      
      const averageApy = positions.length > 0 ? 
        positions.reduce((sum, pos) => sum + pos.apy, 0) / positions.length : 0;

      // Calculate risk distribution
      const riskCounts = positions.reduce((acc, pos) => {
        acc[pos.riskLevel as keyof typeof acc]++;
        return acc;
      }, { low: 0, medium: 0, high: 0 });

      const total = positions.length || 1;
      const riskDistribution = {
        low: (riskCounts.low / total) * 100,
        medium: (riskCounts.medium / total) * 100,
        high: (riskCounts.high / total) * 100
      };

      return {
        totalValue: totalValue.toFixed(4),
        totalYield: totalYield.toFixed(4),
        positions,
        averageApy,
        riskDistribution
      };
    } catch (error) {
      console.error('Error getting portfolio summary:', error);
      return {
        totalValue: '0',
        totalYield: '0',
        positions: [],
        averageApy: 0,
        riskDistribution: { low: 0, medium: 0, high: 0 }
      };
    }
  }

  /**
   * Refresh active positions from blockchain
   */
  private async refreshActivePositions(): Promise<void> {
    // This would query actual blockchain state for each position
    // For now, keep existing positions
    console.log('Refreshing active positions...');
  }

  /**
   * Compound rewards across all positions
   */
  async compoundAllRewards(): Promise<CrossChainYieldResult[]> {
    const results: CrossChainYieldResult[] = [];
    
    for (const position of this.activePositions.values()) {
      if (position.autoCompoundEnabled && parseFloat(position.earnedRewards) > 0) {
        try {
          const result = await this.executeYieldInvestment({
            opportunityId: position.opportunityId,
            chainId: position.chainId,
            amount: position.earnedRewards,
            txType: 'compound'
          });
          results.push(result);
        } catch (error) {
          console.error(`Error compounding rewards for ${position.opportunityId}:`, error);
          results.push({
            success: false,
            chainId: position.chainId,
            amount: position.earnedRewards,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return results;
  }
}

// Export singleton instance
export const crossChainYieldFarming = CrossChainYieldFarming.getInstance();

// Export convenience functions
export const initializeCrossChainYielding = (walletConfig: any) => 
  crossChainYieldFarming.initialize(walletConfig);

export const getCrossChainOpportunities = (filters?: any) => 
  crossChainYieldFarming.getCrossChainYieldOpportunities(filters);

export const executeYieldInvestment = (transaction: CrossChainYieldTransaction) => 
  crossChainYieldFarming.executeYieldInvestment(transaction);

export const getYieldPortfolioSummary = (walletAddress?: string) => 
  crossChainYieldFarming.getPortfolioSummary(walletAddress);

export const compoundAllRewards = () => 
  crossChainYieldFarming.compoundAllRewards();