import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Save, FlaskConical } from 'lucide-react';
import { Strategy } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function StrategySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: strategies } = useQuery<Strategy[]>({
    queryKey: ['/api/strategies'],
  });

  const [settings, setSettings] = useState({
    riskPercentage: 2,
    stopLoss: 50,
    takeProfit: 100,
    bosConfirmation: true,
    fvgTrading: true,
    liquiditySweeps: false,
    orderBlockFilter: true,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Default SMC Strategy',
          ...settings,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
      toast({
        title: "Settings Saved",
        description: "Strategy settings have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save strategy settings",
        variant: "destructive",
      });
    },
  });

  const backtestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: 1,
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

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleBacktest = () => {
    backtestMutation.mutate();
  };

  return (
    <Card className="trading-card">
      <CardHeader>
        <CardTitle>Strategy Settings</CardTitle>
        <p className="text-sm text-muted-foreground">Configure SMC parameters</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Risk Management */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Risk Management</h4>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Position Size ({settings.riskPercentage}%)
            </Label>
            <Slider
              value={[settings.riskPercentage]}
              onValueChange={(value) => setSettings(prev => ({ ...prev, riskPercentage: value[0] }))}
              max={10}
              min={1}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span className="text-foreground trading-mono">{settings.riskPercentage}%</span>
              <span>10%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Stop Loss (pips)</Label>
              <Input
                type="number"
                value={settings.stopLoss}
                onChange={(e) => setSettings(prev => ({ ...prev, stopLoss: parseInt(e.target.value) }))}
                className="trading-input trading-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Take Profit (pips)</Label>
              <Input
                type="number"
                value={settings.takeProfit}
                onChange={(e) => setSettings(prev => ({ ...prev, takeProfit: parseInt(e.target.value) }))}
                className="trading-input trading-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* SMC Parameters */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-foreground">SMC Detection</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">BOS Confirmation</Label>
              <Checkbox
                checked={settings.bosConfirmation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, bosConfirmation: !!checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">FVG Trading</Label>
              <Checkbox
                checked={settings.fvgTrading}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, fvgTrading: !!checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Liquidity Sweeps</Label>
              <Checkbox
                checked={settings.liquiditySweeps}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, liquiditySweeps: !!checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Order Block Filter</Label>
              <Checkbox
                checked={settings.orderBlockFilter}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, orderBlockFilter: !!checked }))}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border space-y-2">
          <Button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="w-full trading-button-success"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
          
          <Button
            onClick={handleBacktest}
            disabled={backtestMutation.isPending}
            className="w-full trading-button-primary"
          >
            <FlaskConical className="w-4 h-4 mr-2" />
            {backtestMutation.isPending ? 'Running...' : 'Backtest Strategy'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
