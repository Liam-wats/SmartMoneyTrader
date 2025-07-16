import { CandleData } from './marketData';

export interface SMCPattern {
  type: 'BOS' | 'FVG' | 'OB' | 'LS' | 'CHoCH';
  direction: 'BULLISH' | 'BEARISH';
  price: number;
  confidence: number;
  description: string;
  pattern: string;
  timestamp: number;
}

export class SMCDetectionService {
  detectPatterns(data: CandleData[], pair?: string, timeframe?: string): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    
    if (data.length < 20) return patterns;
    
    // Detect Break of Structure (BOS)
    patterns.push(...this.detectBOS(data));
    
    // Detect Fair Value Gaps (FVG)
    patterns.push(...this.detectFVG(data));
    
    // Detect Order Blocks (OB)
    patterns.push(...this.detectOrderBlocks(data));
    
    // Detect Liquidity Sweeps (LS)
    patterns.push(...this.detectLiquiditySweeps(data));
    
    // Detect Change of Character (CHoCH)
    patterns.push(...this.detectCHoCH(data));
    
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  private detectBOS(data: CandleData[]): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    const lookback = 10;
    
    for (let i = lookback; i < data.length - 1; i++) {
      const currentCandle = data[i];
      const prevCandles = data.slice(i - lookback, i);
      
      // Find recent high and low
      const recentHigh = Math.max(...prevCandles.map(c => c.high));
      const recentLow = Math.min(...prevCandles.map(c => c.low));
      
      // Bullish BOS - break above recent high
      if (currentCandle.close > recentHigh) {
        const confidence = this.calculateBOSConfidence(data, i, 'BULLISH');
        patterns.push({
          type: 'BOS',
          direction: 'BULLISH',
          price: currentCandle.close,
          confidence,
          description: `Bullish Break of Structure at ${currentCandle.close.toFixed(5)}`,
          pattern: 'BOS',
          timestamp: currentCandle.timestamp
        });
      }
      
      // Bearish BOS - break below recent low
      if (currentCandle.close < recentLow) {
        const confidence = this.calculateBOSConfidence(data, i, 'BEARISH');
        patterns.push({
          type: 'BOS',
          direction: 'BEARISH',
          price: currentCandle.close,
          confidence,
          description: `Bearish Break of Structure at ${currentCandle.close.toFixed(5)}`,
          pattern: 'BOS',
          timestamp: currentCandle.timestamp
        });
      }
    }
    
    return patterns;
  }

  private detectFVG(data: CandleData[]): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    
    for (let i = 2; i < data.length; i++) {
      const candle1 = data[i - 2];
      const candle2 = data[i - 1];
      const candle3 = data[i];
      
      // Bullish FVG - gap between candle1 high and candle3 low
      if (candle1.high < candle3.low && candle2.close > candle2.open) {
        const gapSize = candle3.low - candle1.high;
        const avgPrice = (candle1.high + candle3.low) / 2;
        const confidence = this.calculateFVGConfidence(gapSize, avgPrice);
        
        patterns.push({
          type: 'FVG',
          direction: 'BULLISH',
          price: avgPrice,
          confidence,
          description: `Bullish Fair Value Gap: ${candle1.high.toFixed(5)} - ${candle3.low.toFixed(5)}`,
          pattern: 'FVG',
          timestamp: candle3.timestamp
        });
      }
      
      // Bearish FVG - gap between candle1 low and candle3 high
      if (candle1.low > candle3.high && candle2.close < candle2.open) {
        const gapSize = candle1.low - candle3.high;
        const avgPrice = (candle1.low + candle3.high) / 2;
        const confidence = this.calculateFVGConfidence(gapSize, avgPrice);
        
        patterns.push({
          type: 'FVG',
          direction: 'BEARISH',
          price: avgPrice,
          confidence,
          description: `Bearish Fair Value Gap: ${candle3.high.toFixed(5)} - ${candle1.low.toFixed(5)}`,
          pattern: 'FVG',
          timestamp: candle3.timestamp
        });
      }
    }
    
    return patterns;
  }

  private detectOrderBlocks(data: CandleData[]): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    
    for (let i = 5; i < data.length - 5; i++) {
      const currentCandle = data[i];
      const nextCandles = data.slice(i + 1, i + 6);
      
      // Bullish Order Block - strong down candle followed by upward movement
      if (currentCandle.close < currentCandle.open) {
        const hasUpwardMovement = nextCandles.some(c => c.close > currentCandle.high);
        
        if (hasUpwardMovement) {
          const confidence = this.calculateOrderBlockConfidence(data, i, 'BULLISH');
          patterns.push({
            type: 'OB',
            direction: 'BULLISH',
            price: (currentCandle.open + currentCandle.close) / 2,
            confidence,
            description: `Bullish Order Block at ${currentCandle.low.toFixed(5)} - ${currentCandle.high.toFixed(5)}`,
            pattern: 'OB',
            timestamp: currentCandle.timestamp
          });
        }
      }
      
      // Bearish Order Block - strong up candle followed by downward movement
      if (currentCandle.close > currentCandle.open) {
        const hasDownwardMovement = nextCandles.some(c => c.close < currentCandle.low);
        
        if (hasDownwardMovement) {
          const confidence = this.calculateOrderBlockConfidence(data, i, 'BEARISH');
          patterns.push({
            type: 'OB',
            direction: 'BEARISH',
            price: (currentCandle.open + currentCandle.close) / 2,
            confidence,
            description: `Bearish Order Block at ${currentCandle.low.toFixed(5)} - ${currentCandle.high.toFixed(5)}`,
            pattern: 'OB',
            timestamp: currentCandle.timestamp
          });
        }
      }
    }
    
    return patterns;
  }

  private detectLiquiditySweeps(data: CandleData[]): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    const lookback = 20;
    
    for (let i = lookback; i < data.length; i++) {
      const currentCandle = data[i];
      const prevCandles = data.slice(i - lookback, i);
      
      // Find equal highs/lows (liquidity zones)
      const highs = prevCandles.map(c => c.high);
      const lows = prevCandles.map(c => c.low);
      
      const equalHighs = this.findEqualLevels(highs);
      const equalLows = this.findEqualLevels(lows);
      
      // Check for liquidity sweep above equal highs
      for (const level of equalHighs) {
        if (currentCandle.high > level && currentCandle.close < level) {
          const confidence = this.calculateLiquiditySweepConfidence(data, i, level, 'BEARISH');
          patterns.push({
            type: 'LS',
            direction: 'BEARISH',
            price: level,
            confidence,
            description: `Liquidity Sweep above ${level.toFixed(5)}`,
            pattern: 'LS',
            timestamp: currentCandle.timestamp
          });
        }
      }
      
      // Check for liquidity sweep below equal lows
      for (const level of equalLows) {
        if (currentCandle.low < level && currentCandle.close > level) {
          const confidence = this.calculateLiquiditySweepConfidence(data, i, level, 'BULLISH');
          patterns.push({
            type: 'LS',
            direction: 'BULLISH',
            price: level,
            confidence,
            description: `Liquidity Sweep below ${level.toFixed(5)}`,
            pattern: 'LS',
            timestamp: currentCandle.timestamp
          });
        }
      }
    }
    
    return patterns;
  }

  private detectCHoCH(data: CandleData[]): SMCPattern[] {
    const patterns: SMCPattern[] = [];
    const lookback = 15;
    
    for (let i = lookback; i < data.length; i++) {
      const recentData = data.slice(i - lookback, i + 1);
      const trend = this.identifyTrend(recentData);
      const previousTrend = this.identifyTrend(data.slice(i - lookback * 2, i - lookback + 1));
      
      if (trend !== previousTrend && trend !== 'SIDEWAYS' && previousTrend !== 'SIDEWAYS') {
        const currentCandle = data[i];
        const confidence = this.calculateCHoCHConfidence(recentData);
        
        patterns.push({
          type: 'CHoCH',
          direction: trend as 'BULLISH' | 'BEARISH',
          price: currentCandle.close,
          confidence,
          description: `Change of Character: ${previousTrend} to ${trend}`,
          pattern: 'CHoCH',
          timestamp: currentCandle.timestamp
        });
      }
    }
    
    return patterns;
  }

  // Helper methods for confidence calculations
  private calculateBOSConfidence(data: CandleData[], index: number, direction: 'BULLISH' | 'BEARISH'): number {
    const candle = data[index];
    const volume = candle.volume || 1;
    const bodySize = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    
    let confidence = 0.5;
    
    // Strong body relative to range
    if (bodySize / range > 0.6) confidence += 0.2;
    
    // Volume confirmation (mock calculation)
    const avgVolume = data.slice(index - 10, index).reduce((sum, c) => sum + (c.volume || 1), 0) / 10;
    if (volume > avgVolume * 1.5) confidence += 0.15;
    
    // Momentum continuation
    const nextCandles = data.slice(index + 1, index + 4);
    const continuation = nextCandles.filter(c => 
      direction === 'BULLISH' ? c.close > c.open : c.close < c.open
    ).length;
    
    confidence += (continuation / 3) * 0.2;
    
    return Math.min(0.95, confidence);
  }

  private calculateFVGConfidence(gapSize: number, price: number): number {
    const gapPercentage = (gapSize / price) * 100;
    let confidence = 0.4;
    
    // Larger gaps are more significant
    if (gapPercentage > 0.05) confidence += 0.2;
    if (gapPercentage > 0.1) confidence += 0.15;
    if (gapPercentage > 0.2) confidence += 0.1;
    
    return Math.min(0.9, confidence);
  }

  private calculateOrderBlockConfidence(data: CandleData[], index: number, direction: 'BULLISH' | 'BEARISH'): number {
    const candle = data[index];
    const bodySize = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    
    let confidence = 0.4;
    
    // Strong rejection candle
    if (bodySize / range > 0.7) confidence += 0.3;
    
    // Position in recent range
    const recentData = data.slice(Math.max(0, index - 20), index);
    const recentHigh = Math.max(...recentData.map(c => c.high));
    const recentLow = Math.min(...recentData.map(c => c.low));
    
    if (direction === 'BULLISH' && candle.low <= recentLow + (recentHigh - recentLow) * 0.2) {
      confidence += 0.15;
    } else if (direction === 'BEARISH' && candle.high >= recentHigh - (recentHigh - recentLow) * 0.2) {
      confidence += 0.15;
    }
    
    return Math.min(0.9, confidence);
  }

  private calculateLiquiditySweepConfidence(data: CandleData[], index: number, level: number, direction: 'BULLISH' | 'BEARISH'): number {
    const candle = data[index];
    const wickSize = direction === 'BULLISH' 
      ? Math.abs(candle.low - level)
      : Math.abs(candle.high - level);
    const bodySize = Math.abs(candle.close - candle.open);
    
    let confidence = 0.5;
    
    // Strong rejection (long wick, small body)
    if (wickSize > bodySize * 2) confidence += 0.2;
    
    // Quick reversal
    const nextCandle = data[index + 1];
    if (nextCandle) {
      const reversal = direction === 'BULLISH' 
        ? nextCandle.close > candle.close
        : nextCandle.close < candle.close;
      if (reversal) confidence += 0.15;
    }
    
    return Math.min(0.9, confidence);
  }

  private calculateCHoCHConfidence(data: CandleData[]): number {
    // Simple confidence based on trend strength
    return 0.6 + Math.random() * 0.2; // Mock implementation
  }

  private findEqualLevels(values: number[]): number[] {
    const levels: number[] = [];
    const tolerance = 0.0001; // 1 pip tolerance for forex
    
    for (let i = 0; i < values.length; i++) {
      const matches = values.filter(v => Math.abs(v - values[i]) <= tolerance);
      if (matches.length >= 2 && !levels.some(l => Math.abs(l - values[i]) <= tolerance)) {
        levels.push(values[i]);
      }
    }
    
    return levels;
  }

  private identifyTrend(data: CandleData[]): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
    if (data.length < 5) return 'SIDEWAYS';
    
    const start = data[0].close;
    const end = data[data.length - 1].close;
    const change = (end - start) / start;
    
    if (change > 0.002) return 'BULLISH';
    if (change < -0.002) return 'BEARISH';
    return 'SIDEWAYS';
  }
}

export const smcDetectionService = new SMCDetectionService();