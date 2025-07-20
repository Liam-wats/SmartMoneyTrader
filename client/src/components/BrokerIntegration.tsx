import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, DollarSign, TrendingUp, TrendingDown, Clock, Target, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BrokerAccount {
  accountBalance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
}

interface BrokerPosition {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  size: number;
  openPrice: number;
  currentPrice: number;
  pnl: number;
  swap: number;
  commission: number;
  openTime: Date;
}

interface BrokerOrder {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  timestamp: Date;
  fillPrice?: number;
}

interface TradingSignal {
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  confidence: number;
  pattern: string;
  reason: string;
}

export default function BrokerIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manualSignal, setManualSignal] = useState<Partial<TradingSignal>>({
    pair: 'EURUSD',
    type: 'BUY',
    size: 0.1,
    confidence: 0.8,
    pattern: 'Manual Trade',
    reason: 'Manual execution'
  });

  // Fetch broker data
  const { data: account, refetch: refetchAccount } = useQuery<BrokerAccount>({
    queryKey: ['/api/broker/account'],
    refetchInterval: 2000,
  });

  const { data: positions, refetch: refetchPositions } = useQuery<BrokerPosition[]>({
    queryKey: ['/api/broker/positions'],
    refetchInterval: 1000,
  });

  const { data: orders } = useQuery<BrokerOrder[]>({
    queryKey: ['/api/broker/orders'],
    refetchInterval: 1000,
  });

  const { data: currentPrice } = useQuery<{ price: number }>({
    queryKey: [`/api/market-data/${manualSignal.pair}/price`],
    refetchInterval: 500,
    enabled: !!manualSignal.pair,
  });

  // Execute trading signal
  const executeSignalMutation = useMutation({
    mutationFn: async (signal: TradingSignal) => {
      const response = await fetch('/api/broker/execute-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal }),
      });
      if (!response.ok) throw new Error('Failed to execute signal');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Signal Executed",
        description: `${manualSignal.type} order placed for ${manualSignal.pair}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/broker/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/active'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Execution Failed",
        description: error.message || "Failed to execute trading signal",
        variant: "destructive",
      });
    },
  });

  // Close position
  const closePositionMutation = useMutation({
    mutationFn: async (positionId: string) => {
      const response = await fetch(`/api/broker/close-position/${positionId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to close position');
      return response.json();
    },
    onSuccess: (_, positionId) => {
      toast({
        title: "✅ Position Closed",
        description: `Position ${positionId} successfully closed`,
      });
      refetchPositions();
      refetchAccount();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Close Failed",
        description: error.message || "Failed to close position",
        variant: "destructive",
      });
    },
  });

  const handleExecuteSignal = () => {
    if (!manualSignal.entryPrice || !manualSignal.stopLoss || !manualSignal.takeProfit) {
      toast({
        title: "❌ Invalid Signal",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const signal: TradingSignal = {
      pair: manualSignal.pair || 'EURUSD',
      type: manualSignal.type || 'BUY',
      entryPrice: manualSignal.entryPrice,
      stopLoss: manualSignal.stopLoss,
      takeProfit: manualSignal.takeProfit,
      size: manualSignal.size || 0.1,
      confidence: manualSignal.confidence || 0.8,
      pattern: manualSignal.pattern || 'Manual Trade',
      reason: manualSignal.reason || 'Manual execution'
    };

    executeSignalMutation.mutate(signal);
  };

  // Auto-fill entry price with current market price
  useEffect(() => {
    if (currentPrice && !manualSignal.entryPrice) {
      const price = currentPrice.price;
      const spread = 0.0001; // 1 pip
      const entryPrice = manualSignal.type === 'BUY' ? price + spread : price - spread;
      
      setManualSignal(prev => ({
        ...prev,
        entryPrice: Number(entryPrice.toFixed(5))
      }));
    }
  }, [currentPrice, manualSignal.type, manualSignal.entryPrice]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPrice = (value: number, pair: string) => {
    const digits = pair.includes('JPY') ? 3 : 5;
    return value.toFixed(digits);
  };

  return (
    <div className="space-y-6">
      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account?.accountBalance || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account?.equity || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Margin</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account?.margin || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Margin</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account?.freeMargin || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margin Level</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(account?.marginLevel || 0).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="positions">Positions ({positions?.length || 0})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders?.length || 0})</TabsTrigger>
          <TabsTrigger value="manual">Manual Trading</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {positions && positions.length > 0 ? (
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="grid grid-cols-6 gap-4 flex-1">
                        <div>
                          <div className="font-semibold">{position.pair}</div>
                          <Badge variant={position.type === 'BUY' ? 'default' : 'destructive'}>
                            {position.type}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Size</div>
                          <div>{position.size}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Open Price</div>
                          <div>{formatPrice(position.openPrice, position.pair)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Current Price</div>
                          <div>{formatPrice(position.currentPrice, position.pair)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">P&L</div>
                          <div className={position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(position.pnl)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Time</div>
                          <div className="text-sm">
                            {new Date(position.openTime).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => closePositionMutation.mutate(position.id)}
                        disabled={closePositionMutation.isPending}
                        variant="destructive"
                        size="sm"
                      >
                        Close
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No open positions
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {orders && orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="grid grid-cols-5 gap-4 flex-1">
                        <div>
                          <div className="font-semibold">{order.pair}</div>
                          <Badge variant={order.type === 'BUY' ? 'default' : 'destructive'}>
                            {order.type}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Size</div>
                          <div>{order.size}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Entry Price</div>
                          <div>{formatPrice(order.entryPrice, order.pair)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Status</div>
                          <Badge variant={
                            order.status === 'FILLED' ? 'default' :
                            order.status === 'PENDING' ? 'secondary' : 'destructive'
                          }>
                            {order.status}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Time</div>
                          <div className="text-sm">
                            {new Date(order.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No pending orders
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Trade Execution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This is a demo trading environment. All trades are simulated with $10,000 virtual funds.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Currency Pair</label>
                  <Select
                    value={manualSignal.pair}
                    onValueChange={(value) => setManualSignal(prev => ({ ...prev, pair: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EURUSD">EUR/USD</SelectItem>
                      <SelectItem value="GBPUSD">GBP/USD</SelectItem>
                      <SelectItem value="USDJPY">USD/JPY</SelectItem>
                      <SelectItem value="AUDUSD">AUD/USD</SelectItem>
                      <SelectItem value="USDCAD">USD/CAD</SelectItem>
                      <SelectItem value="USDCHF">USD/CHF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Direction</label>
                  <Select
                    value={manualSignal.type}
                    onValueChange={(value: 'BUY' | 'SELL') => setManualSignal(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Position Size (Lots)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualSignal.size}
                    onChange={(e) => setManualSignal(prev => ({ ...prev, size: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Current Price: {currentPrice ? formatPrice(currentPrice.price, manualSignal.pair || 'EURUSD') : 'Loading...'}
                  </label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="Entry Price"
                    value={manualSignal.entryPrice || ''}
                    onChange={(e) => setManualSignal(prev => ({ ...prev, entryPrice: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Stop Loss</label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="Stop Loss Price"
                    value={manualSignal.stopLoss || ''}
                    onChange={(e) => setManualSignal(prev => ({ ...prev, stopLoss: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Take Profit</label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="Take Profit Price"
                    value={manualSignal.takeProfit || ''}
                    onChange={(e) => setManualSignal(prev => ({ ...prev, takeProfit: parseFloat(e.target.value) }))}
                  />
                </div>
              </div>

              <Button
                onClick={handleExecuteSignal}
                disabled={executeSignalMutation.isPending}
                className="w-full"
                size="lg"
              >
                {executeSignalMutation.isPending ? 'Executing...' : 'Execute Trade'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}