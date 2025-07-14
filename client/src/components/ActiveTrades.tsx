import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { Trade } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function ActiveTrades() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
          <Button size="sm" className="trading-button-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Trade
          </Button>
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
                      {trade.pnl ? (
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
