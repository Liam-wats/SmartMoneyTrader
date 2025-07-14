export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataService {
  getRealtimePrice(pair: string): Promise<number>;
  getHistoricalData(pair: string, timeframe: string, limit: number): Promise<CandleData[]>;
  subscribeToPrice(pair: string, callback: (price: number) => void): void;
  unsubscribeFromPrice(pair: string): void;
}

export class BinanceMarketDataService implements MarketDataService {
  private priceSubscriptions: Map<string, (price: number) => void> = new Map();
  private priceIntervals: Map<string, NodeJS.Timeout> = new Map();

  async getRealtimePrice(pair: string): Promise<number> {
    try {
      const symbol = pair.replace('/', '');
      const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, {
        timeout: 5000,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.warn('Binance API unavailable, using mock data for', pair);
      return this.getMockPrice(pair);
    }
  }

  async getHistoricalData(pair: string, timeframe: string, limit: number = 100): Promise<CandleData[]> {
    try {
      const symbol = pair.replace('/', '');
      const interval = this.timeframeToInterval(timeframe);
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if data is an array before processing
      if (!Array.isArray(data)) {
        console.warn('API returned non-array data, using mock data for', pair);
        return this.getMockHistoricalData(pair, limit);
      }
      
      return data.map((kline: any[]) => ({
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      console.warn('Binance API unavailable, using mock data for', pair);
      return this.getMockHistoricalData(pair, limit);
    }
  }

  subscribeToPrice(pair: string, callback: (price: number) => void): void {
    this.priceSubscriptions.set(pair, callback);
    
    // Simulate real-time price updates
    const interval = setInterval(async () => {
      const price = await this.getRealtimePrice(pair);
      callback(price);
    }, 1000);
    
    this.priceIntervals.set(pair, interval);
  }

  unsubscribeFromPrice(pair: string): void {
    this.priceSubscriptions.delete(pair);
    const interval = this.priceIntervals.get(pair);
    if (interval) {
      clearInterval(interval);
      this.priceIntervals.delete(pair);
    }
  }

  private timeframeToInterval(timeframe: string): string {
    const mapping: { [key: string]: string } = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
    };
    return mapping[timeframe] || '1h';
  }

  private getMockPrice(pair: string): number {
    const prices: { [key: string]: number } = {
      'EURUSD': 1.0847,
      'GBPUSD': 1.2634,
      'USDJPY': 149.85,
      'AUDUSD': 0.6598,
      'USDCHF': 0.9234,
      'EURJPY': 162.45,
      'GBPJPY': 189.23,
      'EURGBP': 0.8567,
    };
    
    const basePrice = prices[pair] || 1.0;
    // Add small random variation
    const variation = (Math.random() - 0.5) * 0.001;
    return basePrice + variation;
  }

  private getMockHistoricalData(pair: string, limit: number): CandleData[] {
    const basePrice = this.getMockPrice(pair);
    const data: CandleData[] = [];
    const now = Date.now();
    
    for (let i = limit; i > 0; i--) {
      const timestamp = now - (i * 3600000); // 1 hour intervals
      const priceVariation = (Math.random() - 0.5) * 0.01;
      const open = basePrice + priceVariation;
      const high = open + Math.random() * 0.005;
      const low = open - Math.random() * 0.005;
      const close = open + (Math.random() - 0.5) * 0.003;
      const volume = Math.random() * 1000000;
      
      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      });
    }
    
    return data;
  }
}

export const marketDataService = new BinanceMarketDataService();
