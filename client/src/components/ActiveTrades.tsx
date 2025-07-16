import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { X, Plus } from 'lucide-react';
import { Trade } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function ActiveTrades() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false);
  const [newTrade, setNewTrade] = useState({
    pair: 'EURUSD',
    type: 'BUY' as 'BUY' | 'SELL',
    size: 0.1,
    stopLoss: 0,
    takeProfit: 0,
  });
  
  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ['/api/trades/active'],
    refetchInterval: 5000,
  });

  const closeTradeMutation = useMutation({
    mutationFn: async (tradeId: number) => {
      // Get current price for the pair (simplified)
      const trade = trades?.find(t => t.id === tradeId);
      if (!trade) throw new Error('Trade not found');
      
      const priceResponse = await fetch(`/api/market-data/${trade.pair}/price`);
      const { price } = await priceResponse.json();
      
      // Calculate P&L
      const pnl = trade.type === 'BUY' 
        ? (price - trade.entryPrice) * trade.size
        : (trade.entryPrice - price) * trade.size;
      
      const response = await fetch(`/api/trades/${tradeId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exitPrice: price, pnl }),
      });
      
      if (!response.ok) throw new Error('Failed to close trade');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades/active'] });
      toast({
        title: "Trade Closed",
        description: "Trade has been successfully closed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to close trade",
        variant: "destructive",
      });
    },
  });

  const createTradeMutation = useMutation({
    mutationFn: async (tradeData: typeof newTrade) => {
      // Get current price for entry
      const priceResponse = await fetch(`/api/market-data/${tradeData.pair}/price`);
      const { price } = await priceResponse.json();
      
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pair: tradeData.pair,
          type: tradeData.type,
          size: tradeData.size,
          entryPrice: price,
          stopLoss: tradeData.stopLoss || null,
          takeProfit: tradeData.takeProfit || null,
          status: 'OPEN',
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create trade');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades/active'] });
      setIsNewTradeOpen(false);
      setNewTrade({
        pair: 'EURUSD',
        type: 'BUY',
        size: 0.1,
        stopLoss: 0,
        takeProfit: 0,
      });
      toast({
        title: "Trade Created",
        description: "New trade has been opened successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create trade",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Active Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 bg-muted/30 rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="trading-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Trades</CardTitle>
          <Dialog open={isNewTradeOpen} onOpenChange={setIsNewTradeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="trading-button-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Trade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Trade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Currency Pair</Label>
                  <Select value={newTrade.pair} onValueChange={(value) => setNewTrade(prev => ({ ...prev, pair: value }))}>
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
                  <Label>Trade Type</Label>
                  <Select value={newTrade.type} onValueChange={(value) => setNewTrade(prev => ({ ...prev, type: value as 'BUY' | 'SELL' }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">Buy</SelectItem>
                      <SelectItem value="SELL">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Position Size</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newTrade.size}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, size: parseFloat(e.target.value) }))}
                  />
                </div>
                
                <div>
                  <Label>Stop Loss (Optional)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={newTrade.stopLoss}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, stopLoss: parseFloat(e.target.value) }))}
                  />
                </div>
                
                <div>
                  <Label>Take Profit (Optional)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={newTrade.takeProfit}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, takeProfit: parseFloat(e.target.value) }))}
                  />
                </div>
                
                <Button 
                  onClick={() => createTradeMutation.mutate(newTrade)}
                  disabled={createTradeMutation.isPending}
                  className="w-full"
                >
                  {createTradeMutation.isPending ? 'Creating...' : 'Create Trade'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          {trades?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active trades</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 text-muted-foreground">Pair</th>
                  <th className="text-left p-3 text-muted-foreground">Type</th>
                  <th className="text-left p-3 text-muted-foreground">Size</th>
                  <th className="text-left p-3 text-muted-foreground">Entry</th>
                  <th className="text-left p-3 text-muted-foreground">P&L</th>
                  <th className="text-left p-3 text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trades?.map((trade) => (
                  <tr key={trade.id} className="hover:bg-muted/20">
                    <td className="p-3 text-foreground trading-mono font-medium">
                      {trade.pair}
                    </td>
                    <td className="p-3">
                      <Badge className={trade.type === 'BUY' ? 'status-indicator buy' : 'status-indicator sell'}>
                        {trade.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-foreground trading-mono">
                      {trade.size}
                    </td>
                    <td className="p-3 text-foreground trading-mono">
                      {trade.entryPrice.toFixed(4)}
                    </td>
                    <td className="p-3 trading-mono">
                      {trade.pnl !== null && trade.pnl !== undefined ? (
                        <span className={trade.pnl > 0 ? 'profit-text' : 'loss-text'}>
                          {trade.pnl > 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => closeTradeMutation.mutate(trade.id)}
                        disabled={closeTradeMutation.isPending}
                        className="text-red-500 hover:bg-red-500/20"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
