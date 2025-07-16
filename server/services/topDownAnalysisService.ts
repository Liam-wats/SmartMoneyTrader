import { CandleData, MarketDataService } from './marketData';
import { SMCDetectionService } from './smcDetection';

export interface TimeframeBias {
  timeframe: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  keyLevel: number;
  reason: string;
}

export interface ConfluenceSignal {
  pair: string;
  direction: 'BULLISH' | 'BEARISH';
  confluenceCount: number;
  signals: string[];
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  confidence: number;
  timeframe: string;
}

export interface TopDownAnalysis {
  pair: string;
  htfBias: TimeframeBias;
  ltfBias: TimeframeBias;
  confluenceSignals: ConfluenceSignal[];
  recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  overallConfidence: number;
}

export class TopDownAnalysisService {
  private smcDetection = new SMCDetectionService();

  async analyzeMarketStructure(
    marketDataService: MarketDataService,
    pair: string
  ): Promise<TopDownAnalysis> {
    try {
      // Get multi-timeframe data
      const htfData = await marketDataService.getHistoricalData(pair, '4h', 100);
      const mtfData = await marketDataService.getHistoricalData(pair, '1h', 200);
      const ltfData = await marketDataService.getHistoricalData(pair, '15m', 300);

      // Analyze higher timeframe bias (4H)
      const htfBias = this.analyzeTimeframeBias(htfData, '4h');
      
      // Analyze lower timeframe bias (1H)
      const ltfBias = this.analyzeTimeframeBias(mtfData, '1h');

      // Find confluence signals on entry timeframe (15m)
      const confluenceSignals = await this.findConfluenceSignals(
        ltfData,
        pair,
        htfBias.direction,
        '15m'
      );

      // Generate overall recommendation
      const recommendation = this.generateRecommendation(htfBias, ltfBias, confluenceSignals);
      const overallConfidence = this.calculateOverallConfidence(htfBias, ltfBias, confluenceSignals);

      return {
        pair,
        htfBias,
        ltfBias,
        confluenceSignals,
        recommendation,
        overallConfidence
      };
    } catch (error) {
      console.error('Error in top-down analysis:', error);
      throw error;
    }
  }

  private analyzeTimeframeBias(data: CandleData[], timeframe: string): TimeframeBias {
    if (data.length < 20) {
      return {
        timeframe,
        direction: 'NEUTRAL',
        confidence: 0,
        keyLevel: data[data.length - 1]?.close || 0,
        reason: 'Insufficient data'
      };
    }

    // Structure analysis
    const recentHigh = Math.max(...data.slice(-20).map(c => c.high));
    const recentLow = Math.min(...data.slice(-20).map(c => c.low));
    const currentPrice = data[data.length - 1].close;
    
    // Trend analysis using moving averages
    const ma20 = this.calculateMA(data.slice(-20), 20);
    const ma50 = this.calculateMA(data.slice(-50), 50) || ma20;
    
    // Break of Structure detection
    const higherHighs = this.countHigherHighs(data.slice(-20));
    const lowerLows = this.countLowerLows(data.slice(-20));
    
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let confidence = 0;
    let reason = '';

    if (currentPrice > ma20 && ma20 > ma50 && higherHighs >= 2) {
      direction = 'BULLISH';
      confidence = Math.min(0.8, (higherHighs * 0.2) + ((currentPrice - ma20) / ma20 * 10));
      reason = `Bullish structure: ${higherHighs} higher highs, above MA20`;
    } else if (currentPrice < ma20 && ma20 < ma50 && lowerLows >= 2) {
      direction = 'BEARISH';
      confidence = Math.min(0.8, (lowerLows * 0.2) + ((ma20 - currentPrice) / ma20 * 10));
      reason = `Bearish structure: ${lowerLows} lower lows, below MA20`;
    } else {
      confidence = 0.3;
      reason = 'Sideways movement, no clear bias';
    }

    return {
      timeframe,
      direction,
      confidence: Math.max(0, Math.min(1, confidence)),
      keyLevel: direction === 'BULLISH' ? recentLow : recentHigh,
      reason
    };
  }

  private async findConfluenceSignals(
    data: CandleData[],
    pair: string,
    htfBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    timeframe: string
  ): Promise<ConfluenceSignal[]> {
    const signals: ConfluenceSignal[] = [];
    
    if (data.length < 50 || htfBias === 'NEUTRAL') {
      return signals;
    }

    // SMC Pattern detection
    const smcSignals = this.smcDetection.detectPatterns(data);
    const currentPrice = data[data.length - 1].close;
    
    // Filter signals that align with HTF bias
    const alignedSignals = smcSignals.filter(signal => 
      signal.direction === htfBias && signal.confidence > 0.6
    );

    for (const signal of alignedSignals) {
      const confluenceFactors: string[] = [];
      let confluenceCount = 1; // Start with 1 for the main SMC signal

      // Check for additional confluence factors
      const atr = this.calculateATR(data.slice(-20));
      
      // Volume confluence (mock - would use real volume data)
      if (Math.random() > 0.5) {
        confluenceFactors.push('Volume Spike');
        confluenceCount++;
      }

      // Support/Resistance confluence
      const keyLevels = this.identifyKeyLevels(data);
      const nearKeyLevel = keyLevels.some(level => 
        Math.abs(signal.price - level) / signal.price < 0.001
      );
      
      if (nearKeyLevel) {
        confluenceFactors.push('Key Level');
        confluenceCount++;
      }

      // Fibonacci confluence
      const fibLevels = this.calculateFibonacciLevels(data);
      const nearFibLevel = fibLevels.some(level => 
        Math.abs(signal.price - level) / signal.price < 0.001
      );
      
      if (nearFibLevel) {
        confluenceFactors.push('Fibonacci Level');
        confluenceCount++;
      }

      // Only include signals with 3+ confluence factors
      if (confluenceCount >= 3) {
        const riskRewardRatio = this.calculateRiskReward(
          signal.price,
          signal.direction,
          atr
        );

        // Only include trades with minimum 2:1 RR
        if (riskRewardRatio >= 2.0) {
          const stopLoss = signal.direction === 'BULLISH' 
            ? signal.price - (atr * 1.5)
            : signal.price + (atr * 1.5);
            
          const takeProfit = signal.direction === 'BULLISH'
            ? signal.price + (Math.abs(signal.price - stopLoss) * riskRewardRatio)
            : signal.price - (Math.abs(signal.price - stopLoss) * riskRewardRatio);

          signals.push({
            pair,
            direction: signal.direction as 'BULLISH' | 'BEARISH',
            confluenceCount,
            signals: [signal.pattern, ...confluenceFactors],
            entryPrice: signal.price,
            stopLoss,
            takeProfit,
            riskRewardRatio,
            confidence: Math.min(0.95, signal.confidence + (confluenceCount * 0.1)),
            timeframe
          });
        }
      }
    }

    // Sort by confidence and confluence count
    return signals.sort((a, b) => 
      (b.confidence + b.confluenceCount * 0.1) - (a.confidence + a.confluenceCount * 0.1)
    ).slice(0, 3); // Return top 3 signals
  }

  private generateRecommendation(
    htfBias: TimeframeBias,
    ltfBias: TimeframeBias,
    confluenceSignals: ConfluenceSignal[]
  ): 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' {
    const bestSignal = confluenceSignals[0];
    
    if (!bestSignal) return 'NEUTRAL';

    const biasAlignment = htfBias.direction === ltfBias.direction;
    const signalStrength = bestSignal.confidence * bestSignal.confluenceCount;

    if (bestSignal.direction === 'BULLISH') {
      if (biasAlignment && signalStrength > 3.5 && htfBias.confidence > 0.6) {
        return 'STRONG_BUY';
      } else if (signalStrength > 2.5) {
        return 'BUY';
      }
    } else if (bestSignal.direction === 'BEARISH') {
      if (biasAlignment && signalStrength > 3.5 && htfBias.confidence > 0.6) {
        return 'STRONG_SELL';
      } else if (signalStrength > 2.5) {
        return 'SELL';
      }
    }

    return 'NEUTRAL';
  }

  private calculateOverallConfidence(
    htfBias: TimeframeBias,
    ltfBias: TimeframeBias,
    confluenceSignals: ConfluenceSignal[]
  ): number {
    if (confluenceSignals.length === 0) return 0;

    const bestSignal = confluenceSignals[0];
    const biasAlignment = htfBias.direction === ltfBias.direction ? 1.2 : 0.8;
    const timeframStrength = (htfBias.confidence + ltfBias.confidence) / 2;
    
    return Math.min(0.95, bestSignal.confidence * biasAlignment * timeframStrength);
  }

  // Helper methods
  private calculateMA(data: CandleData[], period: number): number {
    const values = data.slice(-period).map(c => c.close);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateATR(data: CandleData[]): number {
    const trs = data.slice(1).map((candle, i) => {
      const prevClose = data[i].close;
      return Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - prevClose),
        Math.abs(candle.low - prevClose)
      );
    });
    return trs.reduce((sum, tr) => sum + tr, 0) / trs.length;
  }

  private countHigherHighs(data: CandleData[]): number {
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i].high > data[i-1].high) count++;
    }
    return count;
  }

  private countLowerLows(data: CandleData[]): number {
    let count = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i].low < data[i-1].low) count++;
    }
    return count;
  }

  private identifyKeyLevels(data: CandleData[]): number[] {
    const levels: number[] = [];
    const lookback = 20;
    
    for (let i = lookback; i < data.length - lookback; i++) {
      const slice = data.slice(i - lookback, i + lookback);
      const high = data[i].high;
      const low = data[i].low;
      
      const isResistance = slice.every(c => c.high <= high);
      const isSupport = slice.every(c => c.low >= low);
      
      if (isResistance) levels.push(high);
      if (isSupport) levels.push(low);
    }
    
    return levels;
  }

  private calculateFibonacciLevels(data: CandleData[]): number[] {
    const recent = data.slice(-50);
    const high = Math.max(...recent.map(c => c.high));
    const low = Math.min(...recent.map(c => c.low));
    const range = high - low;
    
    return [
      low + range * 0.236,
      low + range * 0.382,
      low + range * 0.5,
      low + range * 0.618,
      low + range * 0.786
    ];
  }

  private calculateRiskReward(price: number, direction: 'BULLISH' | 'BEARISH', atr: number): number {
    const risk = atr * 1.5; // 1.5 ATR stop loss
    const reward = atr * 3; // 3 ATR take profit
    return reward / risk;
  }
}

export const topDownAnalysisService = new TopDownAnalysisService();