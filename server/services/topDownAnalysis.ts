import { CandleData, marketDataService } from './marketData';
import { SMCDetectionService, SMCPattern } from './smcDetection';

export interface TopDownAnalysisResult {
  pair: string;
  mainTrend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  timeframes: {
    [key: string]: {
      trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
      patterns: SMCPattern[];
      confidence: number;
      keyLevels: number[];
    };
  };
  entryZones: {
    bullish: number[];
    bearish: number[];
  };
  exitZones: {
    bullish: number[];
    bearish: number[];
  };
  confluenceScore: number;
}

export class TopDownAnalysisService {
  private smcDetection = new SMCDetectionService();
  private timeframeHierarchy = ['1d', '4h', '1h', '30m', '15m', '5m'];

  async performTopDownAnalysis(pair: string): Promise<TopDownAnalysisResult> {
    const analysisResult: TopDownAnalysisResult = {
      pair,
      mainTrend: 'SIDEWAYS',
      timeframes: {},
      entryZones: { bullish: [], bearish: [] },
      exitZones: { bullish: [], bearish: [] },
      confluenceScore: 0,
    };

    // Analyze each timeframe from highest to lowest
    for (const timeframe of this.timeframeHierarchy) {
      const data = await marketDataService.getHistoricalData(pair, timeframe, 200);
      if (data.length === 0) continue;

      const patterns = this.smcDetection.detectPatterns(data, pair, timeframe);
      const trend = this.analyzeTrend(data);
      const keyLevels = this.identifyKeyLevels(data, patterns);
      const confidence = this.calculateConfidence(data, patterns, trend);

      analysisResult.timeframes[timeframe] = {
        trend,
        patterns,
        confidence,
        keyLevels,
      };
    }

    // Determine main trend based on higher timeframes
    analysisResult.mainTrend = this.determineMainTrend(analysisResult.timeframes);

    // Calculate entry and exit zones
    this.calculateEntryExitZones(analysisResult);

    // Calculate confluence score
    analysisResult.confluenceScore = this.calculateConfluenceScore(analysisResult);

    return analysisResult;
  }

  private analyzeTrend(data: CandleData[]): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
    if (data.length < 20) return 'SIDEWAYS';

    const recentData = data.slice(-20);
    const earlierData = data.slice(-40, -20);

    const recentAvg = recentData.reduce((sum, d) => sum + d.close, 0) / recentData.length;
    const earlierAvg = earlierData.reduce((sum, d) => sum + d.close, 0) / earlierData.length;

    const percentChange = ((recentAvg - earlierAvg) / earlierAvg) * 100;

    if (percentChange > 0.5) return 'BULLISH';
    if (percentChange < -0.5) return 'BEARISH';
    return 'SIDEWAYS';
  }

  private identifyKeyLevels(data: CandleData[], patterns: SMCPattern[]): number[] {
    const levels: number[] = [];
    
    // Add pattern-based levels
    patterns.forEach(pattern => {
      levels.push(pattern.price);
    });

    // Add pivot highs and lows
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i];
      const prev1 = data[i-1];
      const prev2 = data[i-2];
      const next1 = data[i+1];
      const next2 = data[i+2];

      // Pivot high
      if (current.high > prev1.high && current.high > prev2.high && 
          current.high > next1.high && current.high > next2.high) {
        levels.push(current.high);
      }

      // Pivot low
      if (current.low < prev1.low && current.low < prev2.low && 
          current.low < next1.low && current.low < next2.low) {
        levels.push(current.low);
      }
    }

    // Remove duplicates and sort
    return [...new Set(levels)].sort((a, b) => a - b);
  }

  private calculateConfidence(data: CandleData[], patterns: SMCPattern[], trend: string): number {
    let confidence = 0.5; // Base confidence

    // Volume confirmation
    const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    const recentVolume = data.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5;
    if (recentVolume > avgVolume * 1.2) confidence += 0.1;

    // Pattern strength
    const strongPatterns = patterns.filter(p => p.confidence > 0.8);
    confidence += strongPatterns.length * 0.05;

    // Trend consistency
    const consistentTrend = this.checkTrendConsistency(data);
    if (consistentTrend) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private checkTrendConsistency(data: CandleData[]): boolean {
    if (data.length < 10) return false;

    const recent = data.slice(-10);
    let bullishCount = 0;
    let bearishCount = 0;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i].close > recent[i-1].close) bullishCount++;
      else bearishCount++;
    }

    return Math.abs(bullishCount - bearishCount) > 3;
  }

  private determineMainTrend(timeframes: any): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
    const higherTimeframes = ['1d', '4h', '1h'];
    const trends = higherTimeframes
      .filter(tf => timeframes[tf])
      .map(tf => timeframes[tf].trend);

    if (trends.length === 0) return 'SIDEWAYS';

    const bullishCount = trends.filter(t => t === 'BULLISH').length;
    const bearishCount = trends.filter(t => t === 'BEARISH').length;

    if (bullishCount > bearishCount) return 'BULLISH';
    if (bearishCount > bullishCount) return 'BEARISH';
    return 'SIDEWAYS';
  }

  private calculateEntryExitZones(analysisResult: TopDownAnalysisResult): void {
    const allLevels: number[] = [];
    
    // Collect all key levels from all timeframes
    Object.values(analysisResult.timeframes).forEach(tf => {
      allLevels.push(...tf.keyLevels);
    });

    // Sort and remove duplicates
    const uniqueLevels = [...new Set(allLevels)].sort((a, b) => a - b);

    // Identify support and resistance zones
    const currentPrice = uniqueLevels[Math.floor(uniqueLevels.length / 2)];
    
    const supportLevels = uniqueLevels.filter(level => level < currentPrice);
    const resistanceLevels = uniqueLevels.filter(level => level > currentPrice);

    // Calculate entry zones based on main trend
    if (analysisResult.mainTrend === 'BULLISH') {
      analysisResult.entryZones.bullish = supportLevels.slice(-3);
      analysisResult.exitZones.bullish = resistanceLevels.slice(0, 3);
    } else if (analysisResult.mainTrend === 'BEARISH') {
      analysisResult.entryZones.bearish = resistanceLevels.slice(0, 3);
      analysisResult.exitZones.bearish = supportLevels.slice(-3);
    } else {
      // For sideways market, prepare both directions
      analysisResult.entryZones.bullish = supportLevels.slice(-2);
      analysisResult.entryZones.bearish = resistanceLevels.slice(0, 2);
      analysisResult.exitZones.bullish = resistanceLevels.slice(0, 2);
      analysisResult.exitZones.bearish = supportLevels.slice(-2);
    }
  }

  private calculateConfluenceScore(analysisResult: TopDownAnalysisResult): number {
    let score = 0;
    const timeframes = Object.keys(analysisResult.timeframes);
    
    // Check trend alignment across timeframes
    const trendAlignment = timeframes.filter(tf => 
      analysisResult.timeframes[tf].trend === analysisResult.mainTrend
    ).length / timeframes.length;
    
    score += trendAlignment * 0.4;

    // Check pattern confirmation
    const totalPatterns = timeframes.reduce((sum, tf) => 
      sum + analysisResult.timeframes[tf].patterns.length, 0
    );
    
    score += Math.min(totalPatterns / 10, 0.3);

    // Check confidence levels
    const avgConfidence = timeframes.reduce((sum, tf) => 
      sum + analysisResult.timeframes[tf].confidence, 0
    ) / timeframes.length;
    
    score += avgConfidence * 0.3;

    return Math.min(score, 1.0);
  }
}

export const topDownAnalysisService = new TopDownAnalysisService();