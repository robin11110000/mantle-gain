import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, custom, http, Chain } from 'viem';
import { mantle, mantleTestnet } from 'viem/chains';
import { injected } from '@wagmi/connectors';

// Para Embedded Wallet Integration Types
interface ParaWalletConfig {
  apiKey: string;
  environment: 'development' | 'production';
  chainId: number;
}

interface ParaEmbeddedWallet {
  address: string;
  isConnected: boolean;
  provider: ethers.Provider;
  signer: ethers.Signer;
}

// Orby Chain Abstraction Types
interface OrbyChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  yieldProtocols: YieldProtocol[];
}

interface YieldProtocol {
  name: string;
  protocol: string;
  contractAddress: string;
  tokenSymbol: string;
  apy: number;
  tvl: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// Multi-chain Yield Opportunity
interface MultiChainYieldOpportunity {
  id: string;
  protocol: string;
  chainId: number;
  chainName: string;
  tokenSymbol: string;
  apy: number;
  tvl: string;
  contractAddress: string;
  riskLevel: 'low' | 'medium' | 'high';
  category: 'lending' | 'farming' | 'staking' | 'liquidity';
  autoCompoundAvailable: boolean;
  minimumDeposit: string;
}

// Mantle API Configuration
const MANTLE_CHAINS: Record<string, OrbyChainConfig> = {
  mainnet: {
    chainId: 5000,
    name: 'Mantle',
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://rpc.mantle.xyz',
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18
    },
    blockExplorer: 'https://explorer.mantle.xyz',
    yieldProtocols: []
  },
  testnet: {
    chainId: 5003,
    name: 'Mantle Sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.mantle.xyz',
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18
    },
    blockExplorer: 'https://explorer.sepolia.mantle.xyz',
    yieldProtocols: []
  }
};

// Singleton instances
let paraWallet: ParaEmbeddedWallet | null = null;
let publicClient: any = null;
let walletClient: any = null;

/**
 * Initialize Para Embedded Wallet
 * @param config Para wallet configuration
 * @returns Para wallet instance
 */
export async function initParaWallet(config: ParaWalletConfig): Promise<ParaEmbeddedWallet> {
  if (paraWallet && paraWallet.isConnected) return paraWallet;

  try {
    // Para Embedded Wallet SDK initialization
    const ParaSDK = await import('@para-wallet/sdk').catch(() => null);
    
    if (!ParaSDK) {
      // Fallback to MetaMask/injected wallet if Para SDK not available
      console.warn('Para SDK not available, falling back to injected wallet');
      return await initFallbackWallet();
    }

    const para = new ParaSDK.ParaWallet({
      apiKey: config.apiKey,
      environment: config.environment,
      chainId: config.chainId,
      appName: 'Mantle-Gain',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    });

    await para.connect();
    
    const provider = new ethers.BrowserProvider(para.provider);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    paraWallet = {
      address,
      isConnected: true,
      provider,
      signer
    };

    return paraWallet;
  } catch (error) {
    console.error('Error initializing Para wallet:', error);
    return await initFallbackWallet();
  }
}

/**
 * Initialize fallback wallet (MetaMask/injected)
 */
async function initFallbackWallet(): Promise<ParaEmbeddedWallet> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet provider available');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    paraWallet = {
      address,
      isConnected: true,
      provider,
      signer
    };

    return paraWallet;
  } catch (error) {
    console.error('Error initializing fallback wallet:', error);
    throw error;
  }
}

/**
 * Initialize Mantle Network clients with Orby chain abstraction
 * @param network 'mainnet' or 'testnet'
 * @returns Initialized clients
 */
export async function initMantleClients(network: 'mainnet' | 'testnet' = 'testnet') {
  const chainConfig = MANTLE_CHAINS[network];
  const chain = network === 'mainnet' ? mantle : mantleTestnet;

  // Initialize public client for reading blockchain data
  publicClient = createPublicClient({
    chain,
    transport: http(chainConfig.rpcUrl)
  });

  // Initialize wallet client if Para wallet is available
  if (paraWallet && paraWallet.isConnected) {
    walletClient = createWalletClient({
      chain,
      transport: custom(paraWallet.provider.provider || window.ethereum),
      account: paraWallet.address as `0x${string}`
    });
  }

  return { publicClient, walletClient, chainConfig };
}

/**
 * Get current Para wallet instance
 */
export function getParaWallet(): ParaEmbeddedWallet | null {
  return paraWallet;
}

/**
 * Disconnect Para wallet
 */
export async function disconnectParaWallet(): Promise<void> {
  if (paraWallet) {
    try {
      // If Para SDK is available, use proper disconnect
      const ParaSDK = await import('@para-wallet/sdk').catch(() => null);
      if (ParaSDK && paraWallet.provider.disconnect) {
        await paraWallet.provider.disconnect();
      }
    } catch (error) {
      console.error('Error disconnecting Para wallet:', error);
    }
    
    paraWallet = null;
    publicClient = null;
    walletClient = null;
  }
}

/**
 * Orby Chain Abstraction: Get unified chain information
 * @param chainId Chain ID to get info for
 * @returns Chain configuration
 */
export function getChainInfo(chainId?: number): OrbyChainConfig {
  const targetChainId = chainId || (process.env.NEXT_PUBLIC_CHAIN_ID ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) : 5003);
  
  for (const [key, config] of Object.entries(MANTLE_CHAINS)) {
    if (config.chainId === targetChainId) {
      return config;
    }
  }
  
  // Default to testnet
  return MANTLE_CHAINS.testnet;
}

/**
 * Get native token balance for connected wallet
 * @param address Wallet address (optional, uses connected wallet)
 * @returns Balance in formatted units
 */
export async function getNativeBalance(address?: string): Promise<string> {
  if (!publicClient) {
    throw new Error('Public client not initialized');
  }

  const walletAddress = address || paraWallet?.address;
  if (!walletAddress) {
    throw new Error('No wallet address available');
  }

  try {
    const balance = await publicClient.getBalance({
      address: walletAddress as `0x${string}`
    });
    
    return ethers.formatEther(balance.toString());
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw error;
  }
}

/**
 * Get ERC20 token balance
 * @param tokenAddress ERC20 token contract address
 * @param walletAddress Wallet address (optional)
 * @returns Token balance in formatted units
 */
export async function getTokenBalance(tokenAddress: string, walletAddress?: string): Promise<string> {
  if (!publicClient) {
    throw new Error('Public client not initialized');
  }

  const address = walletAddress || paraWallet?.address;
  if (!address) {
    throw new Error('No wallet address available');
  }

  try {
    const balance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }]
        }
      ],
      functionName: 'balanceOf',
      args: [address as `0x${string}`]
    });

    // Get token decimals
    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: [
        {
          name: 'decimals',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint8' }]
        }
      ],
      functionName: 'decimals'
    });

    return ethers.formatUnits(balance.toString(), decimals);
  } catch (error) {
    console.error('Error fetching token balance:', error);
    throw error;
  }
}

/**
 * Multi-chain yield aggregation: Fetch all available yield opportunities
 * @returns Array of yield opportunities across supported chains
 */
export async function fetchMultiChainYieldOpportunities(): Promise<MultiChainYieldOpportunity[]> {
  const opportunities: MultiChainYieldOpportunities[] = [];

  try {
    // Fetch opportunities from Mantle Network DeFi protocols
    const mantleOpportunities = await fetchMantleYieldOpportunities();
    opportunities.push(...mantleOpportunities);

    // Future: Add other chains supported by Orby abstraction
    // const polygonOpportunities = await fetchPolygonYieldOpportunities();
    // const arbitrumOpportunities = await fetchArbitrumYieldOpportunities();

    // Sort by APY descending
    return opportunities.sort((a, b) => b.apy - a.apy);
  } catch (error) {
    console.error('Error fetching multi-chain yield opportunities:', error);
    return [];
  }
}

/**
 * Fetch Mantle Network specific yield opportunities
 */
async function fetchMantleYieldOpportunities(): Promise<MultiChainYieldOpportunity[]> {
  const chainInfo = getChainInfo();
  
  // Mock data for Mantle DeFi protocols
  // In production, this would fetch from actual protocol APIs
  const mantleProtocols: MultiChainYieldOpportunity[] = [
    {
      id: 'mantle-merchant-moe-mnt-usdc',
      protocol: 'Merchant Moe',
      chainId: chainInfo.chainId,
      chainName: chainInfo.name,
      tokenSymbol: 'MNT-USDC LP',
      apy: 15.2,
      tvl: '$2.1M',
      contractAddress: '0x...', // Would be actual contract address
      riskLevel: 'medium',
      category: 'farming',
      autoCompoundAvailable: true,
      minimumDeposit: '100'
    },
    {
      id: 'mantle-fusionx-mnt',
      protocol: 'FusionX',
      chainId: chainInfo.chainId,
      chainName: chainInfo.name,
      tokenSymbol: 'MNT',
      apy: 8.7,
      tvl: '$5.4M',
      contractAddress: '0x...', // Would be actual contract address
      riskLevel: 'low',
      category: 'staking',
      autoCompoundAvailable: false,
      minimumDeposit: '50'
    },
    {
      id: 'mantle-dolomite-usdc',
      protocol: 'Dolomite',
      chainId: chainInfo.chainId,
      chainName: chainInfo.name,
      tokenSymbol: 'USDC',
      apy: 6.3,
      tvl: '$8.9M',
      contractAddress: '0x...', // Would be actual contract address
      riskLevel: 'low',
      category: 'lending',
      autoCompoundAvailable: true,
      minimumDeposit: '10'
    }
  ];

  return mantleProtocols;
}

/**
 * Execute yield farming transaction with Orby abstraction
 * @param opportunityId Yield opportunity ID
 * @param amount Amount to invest
 * @param autoCompound Enable auto-compounding
 * @returns Transaction result
 */
export async function executeYieldTransaction(
  opportunityId: string,
  amount: string,
  autoCompound: boolean = false
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!walletClient || !paraWallet) {
    throw new Error('Wallet not connected');
  }

  try {
    // Get opportunity details
    const opportunities = await fetchMultiChainYieldOpportunities();
    const opportunity = opportunities.find(o => o.id === opportunityId);
    
    if (!opportunity) {
      throw new Error('Yield opportunity not found');
    }

    // Convert amount to wei
    const amountWei = ethers.parseEther(amount);

    // Execute transaction based on category
    let txHash: string;
    
    switch (opportunity.category) {
      case 'staking':
        txHash = await executeStakingTransaction(opportunity, amountWei, autoCompound);
        break;
      case 'farming':
        txHash = await executeFarmingTransaction(opportunity, amountWei, autoCompound);
        break;
      case 'lending':
        txHash = await executeLendingTransaction(opportunity, amountWei, autoCompound);
        break;
      case 'liquidity':
        txHash = await executeLiquidityTransaction(opportunity, amountWei, autoCompound);
        break;
      default:
        throw new Error(`Unsupported yield category: ${opportunity.category}`);
    }

    return { success: true, txHash };
  } catch (error: any) {
    console.error('Error executing yield transaction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Execute staking transaction
 */
async function executeStakingTransaction(
  opportunity: MultiChainYieldOpportunity,
  amount: ethers.BigNumber,
  autoCompound: boolean
): Promise<string> {
  const { hash } = await walletClient.writeContract({
    address: opportunity.contractAddress as `0x${string}`,
    abi: [
      {
        name: 'stake',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: 'amount', type: 'uint256' },
          { name: 'autoCompound', type: 'bool' }
        ],
        outputs: []
      }
    ],
    functionName: 'stake',
    args: [amount.toString(), autoCompound],
    value: opportunity.tokenSymbol === 'MNT' ? amount : undefined
  });

  return hash;
}

/**
 * Execute farming transaction
 */
async function executeFarmingTransaction(
  opportunity: MultiChainYieldOpportunity,
  amount: ethers.BigNumber,
  autoCompound: boolean
): Promise<string> {
  const { hash } = await walletClient.writeContract({
    address: opportunity.contractAddress as `0x${string}`,
    abi: [
      {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'amount', type: 'uint256' },
          { name: 'autoCompound', type: 'bool' }
        ],
        outputs: []
      }
    ],
    functionName: 'deposit',
    args: [amount.toString(), autoCompound]
  });

  return hash;
}

/**
 * Execute lending transaction
 */
async function executeLendingTransaction(
  opportunity: MultiChainYieldOpportunity,
  amount: ethers.BigNumber,
  autoCompound: boolean
): Promise<string> {
  const { hash } = await walletClient.writeContract({
    address: opportunity.contractAddress as `0x${string}`,
    abi: [
      {
        name: 'supply',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'amount', type: 'uint256' },
          { name: 'autoCompound', type: 'bool' }
        ],
        outputs: []
      }
    ],
    functionName: 'supply',
    args: [amount.toString(), autoCompound]
  });

  return hash;
}

/**
 * Execute liquidity provision transaction
 */
async function executeLiquidityTransaction(
  opportunity: MultiChainYieldOpportunity,
  amount: ethers.BigNumber,
  autoCompound: boolean
): Promise<string> {
  const { hash } = await walletClient.writeContract({
    address: opportunity.contractAddress as `0x${string}`,
    abi: [
      {
        name: 'addLiquidity',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: 'amount', type: 'uint256' },
          { name: 'autoCompound', type: 'bool' }
        ],
        outputs: []
      }
    ],
    functionName: 'addLiquidity',
    args: [amount.toString(), autoCompound],
    value: opportunity.tokenSymbol.includes('MNT') ? amount : undefined
  });

  return hash;
}

/**
 * Get transaction status and details
 * @param txHash Transaction hash
 * @returns Transaction receipt
 */
export async function getTransactionStatus(txHash: string) {
  if (!publicClient) {
    throw new Error('Public client not initialized');
  }

  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`
    });

    return {
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
      logs: receipt.logs
    };
  } catch (error) {
    console.error('Error getting transaction status:', error);
    throw error;
  }
}