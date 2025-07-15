import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, Award, Calendar, BarChart3 } from 'lucide-react';
import { Trade, Backtest, Strategy } from '@shared/schema';
import Sidebar from '@/components/Sidebar';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('pnl');

  const { data: trades } = useQuery<Trade[]>({
    queryKey: ['/api/trades'],
  });

  const { data: backtests } = useQuery<Backtest[]>({
    queryKey: ['/api/backtests'],
  });

  const { data: strategies } = useQuery<Strategy[]>({
    queryKey: ['/api/strategies'],
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/performance'],
  });

  // Calculate performance metrics
  const calculateMetrics = () => {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        totalPnL: 0,
        maxWin: 0,
        maxLoss: 0,
        avgTradeDuration: 0,
      };
    }

    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== null);
    const winningTrades = closedTrades.filter(t => t.pnl! > 0);
    const losingTrades = closedTrades.filter(t => t.pnl! < 0);
    
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl!, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl!, 0));
    
    return {
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0,
      avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 99 : 0,
      totalPnL: closedTrades.reduce((sum, t) => sum + t.pnl!, 0),
      maxWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl!)) : 0,
      maxLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl!)) : 0,
      avgTradeDuration: 0, // Would need timestamps to calculate
    };
  };

  const metrics = calculateMetrics();

  // Generate equity curve data
  const generateEquityCurve = () => {
    if (!trades || trades.length === 0) return [];
    
    const closedTrades = trades
      .filter(t => t.status === 'CLOSED' && t.pnl !== null)
      .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
    
    let runningBalance = 10000; // Starting balance
    
    return closedTrades.map((trade, index) => {
      runningBalance += trade.pnl!;
      return {
        trade: index + 1,
        balance: runningBalance,
        pnl: trade.pnl,
        date: new Date(trade.createdAt!).toLocaleDateString(),
      };
    });
  };

  // Generate performance by pair data
  const generatePairPerformance = () => {
    if (!trades || trades.length === 0) return [];
    
    const pairStats = trades
      .filter(t => t.status === 'CLOSED' && t.pnl !== null)
      .reduce((acc, trade) => {
        if (!acc[trade.pair]) {
          acc[trade.pair] = { trades: 0, pnl: 0, wins: 0 };
        }
        acc[trade.pair].trades++;
        acc[trade.pair].pnl += trade.pnl!;
        if (trade.pnl! > 0) acc[trade.pair].wins++;
        return acc;
      }, {} as Record<string, { trades: number; pnl: number; wins: number }>);
    
    return Object.entries(pairStats).map(([pair, stats]) => ({
      pair,
      trades: stats.trades,
      pnl: stats.pnl,
      winRate: (stats.wins / stats.trades) * 100,
    }));
  };

  // Generate monthly performance data
  const generateMonthlyPerformance = () => {
    if (!trades || trades.length === 0) return [];
    
    const monthlyStats = trades
      .filter(t => t.status === 'CLOSED' && t.pnl !== null)
      .reduce((acc, trade) => {
        const month = new Date(trade.createdAt!).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        if (!acc[month]) {
          acc[month] = { pnl: 0, trades: 0 };
        }
        acc[month].pnl += trade.pnl!;
        acc[month].trades++;
        return acc;
      }, {} as Record<string, { pnl: number; trades: number }>);
    
    return Object.entries(monthlyStats).map(([month, stats]) => ({
      month,
      pnl: stats.pnl,
      trades: stats.trades,
    }));
  };

  const equityCurve = generateEquityCurve();
  const pairPerformance = generatePairPerformance();
  const monthlyPerformance = generateMonthlyPerformance();

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <>
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Comprehensive trading performance analysis</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                  <p className="text-xl font-bold">{metrics.totalTrades}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-xl font-bold">{(metrics.winRate * 100).toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Profit Factor</p>
                  <p className="text-xl font-bold">{metrics.profitFactor.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total P&L</p>
                  <p className={`text-xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
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
                  <p className="text-xs text-muted-foreground">Avg Win</p>
                  <p className="text-xl font-bold text-green-500">${metrics.avgWin.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="trading-card">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Avg Loss</p>
                  <p className="text-xl font-bold text-red-500">${metrics.avgLoss.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="backtests">Backtests</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
          </TabsList>
          
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Equity Curve */}
              <Card className="trading-card">
                <CardHeader>
                  <CardTitle>Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityCurve}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="trade" />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => `Trade ${value}`}
                          formatter={(value, name) => [
                            name === 'balance' ? `$${Number(value).toFixed(2)}` : Number(value).toFixed(2),
                            name === 'balance' ? 'Balance' : 'P&L'
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Performance */}
              <Card className="trading-card">
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'P&L']} />
                        <Bar 
                          dataKey="pnl" 
                          fill={(entry: any) => entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pair Performance */}
            <Card className="trading-card">
              <CardHeader>
                <CardTitle>Performance by Currency Pair</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pairPerformance.map((pair, index) => (
                    <div key={pair.pair} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-mono font-medium">{pair.pair}</span>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Trades</p>
                          <p className="font-medium">{pair.trades}</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="font-medium">{pair.winRate.toFixed(1)}%</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">P&L</p>
                          <p className={`font-bold ${pair.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {pair.pnl >= 0 ? '+' : ''}${pair.pnl.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Win/Loss Distribution */}
              <Card className="trading-card">
                <CardHeader>
                  <CardTitle>Win/Loss Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Wins', value: metrics.winningTrades, color: '#10b981' },
                            { name: 'Losses', value: metrics.losingTrades, color: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Size Distribution */}
              <Card className="trading-card">
                <CardHeader>
                  <CardTitle>Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Best Trade</span>
                      <span className="font-mono text-green-500">+${metrics.maxWin.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Worst Trade</span>
                      <span className="font-mono text-red-500">${metrics.maxLoss.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Win</span>
                      <span className="font-mono text-green-500">+${metrics.avgWin.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Loss</span>
                      <span className="font-mono text-red-500">-${metrics.avgLoss.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">Expectancy</span>
                      <span className="font-mono font-bold">
                        ${((metrics.winRate * metrics.avgWin) - ((1 - metrics.winRate) * metrics.avgLoss)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="backtests" className="space-y-6">
            <Card className="trading-card">
              <CardHeader>
                <CardTitle>Backtest Results</CardTitle>
              </CardHeader>
              <CardContent>
                {backtests?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No backtests available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {backtests?.map((backtest) => (
                      <div key={backtest.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">
                              {strategies?.find(s => s.id === backtest.strategyId)?.name || 'Unknown Strategy'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(backtest.startDate).toLocaleDateString()} - {new Date(backtest.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Trades</p>
                              <p className="font-medium">{backtest.totalTrades}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Win Rate</p>
                              <p className="font-medium">{(backtest.winRate * 100).toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">P&L</p>
                              <p className={`font-bold ${backtest.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {backtest.totalPnL >= 0 ? '+' : ''}${backtest.totalPnL.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="strategies" className="space-y-6">
            <Card className="trading-card">
              <CardHeader>
                <CardTitle>Strategy Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {strategies?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No strategies available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {strategies?.map((strategy) => (
                      <div key={strategy.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{strategy.name}</h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Risk: {strategy.riskPercentage}%
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                SL: {strategy.stopLoss}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                TP: {strategy.takeProfit}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge className="status-indicator sell">Inactive</Badge>
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
      </div>
    </>
  );
}