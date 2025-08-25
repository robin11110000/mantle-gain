import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { mantle, mantleTestnet } from 'viem/chains';

// DEX Aggregator Types
export interface DexRoute {
  id: string;
  protocol: string;
  fromToken: Token;
  toToken: Token;
  amountIn: string;
  amountOut: string;
  price: number;
  priceImpact: number;
  gasEstimate: string;
  route: RouteStep[];
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

export interface RouteStep {
  protocol: string;
  pool: string;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: string;
  amountOut: string;
  fee: number;
}

export interface DexQuote {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  routes: DexRoute[];
  bestRoute: DexRoute;
}

export interface DexTrade {
  route: DexRoute;
  txHash: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: number;
}

// Mantle Network DEXs
const MANTLE_DEXS = {
  merchantMoe: {
    name: 'Merchant Moe',
    router: '0x...', // Actual router address needed
    factory: '0x...',
    fee: 0.3,
    supported: true
  },
  fusionX: {
    name: 'FusionX',
    router: '0x...',
    factory: '0x...',
    fee: 0.25,
    supported: true
  },
  butterSwap: {
    name: 'ButterSwap',
    router: '0x...',
    factory: '0x...',
    fee: 0.3,
    supported: true
  }
};

// Popular tokens on Mantle
const MANTLE_TOKENS: Record<string, Token> = {
  MNT: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'MNT',
    name: 'Mantle',
    decimals: 18,
    logoUri: '/blockchain-logos/mantle.svg'
  },
  USDC: {
    address: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUri: '/token-logos/usdc.svg'
  },
  USDT: {
    address: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoUri: '/token-logos/usdt.svg'
  },
  WETH: {
    address: '0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoUri: '/token-logos/weth.svg'
  }
};

let publicClient: any = null;
let walletClient: any = null;

/**
 * Initialize DEX aggregator clients
 */
export async function initDexAggregator(network: 'mainnet' | 'testnet' = 'testnet') {
  const chain = network === 'mainnet' ? mantle : mantleTestnet;
  const rpcUrl = network === 'mainnet' 
    ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://rpc.mantle.xyz'
    : process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.mantle.xyz';

  publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl)
  });

  if (typeof window !== 'undefined' && window.ethereum) {
    walletClient = createWalletClient({
      chain,
      transport: custom(window.ethereum)
    });
  }

  return { publicClient, walletClient };
}

/**
 * Get supported tokens
 */
export function getSupportedTokens(): Token[] {
  return Object.values(MANTLE_TOKENS);
}

/**
 * Get token by address or symbol
 */
export function getToken(addressOrSymbol: string): Token | undefined {
  if (addressOrSymbol.startsWith('0x')) {
    return Object.values(MANTLE_TOKENS).find(token => 
      token.address.toLowerCase() === addressOrSymbol.toLowerCase()
    );
  }
  return MANTLE_TOKENS[addressOrSymbol.toUpperCase()];
}

/**
 * Get best quote for token swap
 */
export async function getBestQuote(
  fromToken: string,
  toToken: string,
  amount: string
): Promise<DexQuote | null> {
  const fromTokenData = getToken(fromToken);
  const toTokenData = getToken(toToken);
  
  if (!fromTokenData || !toTokenData) {
    throw new Error('Token not supported');
  }

  try {
    // Get quotes from all supported DEXs
    const routes = await Promise.all([
      getRouteFromMerchantMoe(fromTokenData, toTokenData, amount),
      getRouteFromFusionX(fromTokenData, toTokenData, amount),
      getRouteFromButterSwap(fromTokenData, toTokenData, amount)
    ]);

    const validRoutes = routes.filter(Boolean) as DexRoute[];
    
    if (validRoutes.length === 0) {
      return null;
    }

    // Find best route by amount out
    const bestRoute = validRoutes.reduce((best, current) => 
      parseFloat(current.amountOut) > parseFloat(best.amountOut) ? current : best
    );

    return {
      fromToken: fromTokenData,
      toToken: toTokenData,
      fromAmount: amount,
      routes: validRoutes,
      bestRoute
    };
  } catch (error) {
    console.error('Error getting best quote:', error);
    return null;
  }
}

/**
 * Get route from Merchant Moe
 */
async function getRouteFromMerchantMoe(
  fromToken: Token,
  toToken: Token,
  amount: string
): Promise<DexRoute | null> {
  try {
    // Mock implementation - replace with actual DEX API calls
    const mockAmountOut = (parseFloat(amount) * 0.998).toString(); // 0.2% slippage
    
    return {
      id: `merchant-moe-${Date.now()}`,
      protocol: 'Merchant Moe',
      fromToken,
      toToken,
      amountIn: amount,
      amountOut: mockAmountOut,
      price: parseFloat(mockAmountOut) / parseFloat(amount),
      priceImpact: 0.2,
      gasEstimate: '150000',
      route: [{
        protocol: 'Merchant Moe',
        pool: '0x...',
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: amount,
        amountOut: mockAmountOut,
        fee: 0.3
      }]
    };
  } catch (error) {
    console.error('Error getting Merchant Moe route:', error);
    return null;
  }
}

/**
 * Get route from FusionX
 */
async function getRouteFromFusionX(
  fromToken: Token,
  toToken: Token,
  amount: string
): Promise<DexRoute | null> {
  try {
    // Mock implementation
    const mockAmountOut = (parseFloat(amount) * 0.9975).toString(); // 0.25% slippage
    
    return {
      id: `fusion-x-${Date.now()}`,
      protocol: 'FusionX',
      fromToken,
      toToken,
      amountIn: amount,
      amountOut: mockAmountOut,
      price: parseFloat(mockAmountOut) / parseFloat(amount),
      priceImpact: 0.25,
      gasEstimate: '140000',
      route: [{
        protocol: 'FusionX',
        pool: '0x...',
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: amount,
        amountOut: mockAmountOut,
        fee: 0.25
      }]
    };
  } catch (error) {
    console.error('Error getting FusionX route:', error);
    return null;
  }
}

/**
 * Get route from ButterSwap
 */
async function getRouteFromButterSwap(
  fromToken: Token,
  toToken: Token,
  amount: string
): Promise<DexRoute | null> {
  try {
    // Mock implementation
    const mockAmountOut = (parseFloat(amount) * 0.997).toString(); // 0.3% slippage
    
    return {
      id: `butter-swap-${Date.now()}`,
      protocol: 'ButterSwap',
      fromToken,
      toToken,
      amountIn: amount,
      amountOut: mockAmountOut,
      price: parseFloat(mockAmountOut) / parseFloat(amount),
      priceImpact: 0.3,
      gasEstimate: '160000',
      route: [{
        protocol: 'ButterSwap',
        pool: '0x...',
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: amount,
        amountOut: mockAmountOut,
        fee: 0.3
      }]
    };
  } catch (error) {
    console.error('Error getting ButterSwap route:', error);
    return null;
  }
}

/**
 * Execute swap transaction
 */
export async function executeSwap(route: DexRoute): Promise<string> {
  if (!walletClient) {
    throw new Error('Wallet not connected');
  }

  try {
    // Get router address for the protocol
    const dexConfig = Object.values(MANTLE_DEXS).find(
      dex => dex.name === route.protocol
    );
    
    if (!dexConfig) {
      throw new Error(`DEX ${route.protocol} not supported`);
    }

    const amountIn = ethers.parseUnits(route.amountIn, route.fromToken.decimals);
    const amountOutMin = ethers.parseUnits(
      (parseFloat(route.amountOut) * 0.95).toString(), // 5% slippage tolerance
      route.toToken.decimals
    );

    // Execute swap transaction
    const { hash } = await walletClient.writeContract({
      address: dexConfig.router as `0x${string}`,
      abi: [
        {
          name: 'swapExactTokensForTokens',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'amountIn', type: 'uint256' },
            { name: 'amountOutMin', type: 'uint256' },
            { name: 'path', type: 'address[]' },
            { name: 'to', type: 'address' },
            { name: 'deadline', type: 'uint256' }
          ],
          outputs: [{ name: 'amounts', type: 'uint256[]' }]
        }
      ],
      functionName: 'swapExactTokensForTokens',
      args: [
        amountIn.toString(),
        amountOutMin.toString(),
        [route.fromToken.address, route.toToken.address],
        walletClient.account.address,
        Math.floor(Date.now() / 1000) + 1200 // 20 minutes deadline
      ]
    });

    return hash;
  } catch (error) {
    console.error('Error executing swap:', error);
    throw error;
  }
}

/**
 * Get token balance
 */
export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
  if (!publicClient) {
    throw new Error('Public client not initialized');
  }

  try {
    // Native token (MNT)
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      const balance = await publicClient.getBalance({
        address: walletAddress as `0x${string}`
      });
      return ethers.formatEther(balance.toString());
    }

    // ERC20 token
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
      args: [walletAddress as `0x${string}`]
    });

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
    return '0';
  }
}

/**
 * Get transaction history for an address
 */
export async function getTransactionHistory(address: string): Promise<any[]> {
  if (!publicClient) {
    throw new Error('Public client not initialized');
  }

  try {
    // This would typically query a block explorer API or indexing service
    // For now, return mock data
    return [
      {
        hash: '0x123...',
        from: address,
        to: '0x456...',
        value: '1000000000000000000',
        timestamp: Date.now() - 3600000,
        status: 'success',
        type: 'swap',
        tokenIn: 'MNT',
        tokenOut: 'USDC',
        amountIn: '1.0',
        amountOut: '1850.25'
      }
    ];
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}