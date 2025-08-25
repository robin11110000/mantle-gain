'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowUpDown, TrendingUp, DollarSign, Zap } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useWallet } from '@/hooks/useWallet';
import { 
  getBestQuote, 
  executeSwap, 
  getSupportedTokens, 
  initDexAggregator,
  type DexQuote,
  type Token 
} from '@/lib/blockchain/dex-aggregator';

export default function TradingOpportunitiesPage() {
  const { address, isConnected, connectWallet } = useWallet();
  const [supportedTokens, setSupportedTokens] = useState<Token[]>([]);
  const [fromToken, setFromToken] = useState<string>('MNT');
  const [toToken, setToToken] = useState<string>('USDC');
  const [amount, setAmount] = useState<string>('');
  const [quote, setQuote] = useState<DexQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    initializeDex();
    loadSupportedTokens();
  }, []);

  const initializeDex = async () => {
    try {
      await initDexAggregator('testnet');
    } catch (error) {
      console.error('Error initializing DEX aggregator:', error);
      toast({
        title: "Initialization Error",
        description: "Failed to initialize DEX aggregator",
        variant: "destructive",
      });
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
        description: "Please connect your wallet to execute swaps",
        variant: "destructive",
      });
      return;
    }

    setSwapping(true);

    try {
      const txHash = await executeSwap(quote.bestRoute);
      toast({
        title: "Swap Executed",
        description: `Transaction hash: ${txHash}`,
      });
      setQuote(null);
      setAmount('');
    } catch (error: any) {
      console.error('Error executing swap:', error);
      toast({
        title: "Swap Error",
        description: error.message || "Failed to execute swap",
        variant: "destructive",
      });
    } finally {
      setSwapping(false);
    }
  };

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setQuote(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Trading Opportunities</h1>
        <p className="text-gray-600">
          Find the best prices across Mantle Network DEXs and execute optimal trades
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Swap Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Token Swap
            </CardTitle>
            <CardDescription>
              Get the best rates across multiple DEXs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from-token">From</Label>
              <div className="flex gap-2">
                <Select value={fromToken} onValueChange={setFromToken}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedTokens.map((token) => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="amount"
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
                onClick={swapTokens}
                className="rounded-full p-2"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-token">To</Label>
              <Select value={toToken} onValueChange={setToToken}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedTokens.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGetQuote}
              disabled={loading || !amount}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Getting Quote...
                </>
              ) : (
                'Get Best Quote'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quote Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Best Route
            </CardTitle>
            <CardDescription>
              {quote ? 'Ready to execute' : 'Get a quote to see routes'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quote ? (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">You'll receive</span>
                    <span className="text-lg font-semibold text-green-600">
                      {parseFloat(quote.bestRoute.amountOut).toFixed(4)} {quote.toToken.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Best rate on</span>
                    <span className="text-sm font-medium">{quote.bestRoute.protocol}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Price Impact</span>
                    <span className="text-orange-600">{quote.bestRoute.priceImpact}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
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
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Swapping...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Execute Swap
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
                <p>Enter an amount and get a quote to see the best trading routes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Routes */}
      {quote && quote.routes.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Available Routes</CardTitle>
            <CardDescription>
              Compare prices across different DEXs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quote.routes.map((route, index) => (
                <div
                  key={route.id}
                  className={`p-4 border rounded-lg ${
                    route.id === quote.bestRoute.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{route.protocol}</span>
                      {route.id === quote.bestRoute.id && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Best
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {parseFloat(route.amountOut).toFixed(4)} {quote.toToken.symbol}
                      </div>
                      <div className="text-sm text-gray-500">
                        {route.priceImpact}% impact
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}