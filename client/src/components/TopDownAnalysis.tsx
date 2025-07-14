import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface TopDownAnalysisData {
  pair: string;
  mainTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  timeframes: {
    [key: string]: {
      trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
      patterns: any[];
      confidence: number;
      keyLevels: number[];
    };
  };
  entryZones: {
    bullish: number[];
    bearish: number[];
  };
  exitZones: {
    bullish: number[];
    bearish: number[];
  };
  confluenceScore: number;
}

interface TopDownAnalysisProps {
  pair: string;
}

export default function TopDownAnalysis({ pair }: TopDownAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: analysis, refetch } = useQuery({
    queryKey: ['/api/top-down-analysis', pair],
    queryFn: async () => {
      const response = await apiRequest('/api/top-down-analysis', {
        method: 'POST',
        body: { pair },
      });
      return response as TopDownAnalysisData;
    },
    enabled: false,
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    await refetch();
    setIsAnalyzing(false);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'BULLISH':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'BEARISH':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'BULLISH':
        return 'bg-green-500';
      case 'BEARISH':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const timeframeOrder = ['1d', '4h', '1h', '30m', '15m', '5m'];

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5" />
            Top-Down Analysis
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
        {analysis && (
          <>
            {/* Main Trend Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Main Trend</h3>
                <div className="flex items-center gap-2">
                  {getTrendIcon(analysis.mainTrend)}
                  <span className="text-white font-medium">{analysis.mainTrend}</span>
                  <Badge variant="outline" className="ml-2">
                    {analysis.pair}
                  </Badge>
                </div>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Confluence Score</h3>
                <div className="space-y-2">
                  <Progress 
                    value={analysis.confluenceScore * 100} 
                    className="w-full"
                  />
                  <span className="text-sm text-gray-400">
                    {(analysis.confluenceScore * 100).toFixed(1)}% alignment
                  </span>
                </div>
              </div>
            </div>

            {/* Timeframe Analysis */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Timeframe Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {timeframeOrder.map((timeframe) => {
                  const tf = analysis.timeframes[timeframe];
                  if (!tf) return null;
                  
                  return (
                    <div key={timeframe} className="bg-gray-800 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">{timeframe}</span>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(tf.trend)}
                          <span className="text-xs text-gray-400">
                            {(tf.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className={`h-2 rounded-full ${getTrendColor(tf.trend)}`} 
                             style={{ width: `${tf.confidence * 100}%` }} />
                        <div className="text-xs text-gray-400">
                          {tf.patterns.length} patterns • {tf.keyLevels.length} levels
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Entry/Exit Zones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Bullish Zones
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-400">Entry Zones:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysis.entryZones.bullish.map((level, i) => (
                        <Badge key={i} variant="outline" className="text-green-500 border-green-500">
                          {level.toFixed(4)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Exit Zones:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysis.exitZones.bullish.map((level, i) => (
                        <Badge key={i} variant="outline" className="text-green-400 border-green-400">
                          {level.toFixed(4)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  Bearish Zones
                </h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-400">Entry Zones:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysis.entryZones.bearish.map((level, i) => (
                        <Badge key={i} variant="outline" className="text-red-500 border-red-500">
                          {level.toFixed(4)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">Exit Zones:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysis.exitZones.bearish.map((level, i) => (
                        <Badge key={i} variant="outline" className="text-red-400 border-red-400">
                          {level.toFixed(4)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Analysis Summary
              </h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p>• Main trend is <strong>{analysis.mainTrend}</strong> with {(analysis.confluenceScore * 100).toFixed(1)}% confluence</p>
                <p>• {Object.keys(analysis.timeframes).length} timeframes analyzed</p>
                <p>• {analysis.entryZones.bullish.length + analysis.entryZones.bearish.length} entry zones identified</p>
                <p>• {analysis.exitZones.bullish.length + analysis.exitZones.bearish.length} exit zones mapped</p>
              </div>
            </div>
          </>
        )}

        {!analysis && !isAnalyzing && (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Click "Analyze" to perform top-down analysis</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}