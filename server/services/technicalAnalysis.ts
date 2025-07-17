import { CandleData } from './marketData';
import { SMCPattern } from './smcDetection';
import { SMA, EMA, RSI, BollingerBands, MACD, Stochastic, ATR } from 'technicalindicators';

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  ema20: number;
  ema50: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  stochK: number;
  stochD: number;
  atr: number;
}

export interface TradingSignal {
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  confidence: number;
  indicators: TechnicalIndicators;
  smcPatterns: SMCPattern[];
  confirmations: string[];
  riskRewardRatio: number;
  timestamp: number;
}

export class TechnicalAnalysisService {
  calculateIndicators(data: CandleData[]): TechnicalIndicators | null {
    if (data.length < 50) return null;

    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume || 1000);

    try {
      // RSI - ensure we have enough data
      let rsi = 50;
      if (closes.length >= 14) {
        const rsiValues = RSI.calculate({ values: closes, period: 14 });
        rsi = rsiValues[rsiValues.length - 1] || rsi;
      }

      // Moving Averages - ensure we have enough data
      const sma20Values = closes.length >= 20 ? SMA.calculate({ values: closes, period: 20 }) : [];
      const sma50Values = closes.length >= 50 ? SMA.calculate({ values: closes, period: 50 }) : [];
      const ema20Values = closes.length >= 20 ? EMA.calculate({ values: closes, period: 20 }) : [];
      const ema50Values = closes.length >= 50 ? EMA.calculate({ values: closes, period: 50 }) : [];

      const sma20 = sma20Values[sma20Values.length - 1] || closes[closes.length - 1];
      const sma50 = sma50Values[sma50Values.length - 1] || closes[closes.length - 1];
      const ema20 = ema20Values[ema20Values.length - 1] || closes[closes.length - 1];
      const ema50 = ema50Values[ema50Values.length - 1] || closes[closes.length - 1];

      // Bollinger Bands - ensure we have enough data
      let bb = { upper: closes[closes.length - 1] * 1.02, middle: closes[closes.length - 1], lower: closes[closes.length - 1] * 0.98 };
      if (closes.length >= 20) {
        const bbValues = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
        bb = bbValues[bbValues.length - 1] || bb;
      }

      // MACD - ensure we have enough data
      let macd = { MACD: 0, signal: 0, histogram: 0 };
      if (closes.length >= 26) {
        const macdValues = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
        macd = macdValues[macdValues.length - 1] || macd;
      }

      // Stochastic - ensure we have enough data
      let stoch = { k: 50, d: 50 };
      if (highs.length >= 14 && lows.length >= 14 && closes.length >= 14) {
        const stochValues = Stochastic.calculate({ high: highs, low: lows, close: closes, kPeriod: 14, dPeriod: 3 });
        stoch = stochValues[stochValues.length - 1] || stoch;
      }

      // ATR - ensure we have enough data
      let atr = 0.001;
      if (highs.length >= 14 && lows.length >= 14 && closes.length >= 14) {
        const atrValues = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
        atr = atrValues[atrValues.length - 1] || atr;
      }

      return {
        rsi,
        sma20,
        sma50,
        ema20,
        ema50,
        bbUpper: bb.upper,
        bbMiddle: bb.middle,
        bbLower: bb.lower,
        macd: macd.MACD,
        macdSignal: macd.signal,
        macdHistogram: macd.histogram,
        stochK: stoch.k,
        stochD: stoch.d,
        atr
      };
    } catch (error) {
      console.error('Error calculating technical indicators:', error);
      return null;
    }
  }

  analyzeForTradingSignal(
    data: CandleData[], 
    smcPatterns: SMCPattern[], 
    pair: string, 
    timeframe: string
  ): TradingSignal | null {
    if (data.length < 50) return null;

    const indicators = this.calculateIndicators(data);
    if (!indicators) return null;

    const currentPrice = data[data.length - 1].close;
    const confirmations: string[] = [];
    let confidence = 0;
    let direction: 'BUY' | 'SELL' | null = null;

    // Analyze SMC patterns
    const recentSMC = smcPatterns.filter(p => p.confidence > 0.6).slice(0, 3);
    const bullishSMC = recentSMC.filter(p => p.direction === 'BULLISH').length;
    const bearishSMC = recentSMC.filter(p => p.direction === 'BEARISH').length;

    // SMC pattern analysis
    if (bullishSMC > bearishSMC) {
      confirmations.push(`SMC Bullish Patterns: ${bullishSMC}`);
      confidence += 20;
      direction = 'BUY';
    } else if (bearishSMC > bullishSMC) {
      confirmations.push(`SMC Bearish Patterns: ${bearishSMC}`);
      confidence += 20;
      direction = 'SELL';
    }

    // RSI analysis
    if (indicators.rsi < 30) {
      confirmations.push(`RSI Oversold: ${indicators.rsi.toFixed(2)}`);
      confidence += direction === 'BUY' ? 15 : -10;
    } else if (indicators.rsi > 70) {
      confirmations.push(`RSI Overbought: ${indicators.rsi.toFixed(2)}`);
      confidence += direction === 'SELL' ? 15 : -10;
    }

    // Moving Average analysis
    const maAligned = indicators.ema20 > indicators.ema50 && indicators.sma20 > indicators.sma50;
    const maReversed = indicators.ema20 < indicators.ema50 && indicators.sma20 < indicators.sma50;

    if (maAligned && direction === 'BUY') {
      confirmations.push('Moving Averages Bullish Aligned');
      confidence += 15;
    } else if (maReversed && direction === 'SELL') {
      confirmations.push('Moving Averages Bearish Aligned');
      confidence += 15;
    }

    // Bollinger Bands analysis
    const bbPosition = (currentPrice - indicators.bbLower) / (indicators.bbUpper - indicators.bbLower);
    if (bbPosition < 0.2 && direction === 'BUY') {
      confirmations.push('Price at Bollinger Lower Band');
      confidence += 10;
    } else if (bbPosition > 0.8 && direction === 'SELL') {
      confirmations.push('Price at Bollinger Upper Band');
      confidence += 10;
    }

    // MACD analysis
    if (indicators.macd > indicators.macdSignal && indicators.macdHistogram > 0 && direction === 'BUY') {
      confirmations.push('MACD Bullish Crossover');
      confidence += 10;
    } else if (indicators.macd < indicators.macdSignal && indicators.macdHistogram < 0 && direction === 'SELL') {
      confirmations.push('MACD Bearish Crossover');
      confidence += 10;
    }

    // Stochastic analysis
    if (indicators.stochK < 20 && indicators.stochD < 20 && direction === 'BUY') {
      confirmations.push('Stochastic Oversold');
      confidence += 10;
    } else if (indicators.stochK > 80 && indicators.stochD > 80 && direction === 'SELL') {
      confirmations.push('Stochastic Overbought');
      confidence += 10;
    }

    // Minimum confidence threshold
    if (confidence < 50 || !direction || confirmations.length < 3) {
      return null;
    }

    // Calculate entry, take profit, and stop loss
    const atrMultiplier = 2;
    const rrRatio = 2.5; // Risk-reward ratio

    let entryPrice = currentPrice;
    let stopLossPrice: number;
    let takeProfitPrice: number;

    if (direction === 'BUY') {
      stopLossPrice = entryPrice - (indicators.atr * atrMultiplier);
      takeProfitPrice = entryPrice + (indicators.atr * atrMultiplier * rrRatio);
    } else {
      stopLossPrice = entryPrice + (indicators.atr * atrMultiplier);
      takeProfitPrice = entryPrice - (indicators.atr * atrMultiplier * rrRatio);
    }

    const riskRewardRatio = Math.abs((takeProfitPrice - entryPrice) / (entryPrice - stopLossPrice));

    // Final confidence adjustment
    confidence = Math.min(95, Math.max(50, confidence));

    return {
      pair,
      timeframe,
      direction,
      entryPrice,
      takeProfitPrice,
      stopLossPrice,
      confidence,
      indicators,
      smcPatterns: recentSMC,
      confirmations,
      riskRewardRatio,
      timestamp: Date.now()
    };
  }

  formatSignalForTelegram(signal: TradingSignal): string {
    const directionEmoji = signal.direction === 'BUY' ? '🟢' : '🔴';
    const rrEmoji = signal.riskRewardRatio >= 2 ? '✅' : '⚠️';
    
    return `
${directionEmoji} **TRADING SIGNAL** ${directionEmoji}

**Pair:** ${signal.pair}
**Timeframe:** ${signal.timeframe}
**Direction:** ${signal.direction}
**Confidence:** ${signal.confidence.toFixed(1)}%

💰 **Entry:** ${signal.entryPrice.toFixed(5)}
🎯 **Take Profit:** ${signal.takeProfitPrice.toFixed(5)}
🛑 **Stop Loss:** ${signal.stopLossPrice.toFixed(5)}

${rrEmoji} **Risk/Reward:** 1:${signal.riskRewardRatio.toFixed(2)}

**Technical Confirmations:**
${signal.confirmations.map(c => `✓ ${c}`).join('\n')}

**SMC Patterns:**
${signal.smcPatterns.map(p => `• ${p.type} ${p.direction} (${p.confidence.toFixed(1)}%)`).join('\n')}

**Key Indicators:**
• RSI: ${signal.indicators.rsi.toFixed(2)}
• MACD: ${signal.indicators.macd.toFixed(4)}
• ATR: ${signal.indicators.atr.toFixed(5)}

⏰ **Time:** ${new Date(signal.timestamp).toLocaleString()}
    `.trim();
  }
}