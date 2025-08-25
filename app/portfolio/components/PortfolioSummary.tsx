'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, TrendingUp, Wallet, Clock, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatPercent } from '@/lib/utils';
import { 
  getSupportedTokens, 
  getTokenBalance, 
  initDexAggregator,
  type Token 
} from '@/lib/blockchain/dex-aggregator';

interface TokenBalance {
  token: Token;
  balance: string;
  balanceUSD: number;
}

interface PortfolioSummaryProps {
  compact?: boolean;
  onValueCalculated?: (totalValue: number) => void;
}

export function PortfolioSummary({ 
  compact = false,
  onValueCalculated 
}: PortfolioSummaryProps) {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [totalValueUSD, setTotalValueUSD] = useState(0);
  const [supportedTokens, setSupportedTokens] = useState<Token[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    initializeDexAggregator();
    loadSupportedTokens();
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    loadWalletBalances();
  }, [isConnected, address, supportedTokens]);

  const initializeDexAggregator = async () => {
    try {
      await initDexAggregator('testnet');
    } catch (error) {
      console.error('Error initializing DEX aggregator:', error);
    }
  };

  const loadSupportedTokens = () => {
    const tokens = getSupportedTokens();
    setSupportedTokens(tokens);
  };

  const loadWalletBalances = async () => {
    if (!address || supportedTokens.length === 0) return;
    
    try {
      setLoading(true);
      
      // Get balances for all supported tokens
      const tokenBalances = await Promise.all(
        supportedTokens.map(async (token) => {
          try {
            const balance = await getTokenBalance(token.address, address);
            const balanceNum = parseFloat(balance);
            
            // Mock price for USD conversion (in production, you'd fetch real prices)
            const mockPrice = getMockPrice(token.symbol);
            const balanceUSD = balanceNum * mockPrice;
            
            return {
              token,
              balance,
              balanceUSD
            };
          } catch (error) {
            console.error(`Error fetching balance for ${token.symbol}:`, error);
            return {
              token,
              balance: '0',
              balanceUSD: 0
            };
          }
        })
      );

      // Filter out zero balances
      const nonZeroBalances = tokenBalances.filter(tb => parseFloat(tb.balance) > 0);
      setBalances(nonZeroBalances);
      
      // Calculate portfolio totals
      const totalValue = nonZeroBalances.reduce((sum, tb) => sum + tb.balanceUSD, 0);
      setTotalValueUSD(totalValue);
      
      // Notify parent component about the calculated value
      if (onValueCalculated) {
        onValueCalculated(totalValue);
      }
      
      // Prepare asset allocation data for charts
      const chartDataArray = nonZeroBalances.map((tb) => ({
        name: tb.token.symbol,
        value: tb.balanceUSD,
        percentage: (tb.balanceUSD / totalValue * 100).toFixed(2)
      }));
      
      setChartData(chartDataArray);
      
    } catch (error) {
      console.error('Error loading wallet balances:', error);
      toast({
        title: "Error Loading Portfolio",
        description: "Failed to load your wallet balances",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Mock function to get token prices
  // In a real app, this would be replaced with price oracle or API call
  const getMockPrice = (symbol: string): number => {
    const prices: Record<string, number> = {
      'USDC': 1,
      'USDT': 1,
      'DAI': 1,
      'ETH': 2000,
      'DOT': 8,
      'ASTR': 0.5,
      'WBTC': 40000,
    };
    
    return prices[symbol] || 1; // Default to 1 if symbol not found
  };
  
  const handleWithdraw = async (position: PositionData) => {
    try {
      setLoading(true);
      await withdrawFromStrategy(
        position.strategy,
        position.asset,
        position.amount
      );
      
      toast({
        title: "Withdrawal Successful",
        description: `Successfully withdrew ${position.formattedAmount} ${position.strategyDetails.assetSymbol}`,
      });
      
      // Reload portfolio after withdraw
      loadPortfolio();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: "There was an error processing your withdrawal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleClaimRewards = async (position: PositionData) => {
    try {
      setLoading(true);
      await claimRewards(position.strategy);
      
      toast({
        title: "Rewards Claimed",
        description: "Successfully claimed rewards from strategy",
      });
      
      // Reload portfolio after claiming rewards
      loadPortfolio();
    } catch (error) {
      console.error('Claim rewards error:', error);
      toast({
        title: "Failed to Claim Rewards",
        description: "There was an error claiming your rewards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleInvestMore = () => {
    router.push('/yield-opportunities');
  };
  
  // Format currency display
  const formatUSD = (value: number) => {
    return formatCurrency(value);
  };
  
  // Format APY
  const formatAPY = (apy: number) => {
    return formatPercent(apy / 10000);
  };
  
  // Calculate time in strategy
  const getTimeInStrategy = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const secondsElapsed = now - timestamp;
    const days = Math.floor(secondsElapsed / 86400);
    
    if (days < 1) {
      const hours = Math.floor(secondsElapsed / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wallet not connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to view your portfolio.
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="space-y-4">
          {!compact && <Skeleton className="h-12 w-1/3" />}
          <Skeleton className="h-[200px] w-full" />
          {!compact && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="h-[100px] w-full" />
            </div>
          )}
        </div>
      ) : (
        <>
          {!compact && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Portfolio Value</CardDescription>
                  <CardTitle className="text-2xl">{formatUSD(totalValueUSD)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Wallet className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500">
                      {positions.length} active position{positions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Estimated Annual Yield</CardDescription>
                  <CardTitle className="text-2xl text-green-600">{formatUSD(totalYieldUSD)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm text-gray-500">
                      {totalValueUSD > 0 
                        ? formatPercent(totalYieldUSD / totalValueUSD) + ' average' 
                        : '0% APY average'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Asset Allocation</CardDescription>
                  <CardTitle className="text-2xl">{chartData.length} Asset{chartData.length !== 1 ? 's' : ''}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {chartData.slice(0, 3).map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <span>{item.name}</span>
                        <span>{item.percentage}%</span>
                      </div>
                    ))}
                    {chartData.length > 3 && (
                      <div className="text-xs text-gray-500 text-right">
                        +{chartData.length - 3} more assets
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Wallet Balances</CardTitle>
                  <CardDescription>Your token balances available for trading</CardDescription>
                </div>
                {!compact && <Button onClick={() => router.push('/opportunities')}>Start Trading</Button>}
              </div>
            </CardHeader>
            <CardContent>
              {balances.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-lg font-medium">No token balances</h3>
                  <p className="text-gray-500 mt-2">
                    Your wallet doesn't have any tokens on Mantle Network
                  </p>
                  <Button 
                    onClick={() => router.push('/opportunities')}
                    className="mt-4"
                    variant="outline"
                  >
                    Explore Trading Opportunities
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {balances.map((tokenBalance, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {tokenBalance.token.logoUri && (
                            <img 
                              src={tokenBalance.token.logoUri} 
                              alt={tokenBalance.token.symbol}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <h3 className="text-lg font-medium">
                              {tokenBalance.token.name}
                            </h3>
                            <p className="text-gray-500">{tokenBalance.token.symbol}</p>
                          </div>
                        </div>
                        <div className="mt-2 md:mt-0 flex items-center">
                          <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm font-medium">
                            Available for Trading
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Balance</div>
                          <div className="font-medium">
                            {parseFloat(tokenBalance.balance).toFixed(6)} {tokenBalance.token.symbol}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">USD Value</div>
                          <div className="font-medium">
                            {formatUSD(tokenBalance.balanceUSD)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">Portfolio %</div>
                          <div className="font-medium">
                            {totalValueUSD > 0 ? ((tokenBalance.balanceUSD / totalValueUSD) * 100).toFixed(1) : 0}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push('/opportunities')}
                        >
                          Trade
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
