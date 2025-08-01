import { marketHoursService } from './marketHours';

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
  getMarketStatus(): { isOpen: boolean; currentSession: string | null };
}

export class TwelveDataMarketDataService implements MarketDataService {
  private priceSubscriptions: Map<string, (price: number) => void> = new Map();
  private priceIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly API_KEY = process.env.TWELVEDATA_API_KEY || '670c76c15401482e939dff52a32d6fe8';
  private rateLimitCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache to avoid rate limits
  private readonly MAX_RETRIES = 3;

  async getRealtimePrice(pair: string): Promise<number> {
    // Check if market is open
    const marketStatus = marketHoursService.getMarketStatus();
    if (!marketStatus.isOpen) {
      // Return last cached price if market is closed
      const cached = this.rateLimitCache.get(pair);
      if (cached) {
        return cached.price;
      }
      return this.getMockPrice(pair);
    }

    // Check cache first to avoid rate limiting
    const cached = this.rateLimitCache.get(pair);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.price;
    }

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`https://api.twelvedata.com/price?symbol=${pair}&apikey=${this.API_KEY}`, {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('TwelveData API rate limit exceeded, using cached data for', pair);
            return cached?.price || this.getMockPrice(pair);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check for API error responses
        if (data.code === 429 || data.status === 'error') {
          console.warn('TwelveData API rate limit exceeded, using cached data for', pair);
          return cached?.price || this.getMockPrice(pair);
        }
        
        if (data.price && !isNaN(parseFloat(data.price))) {
          const price = parseFloat(data.price);
          // Cache the result
          this.rateLimitCache.set(pair, { price, timestamp: Date.now() });
          return price;
        }
        
        throw new Error('Invalid response format: ' + JSON.stringify(data));
      } catch (error) {
        if (attempt === this.MAX_RETRIES - 1) {
          console.warn(`TwelveData API failed after ${this.MAX_RETRIES} attempts for ${pair}, using cached data:`, error);
          return cached?.price || this.getMockPrice(pair);
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    return this.getMockPrice(pair);
  }

  async getHistoricalData(pair: string, timeframe: string, limit: number = 100): Promise<CandleData[]> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const interval = this.timeframeToTwelveDataInterval(timeframe);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${pair}&interval=${interval}&outputsize=${limit}&apikey=${this.API_KEY}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('TwelveData API rate limit exceeded for historical data, using mock data for', pair);
            return this.getMockHistoricalData(pair, limit);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check for API error responses
        if (data.code === 429 || data.status === 'error') {
          console.warn('TwelveData API rate limit exceeded for historical data, using mock data for', pair);
          return this.getMockHistoricalData(pair, limit);
        }
        
        // Check if data has values array
        if (!data.values || !Array.isArray(data.values) || data.values.length === 0) {
          throw new Error('Invalid response format: missing or empty values array');
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
        if (attempt === this.MAX_RETRIES - 1) {
          console.warn(`TwelveData API failed after ${this.MAX_RETRIES} attempts for historical data ${pair}, using mock data:`, error);
          return this.getMockHistoricalData(pair, limit);
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    return this.getMockHistoricalData(pair, limit);
  }

  subscribeToPrice(pair: string, callback: (price: number) => void): void {
    this.priceSubscriptions.set(pair, callback);
    
    // Real-time price updates with market hours checking
    const interval = setInterval(async () => {
      try {
        const price = await this.getRealtimePrice(pair);
        callback(price);
      } catch (error) {
        console.error('Error in price subscription for', pair, error);
      }
    }, 2000); // 2 second intervals to reduce API calls
    
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

  getMarketStatus(): { isOpen: boolean; currentSession: string | null } {
    const status = marketHoursService.getMarketStatus();
    return {
      isOpen: status.isOpen,
      currentSession: status.currentSession
    };
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
