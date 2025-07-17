import { TelegramNotificationService } from './server/services/telegramNotification.js';
import { TechnicalAnalysisService } from './server/services/technicalAnalysis.js';

// Create a mock trading signal
const mockSignal = {
  pair: 'EURUSD',
  timeframe: '1h',
  direction: 'BUY',
  entryPrice: 1.0845,
  takeProfitPrice: 1.0895,
  stopLossPrice: 1.0820,
  confidence: 78.5,
  indicators: {
    rsi: 42.3,
    sma20: 1.0838,
    sma50: 1.0825,
    ema20: 1.0840,
    ema50: 1.0828,
    bbUpper: 1.0865,
    bbMiddle: 1.0845,
    bbLower: 1.0825,
    macd: 0.0003,
    macdSignal: 0.0001,
    macdHistogram: 0.0002,
    stochK: 35.2,
    stochD: 38.7,
    atr: 0.0025
  },
  smcPatterns: [
    { type: 'BOS', direction: 'BULLISH', confidence: 82.1 },
    { type: 'FVG', direction: 'BULLISH', confidence: 75.3 }
  ],
  confirmations: [
    'RSI Oversold Recovery',
    'Moving Averages Bullish Aligned',
    'BOS Pattern Confirmed',
    'FVG Support Level'
  ],
  riskRewardRatio: 2.5,
  timestamp: Date.now()
};

async function testTelegramSignal() {
  console.log('🔧 Testing Telegram Signal System...');
  
  const telegramService = new TelegramNotificationService();
  const technicalAnalysis = new TechnicalAnalysisService();
  
  // Format the signal message
  const message = technicalAnalysis.formatSignalForTelegram(mockSignal);
  
  console.log('📧 Formatted Message:');
  console.log(message);
  console.log('\n🚀 Sending to Telegram...');
  
  // Send the signal
  const success = await telegramService.sendTradingSignal(mockSignal, message);
  
  if (success) {
    console.log('✅ Signal sent successfully to Telegram!');
  } else {
    console.log('❌ Failed to send signal to Telegram');
  }
}

testTelegramSignal().catch(console.error);