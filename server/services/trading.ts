import { Trade, Strategy } from '@shared/schema';
import { marketDataService } from './marketData';
import { smcDetectionService } from './smcDetection';

export interface TradingSignal {
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

export class TradingService {
  private activeStrategies: Map<number, Strategy> = new Map();
  private signalCallbacks: ((signal: TradingSignal) => void)[] = [];

  startStrategy(strategy: Strategy): void {
    this.activeStrategies.set(strategy.id, strategy);
    
    // Subscribe to market data for analysis
    const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];
    
    pairs.forEach(pair => {
      marketDataService.subscribeToPrice(pair, async (price) => {
        await this.analyzeMarket(pair, strategy);
      });
    });
  }

  stopStrategy(strategyId: number): void {
    this.activeStrategies.delete(strategyId);
    // Unsubscribe from market data if no active strategies
    if (this.activeStrategies.size === 0) {
      const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];
      pairs.forEach(pair => {
        marketDataService.unsubscribeFromPrice(pair);
      });
    }
  }

  onSignal(callback: (signal: TradingSignal) => void): void {
    this.signalCallbacks.push(callback);
  }

  private async analyzeMarket(pair: string, strategy: Strategy): Promise<void> {
    try {
      // Get recent market data
      const historicalData = await marketDataService.getHistoricalData(pair, '1h', 100);
      
      // Detect SMC patterns
      const patterns = smcDetectionService.detectPatterns(historicalData, pair, '1h');
      
      // Generate trading signals
      for (const pattern of patterns) {
        if (this.shouldGenerateSignal(pattern, strategy)) {
          const signal = await this.createTradingSignal(pattern, pair, strategy);
          if (signal) {
            this.notifySignal(signal);
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing market:', error);
    }
  }

  private shouldGenerateSignal(pattern: any, strategy: Strategy): boolean {
    // Check strategy settings
    if (pattern.type === 'BOS' && !strategy.bosConfirmation) return false;
    if (pattern.type === 'FVG' && !strategy.fvgTrading) return false;
    if (pattern.type === 'LS' && !strategy.liquiditySweeps) return false;
    if (pattern.type === 'OB' && !strategy.orderBlockFilter) return false;

    // Check confidence threshold
    if (pattern.confidence < 0.75) return false;

    return true;
  }

  private async createTradingSignal(
    pattern: any,
    pair: string,
    strategy: Strategy
  ): Promise<TradingSignal | null> {
    try {
      const currentPrice = await marketDataService.getRealtimePrice(pair);
      const stopLoss = strategy.stopLoss || 50;
      const takeProfit = strategy.takeProfit || 100;

      let type: 'BUY' | 'SELL';
      let stopLossPrice: number;
      let takeProfitPrice: number;

      if (pattern.direction === 'BULLISH') {
        type = 'BUY';
        stopLossPrice = currentPrice - (stopLoss * 0.0001);
        takeProfitPrice = currentPrice + (takeProfit * 0.0001);
      } else {
        type = 'SELL';
        stopLossPrice = currentPrice + (stopLoss * 0.0001);
        takeProfitPrice = currentPrice - (takeProfit * 0.0001);
      }

      // Calculate position size based on risk percentage
      const riskAmount = 10000 * (strategy.riskPercentage || 2) / 100;
      const riskPerTrade = Math.abs(currentPrice - stopLossPrice);
      const size = riskAmount / riskPerTrade;

      return {
        pair,
        type,
        entryPrice: currentPrice,
        stopLoss: stopLossPrice,
        takeProfit: takeProfitPrice,
        size: Math.round(size * 100) / 100, // Round to 2 decimal places
        confidence: pattern.confidence,
        pattern: pattern.type,
        reason: pattern.description,
      };
    } catch (error) {
      console.error('Error creating trading signal:', error);
      return null;
    }
  }

  private notifySignal(signal: TradingSignal): void {
    this.signalCallbacks.forEach(callback => {
      try {
        callback(signal);
      } catch (error) {
        console.error('Error in signal callback:', error);
      }
    });
  }

  async executeTrade(signal: TradingSignal): Promise<boolean> {
    try {
      // In a real implementation, this would place a trade with a broker
      // For now, we'll just simulate the trade execution
      console.log(`Executing trade: ${signal.type} ${signal.size} ${signal.pair} at ${signal.entryPrice}`);
      
      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Error executing trade:', error);
      return false;
    }
  }

  async closeTrade(tradeId: number): Promise<boolean> {
    try {
      // In a real implementation, this would close a trade with a broker
      console.log(`Closing trade: ${tradeId}`);
      
      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Error closing trade:', error);
      return false;
    }
  }
}

export const tradingService = new TradingService();
