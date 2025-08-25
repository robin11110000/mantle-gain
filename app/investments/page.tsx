'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowUpDown, 
  TrendingUp,
  ArrowUpRight,
  Clock,
  Filter,
  Search,
  BarChart,
  DollarSign,
  Zap
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  getBestQuote, 
  executeSwap, 
  getSupportedTokens, 
  initDexAggregator,
  type DexQuote,
  type Token,
  type DexTrade 
} from '@/lib/blockchain/dex-aggregator';
import { toast } from '@/components/ui/use-toast';

export default function TradingPage() {
  const { address, isConnected, connectWallet } = useWallet();
  const [supportedTokens, setSupportedTokens] = useState<Token[]>([]);
  const [recentTrades, setRecentTrades] = useState<DexTrade[]>([]);
  const [fromToken, setFromToken] = useState<string>('MNT');
  const [toToken, setToToken] = useState<string>('USDC');
  const [amount, setAmount] = useState<string>('');
  const [quote, setQuote] = useState<DexQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [activeTab, setActiveTab] = useState('trade');

  useEffect(() => {
    initializeDex();
    loadSupportedTokens();
  }, []);

  const initializeDex = async () => {
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

  const handleGetQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setQuote(null);

    try {
      const quoteResult = await getBestQuote(fromToken, toToken, amount);
      if (quoteResult) {
        setQuote(quoteResult);
      } else {
        toast({
          title: "No Routes Found",
          description: "No trading routes available for this token pair",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error getting quote:', error);
      toast({
        title: "Quote Error",
        description: error.message || "Failed to get quote",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!quote || !isConnected) {
      toast({
        title: "Connection Required",
        description: "Please connect your wallet to execute trades",
        variant: "destructive",
      });
      return;
    }

    setSwapping(true);

    try {
      const txHash = await executeSwap(quote.bestRoute);
      
      // Add to recent trades
      const newTrade: DexTrade = {
        route: quote.bestRoute,
        txHash,
        status: 'pending',
        timestamp: Date.now()
      };
      
      setRecentTrades(prev => [newTrade, ...prev]);
      
      toast({
        title: "Trade Executed",
        description: `Transaction hash: ${txHash}`,
      });
      
      setQuote(null);
      setAmount('');
    } catch (error: any) {
      console.error('Error executing swap:', error);
      toast({
        title: "Trade Error",
        description: error.message || "Failed to execute trade",
        variant: "destructive",
      });
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Trading Hub</h1>
          <p className="text-muted-foreground">
            Execute trades and manage your trading activity on Mantle Network
          </p>
        </div>
        
        {!isConnected && (
          <Button onClick={connectWallet} variant="outline">
            Connect Wallet
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8">
          <TabsTrigger value="trade">Quick Trade</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Trading</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="trade" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Quick Trade Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpDown className="h-5 w-5" />
                  Quick Trade
                </CardTitle>
                <CardDescription>
                  Instantly swap tokens at the best available rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <div className="flex gap-2">
                    <select 
                      value={fromToken} 
                      onChange={(e) => setFromToken(e.target.value)}
                      className="w-32 p-2 border rounded"
                    >
                      {supportedTokens.map((token) => (
                        <option key={token.symbol} value={token.symbol}>
                          {token.symbol}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const temp = fromToken;
                      setFromToken(toToken);
                      setToToken(temp);
                      setQuote(null);
                    }}
                    className="rounded-full p-2"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>To</Label>
                  <select 
                    value={toToken} 
                    onChange={(e) => setToToken(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    {supportedTokens.map((token) => (
                      <option key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleGetQuote}
                  disabled={loading || !amount}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin mr-2" />
                      Getting Best Price...
                    </>
                  ) : (
                    'Get Best Price'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quote Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Best Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quote ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">You'll get</span>
                        <span className="text-lg font-semibold text-green-600">
                          {parseFloat(quote.bestRoute.amountOut).toFixed(4)} {quote.toToken.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Via</span>
                        <span className="text-sm font-medium">{quote.bestRoute.protocol}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Price Impact</span>
                        <span className="text-orange-600">{quote.bestRoute.priceImpact}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Est. Gas</span>
                        <span>{quote.bestRoute.gasEstimate}</span>
                      </div>
                    </div>

                    {isConnected ? (
                      <Button
                        onClick={handleSwap}
                        disabled={swapping}
                        className="w-full"
                        size="lg"
                      >
                        {swapping ? (
                          <>
                            <Clock className="h-4 w-4 animate-spin mr-2" />
                            Executing Trade...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Execute Trade
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button onClick={connectWallet} className="w-full" size="lg">
                        Connect Wallet
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter trade details to see the best available rates</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Trading Features</CardTitle>
              <CardDescription>
                Coming soon: Limit orders, stop losses, and advanced chart analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="py-8 text-center text-gray-500">
              <BarChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Advanced trading features are under development</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Trades
              </CardTitle>
              <CardDescription>
                Your trading history on Mantle Network
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTrades.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trades yet. Start trading to see your history here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTrades.map((trade, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            {trade.route.fromToken.symbol} → {trade.route.toToken.symbol}
                          </div>
                          <div className="text-sm text-gray-500">
                            Via {trade.route.protocol}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {parseFloat(trade.route.amountOut).toFixed(4)} {trade.route.toToken.symbol}
                          </div>
                          <Badge variant={trade.status === 'success' ? 'default' : 'secondary'}>
                            {trade.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}