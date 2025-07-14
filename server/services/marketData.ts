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

export class TwelveDataMarketDataService implements MarketDataService {
  private priceSubscriptions: Map<string, (price: number) => void> = new Map();
  private priceIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly API_KEY = '670c76c15401482e939dff52a32d6fe8';
  private rateLimitCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache to avoid rate limits

  async getRealtimePrice(pair: string): Promise<number> {
    // Check cache first to avoid rate limiting
    const cached = this.rateLimitCache.get(pair);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    try {
      const response = await fetch(`https://api.twelvedata.com/price?symbol=${pair}&apikey=${this.API_KEY}`, {
        timeout: 5000,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check for rate limit error
      if (data.code === 429) {
        console.warn('TwelveData API rate limit exceeded, using mock data for', pair);
        return this.getMockPrice(pair);
      }
      
      if (data.price) {
        const price = parseFloat(data.price);
        // Cache the result
        this.rateLimitCache.set(pair, { price, timestamp: Date.now() });
        return price;
      }
      throw new Error('Invalid response format');
    } catch (error) {
      console.warn('TwelveData API unavailable, using mock data for', pair);
      return this.getMockPrice(pair);
    }
  }

  async getHistoricalData(pair: string, timeframe: string, limit: number = 100): Promise<CandleData[]> {
    try {
      const interval = this.timeframeToTwelveDataInterval(timeframe);
      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${pair}&interval=${interval}&outputsize=${limit}&apikey=${this.API_KEY}`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if data has values array
      if (!data.values || !Array.isArray(data.values)) {
        console.warn('TwelveData API returned invalid data format, using mock data for', pair);
        return this.getMockHistoricalData(pair, limit);
      }
      
      return data.values.map((candle: any) => ({
        timestamp: new Date(candle.datetime).getTime(),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume || '0'),
      })).reverse(); // TwelveData returns newest first, we want oldest first
    } catch (error) {
      console.warn('TwelveData API unavailable, using mock data for', pair);
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

  private timeframeToTwelveDataInterval(timeframe: string): string {
    const mapping: { [key: string]: string } = {
      '1m': '1min',
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '1h',
      '4h': '4h',
      '1d': '1day',
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

export const marketDataService = new TwelveDataMarketDataService();
