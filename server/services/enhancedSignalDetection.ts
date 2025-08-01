import { TechnicalAnalysisService, TradingSignal } from './technicalAnalysis';
import { SMCDetectionService } from './smcDetection';
import { TelegramNotificationService } from './telegramNotification';
import { marketDataService } from './marketData';

export class EnhancedSignalDetectionService {
  private technicalAnalysis: TechnicalAnalysisService;
  private smcDetection: SMCDetectionService;
  private telegramService: TelegramNotificationService;
  private lastSignalTime: Map<string, number> = new Map();
  private isMonitoring: boolean = false;
  private signalHistory: TradingSignal[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.technicalAnalysis = new TechnicalAnalysisService();
    this.smcDetection = new SMCDetectionService();
    this.telegramService = new TelegramNotificationService();
  }

  async analyzeAllPairs(): Promise<TradingSignal[]> {
    const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'NZDUSD', 'USDCAD'];
    const timeframes = ['1h', '4h'];
    const signals: TradingSignal[] = [];

    for (const pair of pairs) {
      for (const timeframe of timeframes) {
        try {
          const signal = await this.analyzePair(pair, timeframe);
          if (signal) {
            signals.push(signal);
          }
        } catch (error) {
          console.error(`Error analyzing ${pair} ${timeframe}:`, error);
        }
      }
    }

    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  async analyzePair(pair: string, timeframe: string): Promise<TradingSignal | null> {
    try {
      // Get market data
      const marketData = await marketDataService.getHistoricalData(pair, timeframe, 100);
      if (!marketData || marketData.length < 50) {
        console.log(`Insufficient data for ${pair} ${timeframe}`);
        return null;
      }

      // Detect SMC patterns
      const smcPatterns = this.smcDetection.detectPatterns(marketData, pair, timeframe);
      
      // Perform technical analysis
      const signal = this.technicalAnalysis.analyzeForTradingSignal(
        marketData,
        smcPatterns,
        pair,
        timeframe
      );

      return signal;
    } catch (error) {
      console.error(`Error analyzing ${pair} ${timeframe}:`, error);
      return null;
    }
  }

  async processAndNotifySignals(): Promise<void> {
    try {
      const signals = await this.analyzeAllPairs();
      const highConfidenceSignals = signals.filter(s => s.confidence >= 70);

      for (const signal of highConfidenceSignals) {
        await this.processSignal(signal);
      }
    } catch (error) {
      console.error('Error processing signals:', error);
    }
  }

  private async processSignal(signal: TradingSignal): Promise<void> {
    const signalKey = `${signal.pair}-${signal.timeframe}`;
    const now = Date.now();
    const lastSignal = this.lastSignalTime.get(signalKey) || 0;
    
    // Prevent duplicate signals within 1 hour
    if (now - lastSignal < 3600000) {
      return;
    }

    this.lastSignalTime.set(signalKey, now);
    
    // Store signal in history
    this.signalHistory.push(signal);
    
    // Keep only last 100 signals
    if (this.signalHistory.length > 100) {
      this.signalHistory = this.signalHistory.slice(-100);
    }

    // Format message for Telegram
    const message = this.technicalAnalysis.formatSignalForTelegram(signal);
    
    // Send to Telegram
    if (this.telegramService.isConfigured()) {
      const sent = await this.telegramService.sendTradingSignal(signal, message);
      if (sent) {
        console.log(`Signal sent to Telegram: ${signal.pair} ${signal.direction} (${signal.confidence.toFixed(1)}%)`);
      }
    } else {
      console.log(`High confidence signal detected: ${signal.pair} ${signal.direction} (${signal.confidence.toFixed(1)}%)`);
      console.log('Telegram not configured - signal not sent');
    }
  }

  startMonitoring(intervalMinutes: number = 15): void {
    if (this.isMonitoring) {
      console.log('Signal monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log(`Starting signal monitoring every ${intervalMinutes} minutes`);

    // Initial scan
    this.processAndNotifySignals();

    // Set up interval
    this.monitoringInterval = setInterval(async () => {
      if (this.isMonitoring) {
        await this.processAndNotifySignals();
      }
    }, intervalMinutes * 60 * 1000);
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Signal monitoring stopped');
  }

  async testTelegramConnection(): Promise<boolean> {
    return await this.telegramService.testConnection();
  }

  async getLatestSignals(limit: number = 10): Promise<TradingSignal[]> {
    const signals = await this.analyzeAllPairs();
    return signals.slice(0, limit);
  }

  async getActiveSignals(): Promise<TradingSignal[]> {
    // Return the most recent signals from the last 24 hours
    const signals = this.signalHistory.filter(signal => 
      Date.now() - signal.timestamp < 24 * 60 * 60 * 1000
    );
    return signals.slice(-10); // Return last 10 signals
  }

  async getSignalHistory(): Promise<TradingSignal[]> {
    return [...this.signalHistory].reverse(); // Return all signals in reverse chronological order
  }

  async getLatestSignals(limit: number = 10): Promise<TradingSignal[]> {
    return this.signalHistory.slice(-limit).reverse();
  }
}

export const enhancedSignalDetection = new EnhancedSignalDetectionService();