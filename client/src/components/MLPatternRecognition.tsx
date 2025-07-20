import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, TrendingDown, Zap, Target } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface MLPatternPrediction {
  pattern: 'BOS' | 'CHoCH' | 'FVG' | 'OB' | 'LS';
  direction: 'BULLISH' | 'BEARISH';
  confidence: number;
  probability: number;
  strength: number;
  timeframe: string;
  features: {
    priceChange: number;
    volatility: number;
    volume: number;
    volumeMA: number;
    rsi: number;
    orderFlow: number;
    liquidityIndex: number;
    marketStrength: number;
    structuralBreak: boolean;
    sessionType: string;
  };
}

interface MLPatternRecognitionProps {
  pair: string;
  timeframe: string;
}

export default function MLPatternRecognition({ pair, timeframe }: MLPatternRecognitionProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: predictions, refetch } = useQuery({
    queryKey: ['/api/ml-pattern-analysis', pair, timeframe],
    queryFn: async () => {
      const response = await fetch('/api/ml-pattern-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pair, timeframe, limit: 100 }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json() as Promise<MLPatternPrediction[]>;
    },
    enabled: false,
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    await refetch();
    setIsAnalyzing(false);
  };

  const getPatternIcon = (pattern: string) => {
    switch (pattern) {
      case 'BOS':
        return <TrendingUp className="w-4 h-4" />;
      case 'FVG':
        return <Target className="w-4 h-4" />;
      case 'OB':
        return <Zap className="w-4 h-4" />;
      case 'LS':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getPatternName = (pattern: string) => {
    switch (pattern) {
      case 'BOS':
        return 'Break of Structure';
      case 'CHoCH':
        return 'Change of Character';
      case 'FVG':
        return 'Fair Value Gap';
      case 'OB':
        return 'Order Block';
      case 'LS':
        return 'Liquidity Sweep';
      default:
        return pattern;
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'BULLISH' ? 'text-green-500' : 'text-red-500';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStrengthLevel = (strength: number) => {
    if (strength >= 0.8) return 'High';
    if (strength >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5" />
            ML Pattern Recognition
          </CardTitle>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="trading-button-primary"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {predictions && predictions.length > 0 ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Patterns Detected</h3>
                <div className="text-2xl font-bold text-blue-400">
                  {predictions.length}
                </div>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Avg Confidence</h3>
                <div className="text-2xl font-bold text-green-400">
                  {(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-2">High Strength</h3>
                <div className="text-2xl font-bold text-yellow-400">
                  {predictions.filter(p => p.strength >= 0.8).length}
                </div>
              </div>
            </div>

            {/* Pattern Predictions */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Pattern Predictions</h3>
              <div className="space-y-3">
                {predictions.map((prediction, index) => (
                  <div key={index} className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {getPatternIcon(prediction.pattern)}
                        <span className="text-white font-medium">
                          {getPatternName(prediction.pattern)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`${getDirectionColor(prediction.direction)} border-current`}
                        >
                          {prediction.direction}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getConfidenceColor(prediction.confidence)}`}>
                          {(prediction.confidence * 100).toFixed(1)}% confidence
                        </div>
                        <div className="text-xs text-gray-400">
                          {getStrengthLevel(prediction.strength)} strength
                        </div>
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-2 mb-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Confidence</span>
                          <span className="text-white">{(prediction.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={prediction.confidence * 100} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Probability</span>
                          <span className="text-white">{(prediction.probability * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={prediction.probability * 100} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Strength</span>
                          <span className="text-white">{(prediction.strength * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={prediction.strength * 100} className="h-2" />
                      </div>
                    </div>

                    {/* Key Features */}
                    <div className="border-t border-gray-700 pt-3">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Key Features</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">RSI:</span>
                          <span className="text-white ml-1">{prediction.features.rsi.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Volatility:</span>
                          <span className="text-white ml-1">{(prediction.features.volatility * 100).toFixed(2)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Volume Ratio:</span>
                          <span className="text-white ml-1">
                            {(prediction.features.volume / prediction.features.volumeMA).toFixed(2)}x
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Market Strength:</span>
                          <span className="text-white ml-1">
                            {(prediction.features.marketStrength * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Order Flow:</span>
                          <span className={`ml-1 ${prediction.features.orderFlow > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {prediction.features.orderFlow > 0 ? '+' : ''}{prediction.features.orderFlow.toFixed(0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Liquidity Index:</span>
                          <span className="text-white ml-1">{prediction.features.liquidityIndex.toFixed(0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Session:</span>
                          <span className="text-white ml-1">{prediction.features.sessionType}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Structural Break:</span>
                          <span className={`ml-1 ${prediction.features.structuralBreak ? 'text-green-400' : 'text-gray-400'}`}>
                            {prediction.features.structuralBreak ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : predictions && predictions.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No high-confidence patterns detected</p>
            <p className="text-sm text-gray-500 mt-2">
              Try analyzing different timeframes or market conditions
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Click "Analyze" to run ML pattern recognition</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}