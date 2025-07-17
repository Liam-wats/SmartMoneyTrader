import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';

interface TimeframeBias {
  timeframe: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  keyLevel: number;
  reason: string;
}

interface ConfluenceSignal {
  pair: string;
  direction: 'BULLISH' | 'BEARISH';
  confluenceCount: number;
  signals: string[];
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  confidence: number;
  timeframe: string;
}

interface TopDownAnalysis {
  pair: string;
  htfBias: TimeframeBias;
  ltfBias: TimeframeBias;
  confluenceSignals: ConfluenceSignal[];
  recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  overallConfidence: number;
}

export default function TopDownAnalysis() {
  const { toast } = useToast();
  const [selectedPair, setSelectedPair] = useState('EURUSD');

  const { data: analysis, isLoading, refetch } = useQuery<TopDownAnalysis>({
    queryKey: ['/api/top-down-analysis', selectedPair],
    enabled: false
  });

  const analysisMutation = useMutation({
    mutationFn: async (pair: string) => {
      const response = await fetch('/api/top-down-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair }),
      });
      
      if (!response.ok) throw new Error('Failed to perform analysis');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: `Top-down analysis completed for ${selectedPair}`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Failed to perform top-down analysis",
        variant: "destructive",
      });
    },
  });

  const runAnalysis = () => {
    analysisMutation.mutate(selectedPair);
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY': return 'bg-green-600 text-white';
      case 'BUY': return 'bg-green-500 text-white';
      case 'STRONG_SELL': return 'bg-red-600 text-white';
      case 'SELL': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getBiasIcon = (direction: string) => {
    switch (direction) {
      case 'BULLISH': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'BEARISH': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <>
      <Sidebar />
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Top-Down Analysis</h1>
              <p className="text-muted-foreground">Multi-timeframe SMC analysis with confluence detection</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={selectedPair} onValueChange={setSelectedPair}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select pair" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EURUSD">EURUSD</SelectItem>
                  <SelectItem value="GBPUSD">GBPUSD</SelectItem>
                  <SelectItem value="USDJPY">USDJPY</SelectItem>
                  <SelectItem value="AUDUSD">AUDUSD</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={runAnalysis}
                disabled={analysisMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {analysisMutation.isPending ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>
          </div>

          {analysisMutation.data && (
            <div className="space-y-6">
              {/* Overall Recommendation */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Overall Recommendation</span>
                    <Badge className={getRecommendationColor(analysisMutation.data?.recommendation || 'NEUTRAL')}>
                      {(analysisMutation.data?.recommendation || 'NEUTRAL').replace('_', ' ')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-2">Overall Confidence</p>
                      <Progress value={analysisMutation.data.overallConfidence * 100} className="h-3" />
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getConfidenceColor(analysisMutation.data.overallConfidence)}`}>
                        {(analysisMutation.data.overallConfidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeframe Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Higher Timeframe Bias */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>Higher Timeframe (4H)</span>
                      {getBiasIcon(analysisMutation.data.htfBias.direction)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Direction:</span>
                      <Badge className={analysisMutation.data.htfBias.direction === 'BULLISH' ? 'bg-green-500/20 text-green-400' : 
                                      analysisMutation.data.htfBias.direction === 'BEARISH' ? 'bg-red-500/20 text-red-400' : 
                                      'bg-gray-500/20 text-gray-400'}>
                        {analysisMutation.data.htfBias.direction}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Confidence:</span>
                        <span className={`font-medium ${getConfidenceColor(analysisMutation.data.htfBias.confidence)}`}>
                          {(analysisMutation.data.htfBias.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={analysisMutation.data.htfBias.confidence * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Key Level:</span>
                      <p className="font-mono font-medium">{analysisMutation.data.htfBias.keyLevel.toFixed(5)}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Reason:</span>
                      <p className="text-sm mt-1">{analysisMutation.data.htfBias.reason}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Lower Timeframe Bias */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>Mid Timeframe (1H)</span>
                      {getBiasIcon(analysisMutation.data.ltfBias.direction)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Direction:</span>
                      <Badge className={analysisMutation.data.ltfBias.direction === 'BULLISH' ? 'bg-green-500/20 text-green-400' : 
                                      analysisMutation.data.ltfBias.direction === 'BEARISH' ? 'bg-red-500/20 text-red-400' : 
                                      'bg-gray-500/20 text-gray-400'}>
                        {analysisMutation.data.ltfBias.direction}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Confidence:</span>
                        <span className={`font-medium ${getConfidenceColor(analysisMutation.data.ltfBias.confidence)}`}>
                          {(analysisMutation.data.ltfBias.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={analysisMutation.data.ltfBias.confidence * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Key Level:</span>
                      <p className="font-mono font-medium">{analysisMutation.data.ltfBias.keyLevel.toFixed(5)}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Reason:</span>
                      <p className="text-sm mt-1">{analysisMutation.data.ltfBias.reason}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Confluence Signals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="w-5 h-5" />
                    <span>High-Probability Confluence Signals</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Signals with 3+ confluences and minimum 2:1 risk-reward ratio
                  </p>
                </CardHeader>
                <CardContent>
                  {analysisMutation.data.confluenceSignals.length > 0 ? (
                    <div className="space-y-4">
                      {analysisMutation.data.confluenceSignals.map((signal, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg bg-muted/20">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Badge className={signal.direction === 'BULLISH' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                                {signal.direction}
                              </Badge>
                              <span className="font-medium">{signal.timeframe}</span>
                              <Badge variant="outline" className="text-xs">
                                {signal.confluenceCount} Confluences
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Confidence</p>
                              <p className={`font-bold ${getConfidenceColor(signal.confidence)}`}>
                                {(signal.confidence * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Entry Price</p>
                              <p className="font-mono font-medium">{signal.entryPrice.toFixed(5)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Stop Loss</p>
                              <p className="font-mono font-medium text-red-500">{signal.stopLoss.toFixed(5)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Take Profit</p>
                              <p className="font-mono font-medium text-green-500">{signal.takeProfit.toFixed(5)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Risk:Reward</p>
                              <p className="font-bold text-blue-500">1:{signal.riskRewardRatio.toFixed(1)}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Confluence Factors:</p>
                            <div className="flex flex-wrap gap-1">
                              {signal.signals.map((factor, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No high-probability signals found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Signals require 3+ confluences and 2:1 minimum risk-reward ratio
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!analysisMutation.data && !analysisMutation.isPending && (
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready for Analysis</h3>
                <p className="text-muted-foreground mb-4">
                  Select a currency pair and run comprehensive top-down analysis
                </p>
                <Button 
                  onClick={runAnalysis}
                  disabled={analysisMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}