import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Activity, Bell, Settings, Play, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  ema20: number;
  ema50: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  stochK: number;
  stochD: number;
  atr: number;
}

interface TradingSignal {
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  confidence: number;
  indicators: TechnicalIndicators;
  smcPatterns: any[];
  confirmations: string[];
  riskRewardRatio: number;
  timestamp: number;
}

export default function EnhancedSignals() {
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch enhanced signals
  const { data: signals = [], isLoading, error } = useQuery<TradingSignal[]>({
    queryKey: ['/api/enhanced-signals'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch signal history
  const { data: history = [] } = useQuery<any[]>({
    queryKey: ['/api/enhanced-signals/history'],
    refetchInterval: 60000, // Refetch every minute
  });

  // Test Telegram connection
  const testTelegramMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/telegram/test');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.connected ? 'Telegram Connected' : 'Telegram Not Connected',
        description: data.connected 
          ? 'Successfully connected to Telegram bot' 
          : 'Please check your Telegram bot configuration',
        variant: data.connected ? 'default' : 'destructive',
      });
    },
    onError: () => {
      toast({
        title: 'Connection Test Failed',
        description: 'Could not test Telegram connection',
        variant: 'destructive',
      });
    },
  });

  // Start/Stop monitoring
  const monitoringMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop') => {
      const res = await apiRequest('POST', `/api/enhanced-signals/${action}-monitoring`, { intervalMinutes: 15 });
      return res.json();
    },
    onSuccess: (data, action) => {
      setIsMonitoring(action === 'start');
      toast({
        title: action === 'start' ? 'Monitoring Started' : 'Monitoring Stopped',
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: 'Monitoring Error',
        description: 'Failed to change monitoring status',
        variant: 'destructive',
      });
    },
  });

  // Analyze specific pair
  const analyzePairMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/enhanced-signals/analyze', {
        pair: selectedPair,
        timeframe: selectedTimeframe,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-signals'] });
      toast({
        title: 'Analysis Complete',
        description: `${selectedPair} ${selectedTimeframe} analysis completed`,
      });
    },
    onError: () => {
      toast({
        title: 'Analysis Failed',
        description: 'Could not analyze the selected pair',
        variant: 'destructive',
      });
    },
  });

  // Analyze all pairs
  const analyzeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/enhanced-signals/analyze-all');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enhanced-signals'] });
      toast({
        title: 'Full Analysis Complete',
        description: 'All currency pairs have been analyzed',
      });
    },
    onError: () => {
      toast({
        title: 'Analysis Failed',
        description: 'Could not analyze all pairs',
        variant: 'destructive',
      });
    },
  });

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getDirectionIcon = (direction: 'BUY' | 'SELL') => {
    return direction === 'BUY' ? 
      <TrendingUp className="w-4 h-4 text-green-500" /> : 
      <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const formatPrice = (price: number) => price.toFixed(5);
  const formatRR = (rr: number) => `1:${rr.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Signal Detection</h1>
          <p className="text-muted-foreground">
            Comprehensive technical analysis with SMC patterns, RSI, MACD, and more
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => testTelegramMutation.mutate()}
            disabled={testTelegramMutation.isPending}
          >
            <Bell className="w-4 h-4 mr-2" />
            Test Telegram
          </Button>
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
            onClick={() => monitoringMutation.mutate(isMonitoring ? 'stop' : 'start')}
            disabled={monitoringMutation.isPending}
          >
            {isMonitoring ? <Square className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Analysis Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select value={selectedPair} onValueChange={setSelectedPair}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency pair" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EURUSD">EUR/USD</SelectItem>
                  <SelectItem value="GBPUSD">GBP/USD</SelectItem>
                  <SelectItem value="USDJPY">USD/JPY</SelectItem>
                  <SelectItem value="AUDUSD">AUD/USD</SelectItem>
                  <SelectItem value="USDCHF">USD/CHF</SelectItem>
                  <SelectItem value="NZDUSD">NZD/USD</SelectItem>
                  <SelectItem value="USDCAD">USD/CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => analyzePairMutation.mutate()}
              disabled={analyzePairMutation.isPending}
            >
              Analyze Pair
            </Button>
            <Button
              variant="outline"
              onClick={() => analyzeAllMutation.mutate()}
              disabled={analyzeAllMutation.isPending}
            >
              Analyze All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="signals" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signals">Trading Signals</TabsTrigger>
          <TabsTrigger value="indicators">Technical Indicators</TabsTrigger>
          <TabsTrigger value="history">Signal History</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading signals...</div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load signals. Please try again.</AlertDescription>
            </Alert>
          ) : signals.length === 0 ? (
            <Alert>
              <AlertDescription>No high-confidence signals detected at this time.</AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {signals.map((signal, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getDirectionIcon(signal.direction)}
                        <span className="font-semibold text-lg">{signal.pair}</span>
                        <Badge variant="secondary">{signal.timeframe}</Badge>
                        <Badge variant={signal.direction === 'BUY' ? 'default' : 'destructive'}>
                          {signal.direction}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Confidence</div>
                          <div className="font-semibold">{signal.confidence.toFixed(1)}%</div>
                        </div>
                        <Progress 
                          value={signal.confidence} 
                          className={`w-16 h-2 ${getConfidenceColor(signal.confidence)}`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Price Levels */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Entry</div>
                        <div className="font-semibold">{formatPrice(signal.entryPrice)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Take Profit</div>
                        <div className="font-semibold text-green-600">{formatPrice(signal.takeProfitPrice)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Stop Loss</div>
                        <div className="font-semibold text-red-600">{formatPrice(signal.stopLossPrice)}</div>
                      </div>
                    </div>

                    <Separator />

                    {/* Risk/Reward & Confirmations */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Risk/Reward</div>
                        <Badge variant="outline">{formatRR(signal.riskRewardRatio)}</Badge>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">SMC Patterns</div>
                        <div className="flex flex-wrap gap-1">
                          {signal.smcPatterns.map((pattern, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {pattern.type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Confirmations */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Technical Confirmations</div>
                      <div className="text-sm space-y-1">
                        {signal.confirmations.map((confirmation, i) => (
                          <div key={i} className="flex items-center text-green-600">
                            <span className="mr-2">✓</span>
                            {confirmation}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-muted-foreground">
                      Generated: {new Date(signal.timestamp).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="indicators" className="space-y-4">
          {signals.length > 0 && (
            <div className="grid gap-4">
              {signals.map((signal, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      {signal.pair} - Technical Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">RSI</div>
                        <div className="font-semibold">{signal.indicators.rsi.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">MACD</div>
                        <div className="font-semibold">{signal.indicators.macd.toFixed(4)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Stoch K</div>
                        <div className="font-semibold">{signal.indicators.stochK.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">ATR</div>
                        <div className="font-semibold">{signal.indicators.atr.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">SMA 20</div>
                        <div className="font-semibold">{signal.indicators.sma20.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">EMA 20</div>
                        <div className="font-semibold">{signal.indicators.ema20.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">BB Upper</div>
                        <div className="font-semibold">{signal.indicators.bbUpper.toFixed(5)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">BB Lower</div>
                        <div className="font-semibold">{signal.indicators.bbLower.toFixed(5)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <Alert>
              <AlertDescription>No signal history available.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {history.map((entry, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{entry.pair}</Badge>
                    <Badge variant="secondary">{entry.timeframe}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(entry.lastSignalTime).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}