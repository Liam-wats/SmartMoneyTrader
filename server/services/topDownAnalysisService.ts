import { CandleData, marketDataService } from './marketData';
import { smcDetectionService } from './smcDetection';
import { mlPatternRecognitionService } from './mlPatternRecognition';
import { marketHoursService } from './marketHours';

export interface HighProbabilityTrade {
  pair: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  confidence: number;
  confluences: string[];
  timeframe: string;
  analysis: {
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    keyLevel: number;
    structure: string;
    momentum: number;
    volume: number;
  };
  signals: {
    smc: any[];
    ml: any[];
    traditional: any[];
  };
}

export interface MarketOverview {
  session: string | null;
  isOpen: boolean;
  highProbabilityTrades: HighProbabilityTrade[];
  marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  volatilityIndex: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class TopDownAnalysisService {
  private readonly MAJOR_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];
  private readonly TIMEFRAMES = ['1d', '4h', '1h'];
  private readonly MIN_CONFIDENCE = 0.75;
  private readonly MIN_RR_RATIO = 2.0;

  async analyzeMarket(): Promise<MarketOverview> {
    const marketStatus = marketHoursService.getMarketStatus();
    
    if (!marketStatus.isOpen) {
      return {
        session: marketStatus.currentSession,
        isOpen: false,
        highProbabilityTrades: [],
        marketSentiment: 'NEUTRAL',
        volatilityIndex: 0,
        riskLevel: 'LOW'
      };
    }

    const highProbabilityTrades: HighProbabilityTrade[] = [];
    const sentimentScores: number[] = [];
    const volatilityScores: number[] = [];

    for (const pair of this.MAJOR_PAIRS) {
      try {
        const trade = await this.analyzeAsset(pair);
        if (trade && trade.confidence >= this.MIN_CONFIDENCE && trade.riskRewardRatio >= this.MIN_RR_RATIO) {
          highProbabilityTrades.push(trade);
        }
        
        // Collect sentiment and volatility data
        const sentiment = trade?.analysis.trend === 'BULLISH' ? 1 : trade?.analysis.trend === 'BEARISH' ? -1 : 0;
        sentimentScores.push(sentiment);
        volatilityScores.push(trade?.analysis.momentum || 0);
      } catch (error) {
        console.error(`Error analyzing ${pair}:`, error);
      }
    }

    // Calculate market-wide metrics
    const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
    const marketSentiment = avgSentiment > 0.3 ? 'BULLISH' : avgSentiment < -0.3 ? 'BEARISH' : 'NEUTRAL';
    
    const volatilityIndex = volatilityScores.reduce((a, b) => a + b, 0) / volatilityScores.length;
    const riskLevel = volatilityIndex > 0.7 ? 'HIGH' : volatilityIndex > 0.4 ? 'MEDIUM' : 'LOW';

    // Sort trades by confidence
    highProbabilityTrades.sort((a, b) => b.confidence - a.confidence);

    return {
      session: marketStatus.currentSession,
      isOpen: marketStatus.isOpen,
      highProbabilityTrades: highProbabilityTrades.slice(0, 5), // Top 5 trades
      marketSentiment,
      volatilityIndex,
      riskLevel
    };
  }

  private async analyzeAsset(pair: string): Promise<HighProbabilityTrade | null> {
    try {
      // Get data for multiple timeframes
      const dailyData = await marketDataService.getHistoricalData(pair, '1d', 30);
      const h4Data = await marketDataService.getHistoricalData(pair, '4h', 50);
      const h1Data = await marketDataService.getHistoricalData(pair, '1h', 100);

      if (!dailyData.length || !h4Data.length || !h1Data.length) {
        return null;
      }

      // Perform top-down analysis
      const dailyTrend = this.analyzeTrend(dailyData);
      const h4Trend = this.analyzeTrend(h4Data);
      const h1Structure = this.analyzeStructure(h1Data);

      // Check trend alignment
      const trendAlignment = this.checkTrendAlignment(dailyTrend, h4Trend, h1Structure.trend);
      if (!trendAlignment.aligned) {
        return null;
      }

      // Get SMC signals
      const smcSignals = smcDetectionService.detectPatterns(h1Data, pair, '1h');
      const validSmcSignals = smcSignals.filter(s => s.confidence > 0.7);

      // Get ML predictions
      const mlPredictions = await mlPatternRecognitionService.analyzePattern(h1Data, pair, '1h');
      const validMlPredictions = mlPredictions.filter(p => p.confidence > 0.7);

      if (validSmcSignals.length === 0 && validMlPredictions.length === 0) {
        return null;
      }

      // Find confluences
      const confluences = this.findConfluences(validSmcSignals, validMlPredictions, h1Structure);
      if (confluences.length < 2) {
        return null; // Need at least 2 confluences for high probability
      }

      // Calculate entry, stop loss, and take profit
      const currentPrice = h1Data[h1Data.length - 1].close;
      const direction = trendAlignment.direction;
      const { entryPrice, stopLoss, takeProfit } = this.calculateLevels(
        currentPrice, 
        direction, 
        h1Structure, 
        validSmcSignals
      );

      const riskRewardRatio = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss);
      
      // Calculate overall confidence
      const confidence = this.calculateConfidence(
        trendAlignment,
        validSmcSignals,
        validMlPredictions,
        confluences,
        riskRewardRatio
      );

      return {
        pair,
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        riskRewardRatio,
        confidence,
        confluences,
        timeframe: '1h',
        analysis: {
          trend: trendAlignment.direction === 'BUY' ? 'BULLISH' : 'BEARISH',
          keyLevel: h1Structure.keyLevel,
          structure: h1Structure.type,
          momentum: h1Structure.momentum,
          volume: this.calculateVolumeProfile(h1Data)
        },
        signals: {
          smc: validSmcSignals,
          ml: validMlPredictions,
          traditional: []
        }
      };
    } catch (error) {
      console.error(`Error in analyzeAsset for ${pair}:`, error);
      return null;
    }
  }

  private analyzeTrend(data: CandleData[]): { trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS'; strength: number } {
    if (data.length < 20) {
      return { trend: 'SIDEWAYS', strength: 0 };
    }

    const sma20 = this.calculateSMA(data, 20);
    const sma50 = this.calculateSMA(data, Math.min(50, data.length));
    
    const currentPrice = data[data.length - 1].close;
    const priceAboveSma20 = currentPrice > sma20;
    const sma20AboveSma50 = sma20 > sma50;
    
    // Calculate trend strength
    const recentHighs = data.slice(-10).map(d => d.high);
    const recentLows = data.slice(-10).map(d => d.low);
    const isUptrend = recentHighs.every((high, i) => i === 0 || high >= recentHighs[i - 1]);
    const isDowntrend = recentLows.every((low, i) => i === 0 || low <= recentLows[i - 1]);
    
    if (priceAboveSma20 && sma20AboveSma50 && isUptrend) {
      return { trend: 'BULLISH', strength: 0.8 };
    } else if (!priceAboveSma20 && !sma20AboveSma50 && isDowntrend) {
      return { trend: 'BEARISH', strength: 0.8 };
    } else {
      return { trend: 'SIDEWAYS', strength: 0.3 };
    }
  }

  private analyzeStructure(data: CandleData[]): {
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    type: string;
    keyLevel: number;
    momentum: number;
  } {
    const swingHighs = this.findSwingPoints(data, 'high');
    const swingLows = this.findSwingPoints(data, 'low');
    
    // Determine market structure
    const isHigherHighs = swingHighs.length >= 2 && 
      swingHighs[swingHighs.length - 1].price > swingHighs[swingHighs.length - 2].price;
    const isHigherLows = swingLows.length >= 2 && 
      swingLows[swingLows.length - 1].price > swingLows[swingLows.length - 2].price;
    
    const isLowerLows = swingLows.length >= 2 && 
      swingLows[swingLows.length - 1].price < swingLows[swingLows.length - 2].price;
    const isLowerHighs = swingHighs.length >= 2 && 
      swingHighs[swingHighs.length - 1].price < swingHighs[swingHighs.length - 2].price;

    let trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    let structureType: string;

    if (isHigherHighs && isHigherLows) {
      trend = 'BULLISH';
      structureType = 'Higher Highs & Higher Lows';
    } else if (isLowerLows && isLowerHighs) {
      trend = 'BEARISH';
      structureType = 'Lower Lows & Lower Highs';
    } else {
      trend = 'SIDEWAYS';
      structureType = 'Consolidation';
    }

    // Find key level (recent swing high/low)
    const recentSwingHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1].price : data[data.length - 1].high;
    const recentSwingLow = swingLows.length > 0 ? swingLows[swingLows.length - 1].price : data[data.length - 1].low;
    const keyLevel = trend === 'BULLISH' ? recentSwingLow : recentSwingHigh;

    // Calculate momentum
    const momentum = this.calculateMomentum(data);

    return {
      trend,
      type: structureType,
      keyLevel,
      momentum
    };
  }

  private checkTrendAlignment(
    daily: { trend: string; strength: number },
    h4: { trend: string; strength: number },
    h1: string
  ): { aligned: boolean; direction: 'BUY' | 'SELL' } {
    const trends = [daily.trend, h4.trend, h1];
    const bullishCount = trends.filter(t => t === 'BULLISH').length;
    const bearishCount = trends.filter(t => t === 'BEARISH').length;
    
    if (bullishCount >= 2 && daily.trend !== 'BEARISH') {
      return { aligned: true, direction: 'BUY' };
    } else if (bearishCount >= 2 && daily.trend !== 'BULLISH') {
      return { aligned: true, direction: 'SELL' };
    }
    
    return { aligned: false, direction: 'BUY' };
  }

  private findConfluences(smcSignals: any[], mlPredictions: any[], structure: any): string[] {
    const confluences: string[] = [];
    
    if (smcSignals.length > 0) confluences.push('SMC Pattern');
    if (mlPredictions.length > 0) confluences.push('ML Prediction');
    if (structure.momentum > 0.6) confluences.push('Strong Momentum');
    if (structure.type.includes('Higher') || structure.type.includes('Lower')) {
      confluences.push('Clear Structure');
    }
    
    return confluences;
  }

  private calculateLevels(
    currentPrice: number,
    direction: 'BUY' | 'SELL',
    structure: any,
    signals: any[]
  ): { entryPrice: number; stopLoss: number; takeProfit: number } {
    const atr = this.calculateATR([{ close: currentPrice } as CandleData], 1);
    
    let entryPrice = currentPrice;
    let stopLoss: number;
    let takeProfit: number;
    
    if (direction === 'BUY') {
      stopLoss = Math.max(structure.keyLevel, currentPrice - (atr * 2));
      takeProfit = currentPrice + (Math.abs(currentPrice - stopLoss) * 2.5);
    } else {
      stopLoss = Math.min(structure.keyLevel, currentPrice + (atr * 2));
      takeProfit = currentPrice - (Math.abs(stopLoss - currentPrice) * 2.5);
    }
    
    return { entryPrice, stopLoss, takeProfit };
  }

  private calculateConfidence(
    trendAlignment: any,
    smcSignals: any[],
    mlPredictions: any[],
    confluences: string[],
    riskRewardRatio: number
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Trend alignment bonus
    confidence += 0.2;
    
    // SMC signals bonus
    if (smcSignals.length > 0) {
      confidence += Math.min(smcSignals.length * 0.1, 0.2);
    }
    
    // ML predictions bonus
    if (mlPredictions.length > 0) {
      confidence += Math.min(mlPredictions.length * 0.1, 0.2);
    }
    
    // Confluences bonus
    confidence += Math.min(confluences.length * 0.05, 0.15);
    
    // Risk/reward bonus
    if (riskRewardRatio >= 3) confidence += 0.1;
    else if (riskRewardRatio >= 2) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  // Helper methods
  private calculateSMA(data: CandleData[], period: number): number {
    if (data.length < period) return data[data.length - 1].close;
    
    const sum = data.slice(-period).reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
  }

  private calculateATR(data: CandleData[], period: number = 14): number {
    if (data.length < 2) return 0.001;
    
    const tr = data.slice(1).map((candle, i) => {
      const prevClose = data[i].close;
      return Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - prevClose),
        Math.abs(candle.low - prevClose)
      );
    });
    
    return tr.slice(-Math.min(period, tr.length)).reduce((a, b) => a + b, 0) / Math.min(period, tr.length);
  }

  private findSwingPoints(data: CandleData[], type: 'high' | 'low'): { price: number; index: number }[] {
    const points: { price: number; index: number }[] = [];
    const lookback = 5;
    
    for (let i = lookback; i < data.length - lookback; i++) {
      const current = type === 'high' ? data[i].high : data[i].low;
      let isSwingPoint = true;
      
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j === i) continue;
        const compare = type === 'high' ? data[j].high : data[j].low;
        
        if (type === 'high' && compare >= current) {
          isSwingPoint = false;
          break;
        } else if (type === 'low' && compare <= current) {
          isSwingPoint = false;
          break;
        }
      }
      
      if (isSwingPoint) {
        points.push({ price: current, index: i });
      }
    }
    
    return points;
  }

  private calculateMomentum(data: CandleData[]): number {
    if (data.length < 10) return 0;
    
    const recent = data.slice(-10);
    const older = data.slice(-20, -10);
    
    const recentAvg = recent.reduce((acc, d) => acc + d.close, 0) / recent.length;
    const olderAvg = older.reduce((acc, d) => acc + d.close, 0) / older.length;
    
    return Math.abs(recentAvg - olderAvg) / olderAvg;
  }

  private calculateVolumeProfile(data: CandleData[]): number {
    if (data.length < 20) return 0;
    
    const recentVolume = data.slice(-10).reduce((acc, d) => acc + d.volume, 0) / 10;
    const avgVolume = data.slice(-20).reduce((acc, d) => acc + d.volume, 0) / 20;
    
    return recentVolume / avgVolume;
  }
}

export const topDownAnalysisService = new TopDownAnalysisService();