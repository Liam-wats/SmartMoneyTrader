import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Play, Settings, TrendingUp, Shield, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Strategy } from '@shared/schema';
import Sidebar from '@/components/Sidebar';

export default function StrategyBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [strategy, setStrategy] = useState({
    name: '',
    description: '',
    riskPercentage: 2,
    stopLoss: 50,
    takeProfit: 100,
    maxDailyTrades: 5,
    maxDrawdown: 10,
    bosConfirmation: true,
    fvgTrading: true,
    liquiditySweeps: false,
    orderBlockFilter: true,
    timefilterEnabled: false,
    timefilterStart: '08:00',
    timefilterEnd: '17:00',
    minConfidence: 75,
    riskRewardRatio: 2,
  });

  const { data: strategies, isLoading } = useQuery<Strategy[]>({
    queryKey: ['/api/strategies'],
  });

  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const saveStrategyMutation = useMutation({
    mutationFn: async (strategyData: typeof strategy) => {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyData),
      });
      
      if (!response.ok) throw new Error('Failed to save strategy');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      toast({
        title: "Strategy Saved",
        description: "Your trading strategy has been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save strategy",
        variant: "destructive",
      });
    },
  });

  const backtestStrategyMutation = useMutation({
    mutationFn: async () => {
      // Save strategy first if it's new
      if (!selectedStrategy) {
        await saveStrategyMutation.mutateAsync(strategy);
      }
      
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: selectedStrategy?.id || 1,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          pair: 'EURUSD',
          timeframe: '1h',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to run backtest');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Backtest Complete",
        description: `Win Rate: ${(data.winRate * 100).toFixed(1)}%, P&L: $${data.totalPnL.toFixed(2)}`,
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

  const handleSaveStrategy = () => {
    if (!strategy.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a strategy name",
        variant: "destructive",
      });
      return;
    }
    saveStrategyMutation.mutate(strategy);
  };

  const handleLoadStrategy = (loadedStrategy: Strategy) => {
    setSelectedStrategy(loadedStrategy);
    setStrategy({
      name: loadedStrategy.name,
      description: '',
      riskPercentage: loadedStrategy.riskPercentage,
      stopLoss: loadedStrategy.stopLoss,
      takeProfit: loadedStrategy.takeProfit,
      maxDailyTrades: 5,
      maxDrawdown: 10,
      bosConfirmation: loadedStrategy.bosConfirmation,
      fvgTrading: loadedStrategy.fvgTrading,
      liquiditySweeps: loadedStrategy.liquiditySweeps,
      orderBlockFilter: loadedStrategy.orderBlockFilter,
      timefilterEnabled: false,
      timefilterStart: '08:00',
      timefilterEnd: '17:00',
      minConfidence: 75,
      riskRewardRatio: 2,
    });
  };

  return (
    <>
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Strategy Builder</h1>
            <p className="text-muted-foreground">Create and customize your SMC trading strategies</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => backtestStrategyMutation.mutate()}
              disabled={backtestStrategyMutation.isPending}
              variant="outline"
            >
              <Play className="w-4 h-4 mr-2" />
              {backtestStrategyMutation.isPending ? 'Testing...' : 'Backtest'}
            </Button>
            
            <Button
              onClick={handleSaveStrategy}
              disabled={saveStrategyMutation.isPending}
              className="trading-button-primary"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveStrategyMutation.isPending ? 'Saving...' : 'Save Strategy'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy List */}
          <Card className="trading-card">
            <CardHeader>
              <CardTitle>Saved Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-3 bg-muted/30 rounded-lg animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : strategies?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No strategies saved yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {strategies?.map((savedStrategy) => (
                    <div 
                      key={savedStrategy.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedStrategy?.id === savedStrategy.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => handleLoadStrategy(savedStrategy)}
                    >
                      <h4 className="font-medium">{savedStrategy.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Risk: {savedStrategy.riskPercentage}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          SL: {savedStrategy.stopLoss}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                onClick={() => {
                  setSelectedStrategy(null);
                  setStrategy({
                    name: '',
                    description: '',
                    riskPercentage: 2,
                    stopLoss: 50,
                    takeProfit: 100,
                    maxDailyTrades: 5,
                    maxDrawdown: 10,
                    bosConfirmation: true,
                    fvgTrading: true,
                    liquiditySweeps: false,
                    orderBlockFilter: true,
                    timefilterEnabled: false,
                    timefilterStart: '08:00',
                    timefilterEnd: '17:00',
                    minConfidence: 75,
                    riskRewardRatio: 2,
                  });
                }}
                variant="outline" 
                className="w-full mt-4"
              >
                New Strategy
              </Button>
            </CardContent>
          </Card>

          {/* Strategy Configuration */}
          <div className="lg:col-span-2">
            <Card className="trading-card">
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>{selectedStrategy ? 'Edit Strategy' : 'New Strategy'}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="smc">SMC Patterns</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Strategy Name</Label>
                        <Input
                          value={strategy.name}
                          onChange={(e) => setStrategy(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter strategy name"
                        />
                      </div>
                      
                      <div>
                        <Label>Description (Optional)</Label>
                        <Textarea
                          value={strategy.description}
                          onChange={(e) => setStrategy(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your strategy..."
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-blue-500" />
                        <h4 className="text-sm font-medium text-foreground">Risk Management</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Position Size ({strategy.riskPercentage}% per trade)
                          </Label>
                          <Slider
                            value={[strategy.riskPercentage]}
                            onValueChange={(value) => setStrategy(prev => ({ ...prev, riskPercentage: value[0] }))}
                            max={10}
                            min={0.5}
                            step={0.5}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0.5%</span>
                            <span>10%</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Stop Loss (pips)</Label>
                            <Input
                              type="number"
                              value={strategy.stopLoss}
                              onChange={(e) => setStrategy(prev => ({ ...prev, stopLoss: parseInt(e.target.value) }))}
                            />
                          </div>
                          
                          <div>
                            <Label>Take Profit (pips)</Label>
                            <Input
                              type="number"
                              value={strategy.takeProfit}
                              onChange={(e) => setStrategy(prev => ({ ...prev, takeProfit: parseInt(e.target.value) }))}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Risk:Reward Ratio (1:{strategy.riskRewardRatio})
                          </Label>
                          <Slider
                            value={[strategy.riskRewardRatio]}
                            onValueChange={(value) => setStrategy(prev => ({ ...prev, riskRewardRatio: value[0] }))}
                            max={5}
                            min={1}
                            step={0.5}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1:1</span>
                            <span>1:5</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="smc" className="space-y-6">
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        <h4 className="text-sm font-medium text-foreground">SMC Pattern Selection</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="bosConfirmation"
                            checked={strategy.bosConfirmation}
                            onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, bosConfirmation: !!checked }))}
                          />
                          <Label htmlFor="bosConfirmation">Break of Structure (BOS)</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="fvgTrading"
                            checked={strategy.fvgTrading}
                            onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, fvgTrading: !!checked }))}
                          />
                          <Label htmlFor="fvgTrading">Fair Value Gaps (FVG)</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="orderBlockFilter"
                            checked={strategy.orderBlockFilter}
                            onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, orderBlockFilter: !!checked }))}
                          />
                          <Label htmlFor="orderBlockFilter">Order Blocks (OB)</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="liquiditySweeps"
                            checked={strategy.liquiditySweeps}
                            onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, liquiditySweeps: !!checked }))}
                          />
                          <Label htmlFor="liquiditySweeps">Liquidity Sweeps (LS)</Label>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Minimum Confidence ({strategy.minConfidence}%)
                        </Label>
                        <Slider
                          value={[strategy.minConfidence]}
                          onValueChange={(value) => setStrategy(prev => ({ ...prev, minConfidence: value[0] }))}
                          max={95}
                          min={50}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>50%</span>
                          <span>95%</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-6">
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3">
                        <Target className="w-5 h-5 text-purple-500" />
                        <h4 className="text-sm font-medium text-foreground">Advanced Settings</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Max Daily Trades</Label>
                          <Input
                            type="number"
                            value={strategy.maxDailyTrades}
                            onChange={(e) => setStrategy(prev => ({ ...prev, maxDailyTrades: parseInt(e.target.value) }))}
                          />
                        </div>
                        
                        <div>
                          <Label>Max Drawdown (%)</Label>
                          <Input
                            type="number"
                            value={strategy.maxDrawdown}
                            onChange={(e) => setStrategy(prev => ({ ...prev, maxDrawdown: parseInt(e.target.value) }))}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="timefilterEnabled"
                            checked={strategy.timefilterEnabled}
                            onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, timefilterEnabled: !!checked }))}
                          />
                          <Label htmlFor="timefilterEnabled">Enable Time Filter</Label>
                        </div>
                        
                        {strategy.timefilterEnabled && (
                          <div className="grid grid-cols-2 gap-4 pl-6">
                            <div>
                              <Label>Start Time</Label>
                              <Input
                                type="time"
                                value={strategy.timefilterStart}
                                onChange={(e) => setStrategy(prev => ({ ...prev, timefilterStart: e.target.value }))}
                              />
                            </div>
                            
                            <div>
                              <Label>End Time</Label>
                              <Input
                                type="time"
                                value={strategy.timefilterEnd}
                                onChange={(e) => setStrategy(prev => ({ ...prev, timefilterEnd: e.target.value }))}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}