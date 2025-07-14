export interface MarketData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMCPattern {
  type: 'BOS' | 'CHoCH' | 'FVG' | 'OB' | 'LS';
  direction: 'BULLISH' | 'BEARISH';
  price: number;
  confidence: number;
  description: string;
}

export interface TradingSignal {
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  confidence: number;
  pattern: string;
  reason: string;
}

export interface PerformanceMetrics {
  totalPnL: number;
  winRate: number;
  activeTrades: number;
  smcSignals: number;
  totalTrades: number;
  profitFactor: number;
  maxDrawdown: number;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}
