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

export default function LiveTrading() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isStrategyActive, setIsStrategyActive] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<Array<{time: number, price: number}>>([]);

  const { isConnected, subscribe } = useWebSocket('/ws');

  const { data: activeTrades } = useQuery<Trade[]>({
    queryKey: ['/api/trades/active'],
    refetchInterval: 2000,
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
      const pnlEmoji = data.trade.pnl >= 0 ? '💰' : '📉';
      toast({
        title: `${pnlEmoji} Trade Closed`,
        description: `P&L: $${data.trade.pnl?.toFixed(2)}`,
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
    return activeTrades?.reduce((total, trade) => total + (trade.pnl || 0), 0) || 0;
  };

  const calculateDaysPnL = () => {
    // Simplified calculation - in real app would filter by today's trades
    return calculateTotalPnL();
  };

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

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Account Balance</p>
                  <p className="text-xl font-bold">${user?.balance?.toFixed(2) || '0.00'}</p>
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
                  <p className="text-xl font-bold">{activeTrades?.length || 0}</p>
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
                  <Badge className={isStrategyActive ? 'status-indicator buy' : 'status-indicator sell'}>
                    {isStrategyActive ? 'ACTIVE' : 'STOPPED'}
                  </Badge>
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
                {activeTrades?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No active trades</p>
                  </div>
                ) : (
                  activeTrades?.map((trade) => (
                    <div key={trade.id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={trade.type === 'BUY' ? 'status-indicator buy' : 'status-indicator sell'}>
                            {trade.type}
                          </Badge>
                          <span className="font-mono font-medium">{trade.pair}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Size: {trade.size}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Entry:</span>
                          <span className="font-mono">{trade.entryPrice.toFixed(5)}</span>
                        </div>
                        
                        {trade.stopLoss && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Stop Loss:</span>
                            <span className="font-mono text-red-500">{trade.stopLoss.toFixed(5)}</span>
                          </div>
                        )}
                        
                        {trade.takeProfit && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Take Profit:</span>
                            <span className="font-mono text-green-500">{trade.takeProfit.toFixed(5)}</span>
                          </div>
                        )}
                        
                        {trade.pnl !== undefined && (
                          <div className="flex justify-between text-sm pt-1 border-t border-border">
                            <span className="text-muted-foreground">P&L:</span>
                            <span className={`font-mono font-bold ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Signals */}
        <Card className="trading-card">
          <CardHeader>
            <CardTitle>Recent SMC Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {signals?.slice(0, 5).map((signal) => (
                <div key={signal.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className="trading-pattern-badge">
                      {signal.pattern}
                    </Badge>
                    <div>
                      <p className="font-medium">{signal.pair}</p>
                      <p className="text-sm text-muted-foreground">{signal.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-mono font-medium">{signal.price.toFixed(5)}</p>
                    <div className="flex items-center space-x-2">
                      <Badge className={signal.direction === 'BULLISH' ? 'status-indicator buy' : 'status-indicator sell'}>
                        {signal.direction}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(signal.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}