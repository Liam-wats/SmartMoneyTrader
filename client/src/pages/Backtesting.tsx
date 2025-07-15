import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Download, Calendar, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Backtest, Strategy } from '@shared/schema';
import Sidebar from '@/components/Sidebar';

export default function Backtesting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [backtestParams, setBacktestParams] = useState({
    strategyId: 1,
    pair: 'EURUSD',
    timeframe: '1h',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: strategies } = useQuery<Strategy[]>({
    queryKey: ['/api/strategies'],
  });

  const { data: backtests, isLoading: backtestsLoading } = useQuery<Backtest[]>({
    queryKey: ['/api/backtests'],
  });

  const [selectedBacktest, setSelectedBacktest] = useState<Backtest | null>(null);

  const runBacktestMutation = useMutation({
    mutationFn: async (params: typeof backtestParams) => {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) throw new Error('Failed to run backtest');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/backtests'] });
      setSelectedBacktest(data);
      toast({
        title: "Backtest Complete",
        description: `Win Rate: ${(data.winRate * 100).toFixed(1)}%, Total P&L: $${data.totalPnL.toFixed(2)}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run backtest",
        variant: "destructive",
      });
    },
  });

  const handleRunBacktest = () => {
    runBacktestMutation.mutate(backtestParams);
  };

  const formatEquityCurve = (backtest: Backtest) => {
    if (!backtest.results || !backtest.results.equityCurve) return [];
    
    return backtest.results.equityCurve.map((point: any, index: number) => ({
      time: index,
      equity: point.equity,
      timestamp: new Date(point.timestamp).toLocaleDateString(),
    }));
  };

  return (
    <>
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Backtesting</h1>
            <p className="text-muted-foreground">Test your strategies against historical data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Backtest Configuration */}
          <Card className="trading-card">
            <CardHeader>
              <CardTitle>Backtest Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Strategy</Label>
                <Select 
                  value={backtestParams.strategyId.toString()} 
                  onValueChange={(value) => setBacktestParams(prev => ({ ...prev, strategyId: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies?.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id.toString()}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Currency Pair</Label>
                <Select 
                  value={backtestParams.pair} 
                  onValueChange={(value) => setBacktestParams(prev => ({ ...prev, pair: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EURUSD">EUR/USD</SelectItem>
                    <SelectItem value="GBPUSD">GBP/USD</SelectItem>
                    <SelectItem value="USDJPY">USD/JPY</SelectItem>
                    <SelectItem value="AUDUSD">AUD/USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Timeframe</Label>
                <Select 
                  value={backtestParams.timeframe} 
                  onValueChange={(value) => setBacktestParams(prev => ({ ...prev, timeframe: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={backtestParams.startDate}
                  onChange={(e) => setBacktestParams(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={backtestParams.endDate}
                  onChange={(e) => setBacktestParams(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleRunBacktest}
                disabled={runBacktestMutation.isPending}
                className="w-full trading-button-primary"
              >
                <Play className="w-4 h-4 mr-2" />
                {runBacktestMutation.isPending ? 'Running...' : 'Run Backtest'}
              </Button>
            </CardContent>
          </Card>

          {/* Backtest Results */}
          <div className="lg:col-span-2 space-y-6">
            {selectedBacktest && (
              <>
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="trading-card">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Total Trades</p>
                          <p className="text-xl font-bold">{selectedBacktest.totalTrades}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="trading-card">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="text-xl font-bold">{(selectedBacktest.winRate * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="trading-card">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Profit Factor</p>
                          <p className="text-xl font-bold">{selectedBacktest.profitFactor.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="trading-card">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Max Drawdown</p>
                          <p className="text-xl font-bold">{(selectedBacktest.maxDrawdown * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Equity Curve */}
                <Card className="trading-card">
                  <CardHeader>
                    <CardTitle>Equity Curve</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatEquityCurve(selectedBacktest)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => `Trade ${value}`}
                            formatter={(value) => [`$${value}`, 'Equity']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="equity" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Backtest History */}
        <Card className="trading-card">
          <CardHeader>
            <CardTitle>Backtest History</CardTitle>
          </CardHeader>
          <CardContent>
            {backtestsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : backtests?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No backtests run yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {backtests?.map((backtest) => (
                  <div 
                    key={backtest.id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedBacktest?.id === backtest.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/30'
                    }`}
                    onClick={() => setSelectedBacktest(backtest)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{strategies?.find(s => s.id === backtest.strategyId)?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(backtest.startDate).toLocaleDateString()} - {new Date(backtest.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{backtest.totalTrades} trades</p>
                          <p className="text-xs text-muted-foreground">{(backtest.winRate * 100).toFixed(1)}% win rate</p>
                        </div>
                        <Badge className={backtest.totalPnL >= 0 ? 'status-indicator buy' : 'status-indicator sell'}>
                          {backtest.totalPnL >= 0 ? '+' : ''}${backtest.totalPnL.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
}