import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  RefreshCw, 
  Maximize2,
  Settings,
  Play,
  Pause
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingChartProps {
  pair: string;
  timeframe: string;
  onPairChange: (pair: string) => void;
  onTimeframeChange: (timeframe: string) => void;
}

export default function ModernTradingChart({ 
  pair, 
  timeframe, 
  onPairChange, 
  onTimeframeChange 
}: TradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
  const { data: candles = [], isLoading, refetch } = useQuery<CandleData[]>({
    queryKey: [`/api/market-data/${pair}`, timeframe, '100'],
    queryFn: async () => {
      const response = await fetch(`/api/market-data/${pair}?timeframe=${timeframe}&limit=100`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: isPlaying ? 5000 : false,
  });

  const { data: priceData } = useQuery<{ price: number }>({
    queryKey: [`/api/market-data/${pair}/price`],
    queryFn: async () => {
      const response = await fetch(`/api/market-data/${pair}/price`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: isPlaying ? 2000 : false,
  });

  useEffect(() => {
    if (priceData?.price) {
      setCurrentPrice(priceData.price);
    }
  }, [priceData]);

  useEffect(() => {
    if (candles.length > 0 && canvasRef.current) {
      drawChart();
    }
  }, [candles, currentPrice]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const { width, height } = canvas;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.fillStyle = '#0f0f17';
    ctx.fillRect(0, 0, width, height);

    // Calculate price range
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Draw grid
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = padding + (chartHeight * i) / 10;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth * i) / 10;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw price labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const price = maxPrice - (priceRange * i) / 10;
      const y = padding + (chartHeight * i) / 10;
      ctx.fillText(price.toFixed(5), padding - 10, y + 4);
    }

    // Draw candlesticks
    const candleWidth = chartWidth / candles.length * 0.6;
    candles.forEach((candle, index) => {
      const x = padding + (chartWidth * index) / candles.length;
      const openY = padding + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight;
      const closeY = padding + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight;
      const highY = padding + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight;
      const lowY = padding + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight;

      const isBullish = candle.close > candle.open;
      ctx.strokeStyle = isBullish ? '#10b981' : '#ef4444';
      ctx.fillStyle = isBullish ? '#10b981' : '#ef4444';

      // Draw wick
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth/2, highY);
      ctx.lineTo(x + candleWidth/2, lowY);
      ctx.stroke();

      // Draw body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.abs(closeY - openY);
      
      if (isBullish) {
        ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
      } else {
        ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
      }
    });

    // Draw current price line
    if (currentPrice) {
      const priceY = padding + chartHeight - ((currentPrice - minPrice) / priceRange) * chartHeight;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, priceY);
      ctx.lineTo(width - padding, priceY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(width - padding - 70, priceY - 10, 60, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(currentPrice.toFixed(5), width - padding - 65, priceY + 4);
    }
  };

  const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD'];
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  const lastCandle = candles[candles.length - 1];
  const priceChange = lastCandle ? (lastCandle.close || 0) - (lastCandle.open || 0) : 0;
  const isPositive = priceChange > 0;

  return (
    <Card className="trading-card-elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Trading Chart</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <select 
                value={pair} 
                onChange={(e) => onPairChange(e.target.value)}
                className="trading-button-secondary text-sm"
              >
                {pairs.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              
              <select 
                value={timeframe} 
                onChange={(e) => onTimeframeChange(e.target.value)}
                className="trading-button-secondary text-sm"
              >
                {timeframes.map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {currentPrice && (
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold trading-mono">
                  {currentPrice.toFixed(5)}
                </span>
                <div className={cn(
                  "flex items-center space-x-1 text-sm",
                  isPositive ? "text-green-400" : "text-red-400"
                )}>
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(priceChange).toFixed(5)}</span>
                </div>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className={cn(
                "text-xs",
                isPlaying ? "text-green-400" : "text-yellow-400"
              )}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="chart-container">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading chart data...</p>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ width: '100%', height: '400px' }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}