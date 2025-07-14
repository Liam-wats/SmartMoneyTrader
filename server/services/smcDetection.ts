import { CandleData } from './marketData';
import { SMCSignal } from '@shared/schema';

export interface SMCPattern {
  type: 'BOS' | 'CHoCH' | 'FVG' | 'OB' | 'LS';
  direction: 'BULLISH' | 'BEARISH';
  price: number;
  confidence: number;
  description: string;
}

export class SMCDetectionService {
  private readonly lookbackPeriod = 20;
  private readonly minConfidence = 0.7;

  detectPatterns(data: CandleData[], pair: string, timeframe: string): SMCPattern[] {
    if (data.length < this.lookbackPeriod) return [];

    const patterns: SMCPattern[] = [];
    
    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    
    // Detect Break of Structure (BOS)
    const bosPatterns = this.detectBOS(sortedData);
    patterns.push(...bosPatterns);
    
    // Detect Fair Value Gaps (FVG)
    const fvgPatterns = this.detectFVG(sortedData);
    patterns.push(...fvgPatterns);
    
    // Detect Order Blocks (OB)
    const obPatterns = this.detectOrderBlocks(sortedData);
    patterns.push(...obPatterns);
    
    // Detect Liquidity Sweeps (LS)
    const lsPatterns = this.detectLiquiditySweeps(sortedData);
    patterns.push(...lsPatterns);
    
    return patterns.filter(p => p.confidence >= this.minConfidence);
  }

  private detectBOS(data: CandleData[]): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    
    for (let i = 10; i < data.length - 2; i++) {
      const currentCandle = data[i];
      const previousCandles = data.slice(i - 10, i);
      
      // Find recent highs and lows
      const recentHigh = Math.max(...previousCandles.map(c => c.high));
      const recentLow = Math.min(...previousCandles.map(c => c.low));
      
      // Bullish BOS - price breaks above recent high
      if (currentCandle.close > recentHigh && currentCandle.high > recentHigh) {
        const confidence = this.calculateBOSConfidence(data, i, 'BULLISH');
        patterns.push({
          type: 'BOS',
          direction: 'BULLISH',
          price: currentCandle.close,
          confidence,
          description: `Bullish structure break at ${currentCandle.close.toFixed(4)}`
        });
      }
      
      // Bearish BOS - price breaks below recent low
      if (currentCandle.close < recentLow && currentCandle.low < recentLow) {
        const confidence = this.calculateBOSConfidence(data, i, 'BEARISH');
        patterns.push({
          type: 'BOS',
          direction: 'BEARISH',
          price: currentCandle.close,
          confidence,
          description: `Bearish structure break at ${currentCandle.close.toFixed(4)}`
        });
      }
    }
    
    return patterns;
  }

  private detectFVG(data: CandleData[]): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];
      
      // Bullish FVG - gap between prev high and next low
      if (prev.high < next.low && current.close > current.open) {
        const gapSize = next.low - prev.high;
        const confidence = this.calculateFVGConfidence(gapSize, current);
        
        patterns.push({
          type: 'FVG',
          direction: 'BULLISH',
          price: (prev.high + next.low) / 2,
          confidence,
          description: `Bullish FVG at ${prev.high.toFixed(4)}-${next.low.toFixed(4)}`
        });
      }
      
      // Bearish FVG - gap between prev low and next high
      if (prev.low > next.high && current.close < current.open) {
        const gapSize = prev.low - next.high;
        const confidence = this.calculateFVGConfidence(gapSize, current);
        
        patterns.push({
          type: 'FVG',
          direction: 'BEARISH',
          price: (prev.low + next.high) / 2,
          confidence,
          description: `Bearish FVG at ${next.high.toFixed(4)}-${prev.low.toFixed(4)}`
        });
      }
    }
    
    return patterns;
  }

  private detectOrderBlocks(data: CandleData[]): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    
    for (let i = 5; i < data.length - 5; i++) {
      const candle = data[i];
      const bodySize = Math.abs(candle.close - candle.open);
      const candleRange = candle.high - candle.low;
      
      // Strong bullish candle followed by consolidation
      if (candle.close > candle.open && bodySize > candleRange * 0.7) {
        const nextCandles = data.slice(i + 1, i + 6);
        const isConsolidation = this.isConsolidation(nextCandles);
        
        if (isConsolidation) {
          patterns.push({
            type: 'OB',
            direction: 'BULLISH',
            price: candle.open,
            confidence: 0.8,
            description: `Bullish Order Block at ${candle.open.toFixed(4)}-${candle.close.toFixed(4)}`
          });
        }
      }
      
      // Strong bearish candle followed by consolidation
      if (candle.close < candle.open && bodySize > candleRange * 0.7) {
        const nextCandles = data.slice(i + 1, i + 6);
        const isConsolidation = this.isConsolidation(nextCandles);
        
        if (isConsolidation) {
          patterns.push({
            type: 'OB',
            direction: 'BEARISH',
            price: candle.open,
            confidence: 0.8,
            description: `Bearish Order Block at ${candle.close.toFixed(4)}-${candle.open.toFixed(4)}`
          });
        }
      }
    }
    
    return patterns;
  }

  private detectLiquiditySweeps(data: CandleData[]): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    
    for (let i = 20; i < data.length - 2; i++) {
      const currentCandle = data[i];
      const previousCandles = data.slice(i - 20, i);
      
      // Find significant highs and lows
      const significantHigh = Math.max(...previousCandles.map(c => c.high));
      const significantLow = Math.min(...previousCandles.map(c => c.low));
      
      // Liquidity sweep above high (false breakout)
      if (currentCandle.high > significantHigh && currentCandle.close < significantHigh) {
        patterns.push({
          type: 'LS',
          direction: 'BEARISH',
          price: currentCandle.high,
          confidence: 0.75,
          description: `Liquidity sweep above ${significantHigh.toFixed(4)}`
        });
      }
      
      // Liquidity sweep below low (false breakdown)
      if (currentCandle.low < significantLow && currentCandle.close > significantLow) {
        patterns.push({
          type: 'LS',
          direction: 'BULLISH',
          price: currentCandle.low,
          confidence: 0.75,
          description: `Liquidity sweep below ${significantLow.toFixed(4)}`
        });
      }
    }
    
    return patterns;
  }

  private calculateBOSConfidence(data: CandleData[], index: number, direction: 'BULLISH' | 'BEARISH'): number {
    const candle = data[index];
    const volume = candle.volume;
    const bodySize = Math.abs(candle.close - candle.open);
    const candleRange = candle.high - candle.low;
    
    let confidence = 0.5;
    
    // Volume confirmation
    if (volume > 0) confidence += 0.2;
    
    // Strong body relative to range
    if (bodySize > candleRange * 0.6) confidence += 0.15;
    
    // Direction confirmation
    if (direction === 'BULLISH' && candle.close > candle.open) confidence += 0.1;
    if (direction === 'BEARISH' && candle.close < candle.open) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private calculateFVGConfidence(gapSize: number, candle: CandleData): number {
    const candleRange = candle.high - candle.low;
    const gapRatio = gapSize / candleRange;
    
    let confidence = 0.5;
    
    // Larger gaps are more significant
    if (gapRatio > 0.3) confidence += 0.2;
    if (gapRatio > 0.5) confidence += 0.1;
    
    // Strong body confirmation
    const bodySize = Math.abs(candle.close - candle.open);
    if (bodySize > candleRange * 0.7) confidence += 0.15;
    
    return Math.min(confidence, 1.0);
  }

  private isConsolidation(candles: CandleData[]): boolean {
    if (candles.length < 3) return false;
    
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const range = Math.max(...highs) - Math.min(...lows);
    const avgRange = candles.reduce((sum, c) => sum + (c.high - c.low), 0) / candles.length;
    
    return range < avgRange * 2;
  }
}

export const smcDetectionService = new SMCDetectionService();
