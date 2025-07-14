import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMarketData, usePrice } from '@/hooks/useMarketData';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';

interface TradingChartProps {
  pair: string;
  timeframe: string;
  onPairChange: (pair: string) => void;
  onTimeframeChange: (timeframe: string) => void;
}

export default function TradingChart({
  pair,
  timeframe,
  onPairChange,
  onTimeframeChange,
}: TradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data: marketData, isLoading } = useMarketData(pair, timeframe);
  const { data: priceData } = usePrice(pair);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  // Get SMC patterns
  const { data: patterns } = useQuery({
    queryKey: ['/api/smc-analysis'],
    queryFn: async () => {
      const response = await fetch('/api/smc-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair, timeframe, limit: 100 }),
      });
      return response.json();
    },
    enabled: !!pair,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (priceData?.price) {
      setCurrentPrice(priceData.price);
    }
  }, [priceData]);

  useEffect(() => {
    if (marketData && canvasRef.current) {
      drawChart();
    }
  }, [marketData, patterns]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !marketData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up dimensions
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Calculate price range
    const prices = marketData.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 8; i++) {
      const y = padding + (i * chartHeight) / 8;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 12; i++) {
      const x = padding + (i * chartWidth) / 12;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw candlesticks
    const candleWidth = chartWidth / marketData.length * 0.8;
    
    marketData.forEach((candle, index) => {
      const x = padding + (index * chartWidth) / marketData.length;
      const openY = padding + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const highY = padding + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = padding + ((maxPrice - candle.low) / priceRange) * chartHeight;
      const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight;

      // Draw wick
      ctx.strokeStyle = candle.close > candle.open ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body
      ctx.fillStyle = candle.close > candle.open ? '#10b981' : '#ef4444';
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);
      ctx.fillRect(x, bodyTop, candleWidth, Math.max(bodyHeight, 1));
    });

    // Draw SMC patterns
    if (patterns) {
      patterns.forEach((pattern: any) => {
        const y = padding + ((maxPrice - pattern.price) / priceRange) * chartHeight;
        
        ctx.fillStyle = pattern.type === 'BOS' ? 'rgba(239, 68, 68, 0.6)' :
                        pattern.type === 'FVG' ? 'rgba(59, 130, 246, 0.4)' :
                        pattern.type === 'OB' ? 'rgba(34, 197, 94, 0.4)' :
                        'rgba(245, 158, 11, 0.4)';
        
        ctx.fillRect(padding + 50, y - 10, 80, 20);
        
        // Pattern label
        ctx.fillStyle = pattern.type === 'BOS' ? '#ef4444' :
                        pattern.type === 'FVG' ? '#3b82f6' :
                        pattern.type === 'OB' ? '#22c55e' :
                        '#f59e0b';
        ctx.font = '12px Inter';
        ctx.fillText(pattern.type, padding + 55, y + 4);
      });
    }

    // Draw price labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px JetBrains Mono';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 8; i++) {
      const price = maxPrice - (i * priceRange) / 8;
      const y = padding + (i * chartHeight) / 8;
      ctx.fillText(price.toFixed(4), width - 10, y + 4);
    }
  };

  const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  return (
    <Card className="trading-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <select
                value={pair}
                onChange={(e) => onPairChange(e.target.value)}
                className="trading-input text-lg font-semibold"
              >
                {pairs.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <div className="text-sm text-muted-foreground">
                {currentPrice.toFixed(4)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {timeframes.map(tf => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'secondary'}
                size="sm"
                onClick={() => onTimeframeChange(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="chart-container">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading market data...</p>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              className="w-full h-96 bg-background rounded-lg border border-border"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
