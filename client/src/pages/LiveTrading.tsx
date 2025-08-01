import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Pause, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Trade, Strategy, SMCSignal } from '@shared/schema';
import Sidebar from '@/components/Sidebar';
import BrokerIntegration from '@/components/BrokerIntegration';

export default function LiveTrading() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isStrategyActive, setIsStrategyActive] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<Array<{time: number, price: number}>>([]);

  // Fetch current price for chart
  const { data: priceData } = useQuery({
    queryKey: ['/api/market-data/EURUSD/price'],
    refetchInterval: 1000,
  });

  const { isConnected, subscribe } = useWebSocket('/ws');

  const { data: activeTrades } = useQuery<Trade[]>({
    queryKey: ['/api/trades/active'],
    refetchInterval: 2000,
  });

  // Use broker positions as the primary source for live trading
  const { data: brokerPositions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ['/api/broker/positions'],
    refetchInterval: 1000,
  });

  const { data: brokerAccount, isLoading: accountLoading } = useQuery({
    queryKey: ['/api/broker/account'],
    refetchInterval: 1000,
  });

  const { data: strategies } = useQuery<Strategy[]>({
    queryKey: ['/api/strategies'],
  });

  const { data: signals } = useQuery<SMCSignal[]>({
    queryKey: ['/api/smc-signals'],
    refetchInterval: 5000,
  });

  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  // Update price history when price data changes
  useEffect(() => {
    if (priceData?.price) {
      setCurrentPrice(priceData.price);
      setPriceHistory(prev => [
        ...prev.slice(-50), // Keep last 50 points
        { time: Date.now(), price: priceData.price }
      ]);
    }
  }, [priceData]);

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    subscribe('market_data_update', (data) => {
      setCurrentPrice(data.price);
      setPriceHistory(prev => [
        ...prev.slice(-50), // Keep last 50 points
        { time: Date.now(), price: data.price }
      ]);
    });

    subscribe('strategy_started', () => {
      setIsStrategyActive(true);
    });

    subscribe('strategy_stopped', () => {
      setIsStrategyActive(false);
    });

    subscribe('trade_opened', (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades/active'] });
      toast({
        title: "🔔 Trade Opened",
        description: `${data.trade.type} ${data.trade.pair} at ${data.trade.entryPrice}`,
      });
    });

    subscribe('trade_closed', (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades/active'] });
      const pnl = data.trade.pnl ?? 0;
      const pnlEmoji = pnl >= 0 ? '💰' : '📉';
      toast({
        title: `${pnlEmoji} Trade Closed`,
        description: `P&L: $${pnl.toFixed(2)}`,
      });
    });
  }, [subscribe, queryClient, toast]);

  const startStrategyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/strategy/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId: 1 }),
      });
      
      if (!response.ok) throw new Error('Failed to start strategy');
      return response.json();
    },
    onSuccess: () => {
      setIsStrategyActive(true);
      toast({
        title: "Strategy Started",
        description: "Live trading strategy is now active",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start trading strategy",
        variant: "destructive",
      });
    },
  });

  const stopStrategyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/strategy/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to stop strategy');
      return response.json();
    },
    onSuccess: () => {
      setIsStrategyActive(false);
      toast({
        title: "Strategy Stopped",
        description: "Live trading strategy has been paused",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to stop trading strategy",
        variant: "destructive",
      });
    },
  });

  const calculateTotalPnL = () => {
    if (!brokerPositions || brokerPositions.length === 0) return 0;
    const total = brokerPositions.reduce((total, position) => {
      return total + (position.pnl || 0);
    }, 0);
    return total;
  };

  const calculateDaysPnL = () => {
    // Simplified calculation - in real app would filter by today's trades
    return calculateTotalPnL();
  };

  // Check if strategy should be active based on open positions
  const hasActivePositions = brokerPositions && brokerPositions.length > 0;
  const actualStrategyStatus = hasActivePositions;

  // Calculate additional metrics
  const totalMarginUsed = brokerAccount?.margin || 0;
  const marginLevel = brokerAccount?.marginLevel || 0;
  const totalEquity = brokerAccount?.equity || 10000;

  return (
    <>
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Live Trading</h1>
            <p className="text-muted-foreground">Real-time algorithmic trading with SMC strategies</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <Button
              onClick={() => isStrategyActive ? stopStrategyMutation.mutate() : startStrategyMutation.mutate()}
              disabled={startStrategyMutation.isPending || stopStrategyMutation.isPending}
              className={isStrategyActive ? "trading-button-danger" : "trading-button-success"}
            >
              {isStrategyActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isStrategyActive ? 'Stop Strategy' : 'Start Strategy'}
            </Button>
          </div>
        </div>

        {/* Enhanced Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Account Balance</p>
                  <p className="text-xl font-bold">
                    {accountLoading ? 'Loading...' : `$${(brokerAccount?.accountBalance || 10000).toFixed(2)}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Active Trades</p>
                  <p className="text-xl font-bold">
                    {positionsLoading ? 'Loading...' : (brokerPositions?.length || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Today's P&L</p>
                  <p className={`text-xl font-bold ${calculateDaysPnL() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {calculateDaysPnL() >= 0 ? '+' : ''}${calculateDaysPnL().toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Strategy Status</p>
                  <Badge className={actualStrategyStatus ? 'status-indicator buy' : 'status-indicator sell'}>
                    {actualStrategyStatus ? 'ACTIVE' : 'STOPPED'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Equity</p>
                  <p className="text-xl font-bold">
                    {accountLoading ? 'Loading...' : `$${(brokerAccount?.equity || 10000).toFixed(2)}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Free Margin</p>
                  <p className="text-xl font-bold">
                    {accountLoading ? 'Loading...' : `$${(brokerAccount?.freeMargin || 10000).toFixed(2)}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Chart */}
          <Card className="trading-card">
            <CardHeader>
              <CardTitle>EURUSD Live Price</CardTitle>
              <p className="text-2xl font-mono font-bold">{currentPrice.toFixed(5)}</p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time" 
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                    />
                    <YAxis domain={['dataMin - 0.001', 'dataMax + 0.001']} />
                    <Tooltip 
                      labelFormatter={(time) => new Date(time).toLocaleTimeString()}
                      formatter={(value) => [Number(value).toFixed(5), 'Price']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Active Trades */}
          <Card className="trading-card">
            <CardHeader>
              <CardTitle>Active Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {(!brokerPositions || brokerPositions?.length === 0) ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No active positions</p>
                  </div>
                ) : (
                  brokerPositions?.map((position) => (
                    <div key={position.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={position.type === 'BUY' ? 'status-indicator buy' : 'status-indicator sell'}>
                            {position.type}
                          </Badge>
                          <span className="font-mono font-medium">{position.pair}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Size: {position.size}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Entry:</span>
                          <span className="font-mono">{position.openPrice.toFixed(5)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current:</span>
                          <span className="font-mono">{position.currentPrice.toFixed(5)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Commission:</span>
                          <span className="font-mono text-orange-500">-${position.commission.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm pt-1 border-t border-border">
                          <span className="text-muted-foreground">P&L:</span>
                          <span className={`font-mono font-bold ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Open Time:</span>
                          <span className="font-mono text-xs">{new Date(position.openTime).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Broker Integration */}
        <BrokerIntegration />

        {/* Recent Signals - Compact Layout */}
        <Card className="trading-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">SMC Signals</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {signals?.slice(0, 6).map((signal) => (
                <div key={signal.id} className="flex items-center justify-between p-2 bg-muted/20 rounded border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 font-mono">
                      {signal.pattern}
                    </Badge>
                    <span className="font-medium text-sm">{signal.pair}</span>
                    <Badge className={`text-xs px-1.5 py-0.5 ${signal.direction === 'BULLISH' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {signal.direction === 'BULLISH' ? '↗' : '↙'}
                    </Badge>
                  </div>
                  
                  <div className="text-right text-xs">
                    <p className="font-mono font-medium">{signal.price.toFixed(5)}</p>
                    <span className="text-muted-foreground">{(signal.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )) || (
                <p className="text-center text-muted-foreground py-4 text-sm">No signals detected</p>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}