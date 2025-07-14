import { CandleData } from './marketData';
import { SMCDetectionService } from './smcDetection';
import { Strategy } from '@shared/schema';

export interface BacktestTrade {
  entryTime: number;
  exitTime?: number;
  entryPrice: number;
  exitPrice?: number;
  type: 'BUY' | 'SELL';
  size: number;
  pnl?: number;
  pattern: string;
  reason?: string;
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  totalPnL: number;
  trades: BacktestTrade[];
  equityCurve: { timestamp: number; equity: number }[];
}

export class BacktestingService {
  private smcDetection = new SMCDetectionService();

  async runBacktest(
    data: CandleData[],
    strategy: Strategy,
    initialBalance: number = 10000
  ): Promise<BacktestResult> {
    const trades: BacktestTrade[] = [];
    const equityCurve: { timestamp: number; equity: number }[] = [];
    let currentBalance = initialBalance;
    let activeTrades: BacktestTrade[] = [];
    let maxBalance = initialBalance;
    let maxDrawdown = 0;

    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 20; i < sortedData.length; i++) {
      const currentCandle = sortedData[i];
      const historicalData = sortedData.slice(0, i + 1);
      
      // Check for exit conditions on active trades
      activeTrades = this.checkExitConditions(activeTrades, currentCandle);
      
      // Calculate current equity
      const unrealizedPnL = activeTrades.reduce((sum, trade) => {
        const currentPrice = currentCandle.close;
        const unrealized = trade.type === 'BUY' 
          ? (currentPrice - trade.entryPrice) * trade.size
          : (trade.entryPrice - currentPrice) * trade.size;
        return sum + unrealized;
      }, 0);
      
      const currentEquity = currentBalance + unrealizedPnL;
      equityCurve.push({ timestamp: currentCandle.timestamp, equity: currentEquity });
      
      // Update max balance and drawdown
      if (currentEquity > maxBalance) {
        maxBalance = currentEquity;
      }
      const drawdown = (maxBalance - currentEquity) / maxBalance;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      // Detect SMC patterns
      const patterns = this.smcDetection.detectPatterns(
        historicalData.slice(-50),
        'EURUSD',
        '1h'
      );

      // Generate trading signals
      for (const pattern of patterns) {
        if (this.shouldTrade(pattern, strategy, activeTrades)) {
          const trade = this.createTrade(pattern, currentCandle, strategy, currentBalance);
          if (trade) {
            activeTrades.push(trade);
          }
        }
      }

      // Close completed trades
      const completedTrades = activeTrades.filter(t => t.exitTime);
      for (const trade of completedTrades) {
        trades.push(trade);
        currentBalance += trade.pnl || 0;
      }
      
      // Keep only active trades
      activeTrades = activeTrades.filter(t => !t.exitTime);
    }

    return this.calculateResults(trades, equityCurve, initialBalance, maxDrawdown);
  }

  private shouldTrade(
    pattern: any,
    strategy: Strategy,
    activeTrades: BacktestTrade[]
  ): boolean {
    // Check strategy settings
    if (pattern.type === 'BOS' && !strategy.bosConfirmation) return false;
    if (pattern.type === 'FVG' && !strategy.fvgTrading) return false;
    if (pattern.type === 'LS' && !strategy.liquiditySweeps) return false;
    if (pattern.type === 'OB' && !strategy.orderBlockFilter) return false;

    // Check if we already have too many active trades
    if (activeTrades.length >= 5) return false;

    // Check confidence threshold
    if (pattern.confidence < 0.7) return false;

    return true;
  }

  private createTrade(
    pattern: any,
    candle: CandleData,
    strategy: Strategy,
    balance: number
  ): BacktestTrade | null {
    const riskAmount = balance * (strategy.riskPercentage || 2) / 100;
    const entryPrice = candle.close;
    const stopLoss = strategy.stopLoss || 50;
    const takeProfit = strategy.takeProfit || 100;

    let tradeType: 'BUY' | 'SELL';
    let stopLossPrice: number;
    let takeProfitPrice: number;

    if (pattern.direction === 'BULLISH') {
      tradeType = 'BUY';
      stopLossPrice = entryPrice - (stopLoss * 0.0001);
      takeProfitPrice = entryPrice + (takeProfit * 0.0001);
    } else {
      tradeType = 'SELL';
      stopLossPrice = entryPrice + (stopLoss * 0.0001);
      takeProfitPrice = entryPrice - (takeProfit * 0.0001);
    }

    const riskPerTrade = Math.abs(entryPrice - stopLossPrice);
    const size = riskAmount / riskPerTrade;

    return {
      entryTime: candle.timestamp,
      entryPrice,
      type: tradeType,
      size,
      pattern: pattern.type,
    };
  }

  private checkExitConditions(
    trades: BacktestTrade[],
    candle: CandleData
  ): BacktestTrade[] {
    return trades.map(trade => {
      if (trade.exitTime) return trade;

      const currentPrice = candle.close;
      let shouldExit = false;
      let exitReason = '';

      if (trade.type === 'BUY') {
        // Check take profit
        if (currentPrice >= trade.entryPrice + 0.01) {
          shouldExit = true;
          exitReason = 'Take Profit';
        }
        // Check stop loss
        else if (currentPrice <= trade.entryPrice - 0.005) {
          shouldExit = true;
          exitReason = 'Stop Loss';
        }
      } else {
        // Check take profit
        if (currentPrice <= trade.entryPrice - 0.01) {
          shouldExit = true;
          exitReason = 'Take Profit';
        }
        // Check stop loss
        else if (currentPrice >= trade.entryPrice + 0.005) {
          shouldExit = true;
          exitReason = 'Stop Loss';
        }
      }

      if (shouldExit) {
        const pnl = trade.type === 'BUY'
          ? (currentPrice - trade.entryPrice) * trade.size
          : (trade.entryPrice - currentPrice) * trade.size;

        return {
          ...trade,
          exitTime: candle.timestamp,
          exitPrice: currentPrice,
          pnl,
          reason: exitReason,
        };
      }

      return trade;
    });
  }

  private calculateResults(
    trades: BacktestTrade[],
    equityCurve: { timestamp: number; equity: number }[],
    initialBalance: number,
    maxDrawdown: number
  ): BacktestResult {
    const completedTrades = trades.filter(t => t.pnl !== undefined);
    const winningTrades = completedTrades.filter(t => t.pnl! > 0);
    const losingTrades = completedTrades.filter(t => t.pnl! < 0);

    const totalPnL = completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

    return {
      totalTrades: completedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: completedTrades.length > 0 ? winningTrades.length / completedTrades.length : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
      maxDrawdown,
      totalPnL,
      trades: completedTrades,
      equityCurve,
    };
  }
}

export const backtestingService = new BacktestingService();
