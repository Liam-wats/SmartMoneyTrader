import { CandleData } from './marketData';
import { SMCPattern } from './smcDetection';

export interface MLPatternFeatures {
  // Price action features
  priceChange: number;
  volatility: number;
  volume: number;
  volumeMA: number;
  
  // Technical indicators
  rsi: number;
  sma20: number;
  sma50: number;
  bollinger: { upper: number; lower: number; middle: number };
  
  // Market microstructure
  orderFlow: number;
  liquidityIndex: number;
  marketStrength: number;
  
  // SMC-specific features
  structuralBreak: boolean;
  liquidationLevel: number;
  institutionalLevel: number;
  fairValueGap: number;
  
  // Time-based features
  timeOfDay: number;
  dayOfWeek: number;
  sessionType: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP';
}

export interface MLPatternPrediction {
  pattern: 'BOS' | 'CHoCH' | 'FVG' | 'OB' | 'LS';
  direction: 'BULLISH' | 'BEARISH';
  confidence: number;
  probability: number;
  strength: number;
  timeframe: string;
  features: MLPatternFeatures;
}

export class MLPatternRecognitionService {
  private patternHistory: Map<string, MLPatternPrediction[]> = new Map();
  private modelWeights: Map<string, number[]> = new Map();
  
  constructor() {
    this.initializeModelWeights();
  }

  async analyzePattern(data: CandleData[], pair: string, timeframe: string): Promise<MLPatternPrediction[]> {
    const predictions: MLPatternPrediction[] = [];
    
    if (data.length < 50) return predictions;

    // Extract features for each pattern type
    const bosFeatures = this.extractBOSFeatures(data, pair, timeframe);
    const fvgFeatures = this.extractFVGFeatures(data, pair, timeframe);
    const obFeatures = this.extractOrderBlockFeatures(data, pair, timeframe);
    const lsFeatures = this.extractLiquiditySweepFeatures(data, pair, timeframe);

    // Generate predictions for each pattern
    if (bosFeatures) {
      const bosPrediction = this.predictBOS(bosFeatures, pair, timeframe);
      if (bosPrediction.confidence > 0.6) {
        predictions.push(bosPrediction);
      }
    }

    if (fvgFeatures) {
      const fvgPrediction = this.predictFVG(fvgFeatures, pair, timeframe);
      if (fvgPrediction.confidence > 0.6) {
        predictions.push(fvgPrediction);
      }
    }

    if (obFeatures) {
      const obPrediction = this.predictOrderBlock(obFeatures, pair, timeframe);
      if (obPrediction.confidence > 0.6) {
        predictions.push(obPrediction);
      }
    }

    if (lsFeatures) {
      const lsPrediction = this.predictLiquiditySweep(lsFeatures, pair, timeframe);
      if (lsPrediction.confidence > 0.6) {
        predictions.push(lsPrediction);
      }
    }

    // Store predictions for model improvement
    this.storePatternHistory(pair, predictions);

    return predictions;
  }

  private extractBOSFeatures(data: CandleData[], pair: string, timeframe: string): MLPatternFeatures | null {
    const recent = data.slice(-20);
    if (recent.length < 20) return null;

    const priceChange = (recent[recent.length - 1].close - recent[0].close) / recent[0].close;
    const volatility = this.calculateVolatility(recent);
    const volume = recent[recent.length - 1].volume;
    const volumeMA = recent.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5;

    return {
      priceChange,
      volatility,
      volume,
      volumeMA,
      rsi: this.calculateRSI(data.slice(-14)),
      sma20: this.calculateSMA(data.slice(-20), 20),
      sma50: this.calculateSMA(data.slice(-50), 50),
      bollinger: this.calculateBollinger(data.slice(-20)),
      orderFlow: this.calculateOrderFlow(recent),
      liquidityIndex: this.calculateLiquidityIndex(recent),
      marketStrength: this.calculateMarketStrength(recent),
      structuralBreak: this.detectStructuralBreak(recent),
      liquidationLevel: this.calculateLiquidationLevel(recent),
      institutionalLevel: this.calculateInstitutionalLevel(recent),
      fairValueGap: this.calculateFairValueGap(recent),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      sessionType: this.getSessionType(),
    };
  }

  private extractFVGFeatures(data: CandleData[], pair: string, timeframe: string): MLPatternFeatures | null {
    const recent = data.slice(-10);
    if (recent.length < 10) return null;

    // Look for 3-candle pattern for FVG
    for (let i = 1; i < recent.length - 1; i++) {
      const prev = recent[i - 1];
      const current = recent[i];
      const next = recent[i + 1];

      // Check for gap between candles
      if (prev.high < next.low || prev.low > next.high) {
        const priceChange = (current.close - prev.close) / prev.close;
        const volatility = this.calculateVolatility(recent.slice(i - 1, i + 2));

        return {
          priceChange,
          volatility,
          volume: current.volume,
          volumeMA: recent.slice(i - 2, i + 1).reduce((sum, d) => sum + d.volume, 0) / 3,
          rsi: this.calculateRSI(data.slice(-14)),
          sma20: this.calculateSMA(data.slice(-20), 20),
          sma50: this.calculateSMA(data.slice(-50), 50),
          bollinger: this.calculateBollinger(data.slice(-20)),
          orderFlow: this.calculateOrderFlow([prev, current, next]),
          liquidityIndex: this.calculateLiquidityIndex([prev, current, next]),
          marketStrength: this.calculateMarketStrength([prev, current, next]),
          structuralBreak: false,
          liquidationLevel: (prev.high + next.low) / 2,
          institutionalLevel: current.close,
          fairValueGap: Math.abs(prev.high - next.low),
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          sessionType: this.getSessionType(),
        };
      }
    }

    return null;
  }

  private extractOrderBlockFeatures(data: CandleData[], pair: string, timeframe: string): MLPatternFeatures | null {
    const recent = data.slice(-30);
    if (recent.length < 30) return null;

    // Find strong rejection candles
    for (let i = 10; i < recent.length - 5; i++) {
      const candle = recent[i];
      const bodySize = Math.abs(candle.close - candle.open);
      const totalSize = candle.high - candle.low;
      
      // Strong rejection with long wicks
      if (bodySize / totalSize < 0.3) {
        const priceChange = (candle.close - candle.open) / candle.open;
        const volatility = this.calculateVolatility(recent.slice(i - 5, i + 5));

        return {
          priceChange,
          volatility,
          volume: candle.volume,
          volumeMA: recent.slice(i - 5, i + 5).reduce((sum, d) => sum + d.volume, 0) / 10,
          rsi: this.calculateRSI(data.slice(-14)),
          sma20: this.calculateSMA(data.slice(-20), 20),
          sma50: this.calculateSMA(data.slice(-50), 50),
          bollinger: this.calculateBollinger(data.slice(-20)),
          orderFlow: this.calculateOrderFlow(recent.slice(i - 2, i + 2)),
          liquidityIndex: this.calculateLiquidityIndex(recent.slice(i - 2, i + 2)),
          marketStrength: this.calculateMarketStrength(recent.slice(i - 2, i + 2)),
          structuralBreak: this.detectStructuralBreak(recent.slice(i - 5, i + 5)),
          liquidationLevel: candle.close > candle.open ? candle.low : candle.high,
          institutionalLevel: (candle.open + candle.close) / 2,
          fairValueGap: 0,
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          sessionType: this.getSessionType(),
        };
      }
    }

    return null;
  }

  private extractLiquiditySweepFeatures(data: CandleData[], pair: string, timeframe: string): MLPatternFeatures | null {
    const recent = data.slice(-50);
    if (recent.length < 50) return null;

    // Find recent highs/lows that got swept
    const recentHighs = this.findRecentHighs(recent);
    const recentLows = this.findRecentLows(recent);

    for (let i = recent.length - 10; i < recent.length; i++) {
      const candle = recent[i];
      
      // Check if current candle swept a recent high/low
      const sweptHigh = recentHighs.find(h => candle.high > h.price && i > h.index);
      const sweptLow = recentLows.find(l => candle.low < l.price && i > l.index);

      if (sweptHigh || sweptLow) {
        const priceChange = (candle.close - candle.open) / candle.open;
        const volatility = this.calculateVolatility(recent.slice(i - 5, i + 1));

        return {
          priceChange,
          volatility,
          volume: candle.volume,
          volumeMA: recent.slice(i - 5, i + 1).reduce((sum, d) => sum + d.volume, 0) / 6,
          rsi: this.calculateRSI(data.slice(-14)),
          sma20: this.calculateSMA(data.slice(-20), 20),
          sma50: this.calculateSMA(data.slice(-50), 50),
          bollinger: this.calculateBollinger(data.slice(-20)),
          orderFlow: this.calculateOrderFlow(recent.slice(i - 2, i + 1)),
          liquidityIndex: this.calculateLiquidityIndex(recent.slice(i - 2, i + 1)),
          marketStrength: this.calculateMarketStrength(recent.slice(i - 2, i + 1)),
          structuralBreak: true,
          liquidationLevel: sweptHigh ? sweptHigh.price : sweptLow?.price || 0,
          institutionalLevel: candle.close,
          fairValueGap: 0,
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay(),
          sessionType: this.getSessionType(),
        };
      }
    }

    return null;
  }

  private predictBOS(features: MLPatternFeatures, pair: string, timeframe: string): MLPatternPrediction {
    const weights = this.modelWeights.get('BOS') || this.getDefaultWeights();
    let score = 0;

    // Calculate weighted score based on features
    score += features.priceChange * weights[0];
    score += features.volatility * weights[1];
    score += (features.volume / features.volumeMA) * weights[2];
    score += features.rsi * weights[3];
    score += features.orderFlow * weights[4];
    score += features.liquidityIndex * weights[5];
    score += features.marketStrength * weights[6];
    score += features.structuralBreak ? weights[7] : 0;

    const probability = this.sigmoid(score);
    const confidence = this.calculateConfidence(features, probability);
    const direction = features.priceChange > 0 ? 'BULLISH' : 'BEARISH';

    return {
      pattern: 'BOS',
      direction,
      confidence,
      probability,
      strength: Math.abs(features.priceChange) * features.marketStrength,
      timeframe,
      features,
    };
  }

  private predictFVG(features: MLPatternFeatures, pair: string, timeframe: string): MLPatternPrediction {
    const weights = this.modelWeights.get('FVG') || this.getDefaultWeights();
    let score = 0;

    score += features.fairValueGap * weights[0];
    score += features.volatility * weights[1];
    score += (features.volume / features.volumeMA) * weights[2];
    score += features.orderFlow * weights[3];
    score += features.liquidityIndex * weights[4];

    const probability = this.sigmoid(score);
    const confidence = this.calculateConfidence(features, probability);
    const direction = features.priceChange > 0 ? 'BULLISH' : 'BEARISH';

    return {
      pattern: 'FVG',
      direction,
      confidence,
      probability,
      strength: features.fairValueGap * features.marketStrength,
      timeframe,
      features,
    };
  }

  private predictOrderBlock(features: MLPatternFeatures, pair: string, timeframe: string): MLPatternPrediction {
    const weights = this.modelWeights.get('OB') || this.getDefaultWeights();
    let score = 0;

    score += features.liquidationLevel * weights[0];
    score += features.institutionalLevel * weights[1];
    score += features.orderFlow * weights[2];
    score += features.liquidityIndex * weights[3];
    score += features.marketStrength * weights[4];

    const probability = this.sigmoid(score);
    const confidence = this.calculateConfidence(features, probability);
    const direction = features.priceChange > 0 ? 'BULLISH' : 'BEARISH';

    return {
      pattern: 'OB',
      direction,
      confidence,
      probability,
      strength: features.liquidityIndex * features.marketStrength,
      timeframe,
      features,
    };
  }

  private predictLiquiditySweep(features: MLPatternFeatures, pair: string, timeframe: string): MLPatternPrediction {
    const weights = this.modelWeights.get('LS') || this.getDefaultWeights();
    let score = 0;

    score += features.structuralBreak ? weights[0] : 0;
    score += features.liquidationLevel * weights[1];
    score += features.volume * weights[2];
    score += features.orderFlow * weights[3];
    score += features.liquidityIndex * weights[4];

    const probability = this.sigmoid(score);
    const confidence = this.calculateConfidence(features, probability);
    const direction = features.priceChange > 0 ? 'BULLISH' : 'BEARISH';

    return {
      pattern: 'LS',
      direction,
      confidence,
      probability,
      strength: features.liquidityIndex * (features.structuralBreak ? 2 : 1),
      timeframe,
      features,
    };
  }

  // Helper methods for calculations
  private calculateVolatility(data: CandleData[]): number {
    if (data.length < 2) return 0;
    const returns = data.slice(1).map((d, i) => Math.log(d.close / data[i].close));
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateRSI(data: CandleData[]): number {
    if (data.length < 14) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i-1].close;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / (data.length - 1);
    const avgLoss = losses / (data.length - 1);
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateSMA(data: CandleData[], period: number): number {
    if (data.length < period) return 0;
    const sum = data.slice(-period).reduce((sum, d) => sum + d.close, 0);
    return sum / period;
  }

  private calculateBollinger(data: CandleData[]): { upper: number; lower: number; middle: number } {
    const sma = this.calculateSMA(data, 20);
    const variance = data.slice(-20).reduce((sum, d) => sum + Math.pow(d.close - sma, 2), 0) / 20;
    const stdDev = Math.sqrt(variance);
    
    return {
      upper: sma + (2 * stdDev),
      lower: sma - (2 * stdDev),
      middle: sma,
    };
  }

  private calculateOrderFlow(data: CandleData[]): number {
    return data.reduce((sum, d) => {
      const bodySize = Math.abs(d.close - d.open);
      const direction = d.close > d.open ? 1 : -1;
      return sum + (bodySize * direction * d.volume);
    }, 0);
  }

  private calculateLiquidityIndex(data: CandleData[]): number {
    return data.reduce((sum, d) => sum + d.volume * (d.high - d.low), 0) / data.length;
  }

  private calculateMarketStrength(data: CandleData[]): number {
    const bullishCandles = data.filter(d => d.close > d.open).length;
    return bullishCandles / data.length;
  }

  private detectStructuralBreak(data: CandleData[]): boolean {
    if (data.length < 10) return false;
    
    const recent = data.slice(-5);
    const earlier = data.slice(-10, -5);
    
    const recentHigh = Math.max(...recent.map(d => d.high));
    const recentLow = Math.min(...recent.map(d => d.low));
    const earlierHigh = Math.max(...earlier.map(d => d.high));
    const earlierLow = Math.min(...earlier.map(d => d.low));
    
    return recentHigh > earlierHigh || recentLow < earlierLow;
  }

  private calculateLiquidationLevel(data: CandleData[]): number {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    return (Math.max(...highs) + Math.min(...lows)) / 2;
  }

  private calculateInstitutionalLevel(data: CandleData[]): number {
    const volumes = data.map(d => d.volume);
    const maxVolumeIndex = volumes.indexOf(Math.max(...volumes));
    return data[maxVolumeIndex].close;
  }

  private calculateFairValueGap(data: CandleData[]): number {
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const next = data[i + 1];
      if (prev.high < next.low) return next.low - prev.high;
      if (prev.low > next.high) return prev.low - next.high;
    }
    return 0;
  }

  private getSessionType(): 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP' {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 9) return 'ASIAN';
    if (hour >= 9 && hour < 17) return 'LONDON';
    if (hour >= 17 && hour < 24) return 'NEW_YORK';
    return 'OVERLAP';
  }

  private findRecentHighs(data: CandleData[]): { price: number; index: number }[] {
    const highs: { price: number; index: number }[] = [];
    for (let i = 2; i < data.length - 2; i++) {
      if (data[i].high > data[i-1].high && data[i].high > data[i-2].high &&
          data[i].high > data[i+1].high && data[i].high > data[i+2].high) {
        highs.push({ price: data[i].high, index: i });
      }
    }
    return highs;
  }

  private findRecentLows(data: CandleData[]): { price: number; index: number }[] {
    const lows: { price: number; index: number }[] = [];
    for (let i = 2; i < data.length - 2; i++) {
      if (data[i].low < data[i-1].low && data[i].low < data[i-2].low &&
          data[i].low < data[i+1].low && data[i].low < data[i+2].low) {
        lows.push({ price: data[i].low, index: i });
      }
    }
    return lows;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private calculateConfidence(features: MLPatternFeatures, probability: number): number {
    let confidence = probability;
    
    // Adjust confidence based on market conditions
    if (features.volatility > 0.05) confidence *= 0.9;
    if (features.volume > features.volumeMA * 1.5) confidence *= 1.1;
    if (features.sessionType === 'OVERLAP') confidence *= 1.05;
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private initializeModelWeights(): void {
    // Initialize with reasonable default weights
    this.modelWeights.set('BOS', [0.3, 0.2, 0.15, 0.1, 0.25, 0.2, 0.15, 0.3]);
    this.modelWeights.set('FVG', [0.4, 0.25, 0.2, 0.3, 0.25]);
    this.modelWeights.set('OB', [0.3, 0.25, 0.35, 0.3, 0.2]);
    this.modelWeights.set('LS', [0.4, 0.3, 0.2, 0.25, 0.3]);
  }

  private getDefaultWeights(): number[] {
    return [0.2, 0.2, 0.2, 0.2, 0.2];
  }

  private storePatternHistory(pair: string, predictions: MLPatternPrediction[]): void {
    const key = `${pair}_history`;
    const history = this.patternHistory.get(key) || [];
    history.push(...predictions);
    
    // Keep only last 1000 predictions
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
    
    this.patternHistory.set(key, history);
  }

  async improveModel(pair: string, actualOutcome: boolean, pattern: string): Promise<void> {
    // This would be where we implement model improvement based on actual outcomes
    // For now, we'll just log the feedback
    console.log(`Model feedback: ${pair} ${pattern} - Actual: ${actualOutcome}`);
  }
}

export const mlPatternRecognitionService = new MLPatternRecognitionService();