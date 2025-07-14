import { 
  users, strategies, trades, smcSignals, marketData, backtests,
  type User, type InsertUser, type Strategy, type InsertStrategy, 
  type Trade, type InsertTrade, type SMCSignal, type InsertSMCSignal,
  type MarketData, type InsertMarketData, type Backtest, type InsertBacktest
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, balance: number): Promise<void>;
  
  // Strategy operations
  getStrategies(userId: number): Promise<Strategy[]>;
  getStrategy(id: number): Promise<Strategy | undefined>;
  createStrategy(strategy: InsertStrategy & { userId: number }): Promise<Strategy>;
  updateStrategy(id: number, strategy: Partial<InsertStrategy>): Promise<Strategy | undefined>;
  deleteStrategy(id: number): Promise<void>;
  
  // Trade operations
  getTrades(userId: number): Promise<Trade[]>;
  getActiveTrades(userId: number): Promise<Trade[]>;
  getTrade(id: number): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade & { userId: number }): Promise<Trade>;
  updateTrade(id: number, trade: Partial<Trade>): Promise<Trade | undefined>;
  closeTrade(id: number, exitPrice: number, pnl: number): Promise<Trade | undefined>;
  
  // SMC Signal operations
  getSMCSignals(limit?: number): Promise<SMCSignal[]>;
  createSMCSignal(signal: InsertSMCSignal): Promise<SMCSignal>;
  deleteSMCSignal(id: number): Promise<void>;
  
  // Market Data operations
  getMarketData(pair: string, timeframe: string, limit?: number): Promise<MarketData[]>;
  createMarketData(data: InsertMarketData): Promise<MarketData>;
  
  // Backtest operations
  getBacktests(userId: number): Promise<Backtest[]>;
  createBacktest(backtest: InsertBacktest & { userId: number }): Promise<Backtest>;
  getBacktest(id: number): Promise<Backtest | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private strategies: Map<number, Strategy> = new Map();
  private trades: Map<number, Trade> = new Map();
  private smcSignals: Map<number, SMCSignal> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private backtests: Map<number, Backtest> = new Map();
  
  private currentUserId = 1;
  private currentStrategyId = 1;
  private currentTradeId = 1;
  private currentSignalId = 1;
  private currentMarketDataId = 1;
  private currentBacktestId = 1;

  constructor() {
    // Create default user
    this.createUser({ username: "demo", password: "demo123" });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      accountBalance: 10000,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserBalance(userId: number, balance: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.accountBalance = balance;
      this.users.set(userId, user);
    }
  }

  async getStrategies(userId: number): Promise<Strategy[]> {
    return Array.from(this.strategies.values()).filter(s => s.userId === userId);
  }

  async getStrategy(id: number): Promise<Strategy | undefined> {
    return this.strategies.get(id);
  }

  async createStrategy(strategy: InsertStrategy & { userId: number }): Promise<Strategy> {
    const newStrategy: Strategy = {
      ...strategy,
      id: this.currentStrategyId++,
      createdAt: new Date(),
    };
    this.strategies.set(newStrategy.id, newStrategy);
    return newStrategy;
  }

  async updateStrategy(id: number, strategy: Partial<InsertStrategy>): Promise<Strategy | undefined> {
    const existing = this.strategies.get(id);
    if (existing) {
      const updated = { ...existing, ...strategy };
      this.strategies.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteStrategy(id: number): Promise<void> {
    this.strategies.delete(id);
  }

  async getTrades(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(t => t.userId === userId);
  }

  async getActiveTrades(userId: number): Promise<Trade[]> {
    return Array.from(this.trades.values()).filter(t => t.userId === userId && t.status === 'OPEN');
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async createTrade(trade: InsertTrade & { userId: number }): Promise<Trade> {
    const newTrade: Trade = {
      ...trade,
      id: this.currentTradeId++,
      status: 'OPEN',
      entryTime: new Date(),
      exitTime: null,
      exitPrice: null,
      pnl: null,
    };
    this.trades.set(newTrade.id, newTrade);
    return newTrade;
  }

  async updateTrade(id: number, trade: Partial<Trade>): Promise<Trade | undefined> {
    const existing = this.trades.get(id);
    if (existing) {
      const updated = { ...existing, ...trade };
      this.trades.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async closeTrade(id: number, exitPrice: number, pnl: number): Promise<Trade | undefined> {
    const trade = this.trades.get(id);
    if (trade) {
      const updated = {
        ...trade,
        status: 'CLOSED' as const,
        exitPrice,
        pnl,
        exitTime: new Date(),
      };
      this.trades.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async getSMCSignals(limit: number = 50): Promise<SMCSignal[]> {
    return Array.from(this.smcSignals.values())
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, limit);
  }

  async createSMCSignal(signal: InsertSMCSignal): Promise<SMCSignal> {
    const newSignal: SMCSignal = {
      ...signal,
      id: this.currentSignalId++,
      createdAt: new Date(),
    };
    this.smcSignals.set(newSignal.id, newSignal);
    return newSignal;
  }

  async deleteSMCSignal(id: number): Promise<void> {
    this.smcSignals.delete(id);
  }

  async getMarketData(pair: string, timeframe: string, limit: number = 100): Promise<MarketData[]> {
    return Array.from(this.marketData.values())
      .filter(d => d.pair === pair && d.timeframe === timeframe)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createMarketData(data: InsertMarketData): Promise<MarketData> {
    const newData: MarketData = {
      ...data,
      id: this.currentMarketDataId++,
    };
    this.marketData.set(`${newData.pair}-${newData.timeframe}-${newData.timestamp.getTime()}`, newData);
    return newData;
  }

  async getBacktests(userId: number): Promise<Backtest[]> {
    return Array.from(this.backtests.values()).filter(b => b.userId === userId);
  }

  async createBacktest(backtest: InsertBacktest & { userId: number }): Promise<Backtest> {
    const newBacktest: Backtest = {
      ...backtest,
      id: this.currentBacktestId++,
      createdAt: new Date(),
    };
    this.backtests.set(newBacktest.id, newBacktest);
    return newBacktest;
  }

  async getBacktest(id: number): Promise<Backtest | undefined> {
    return this.backtests.get(id);
  }
}

export const storage = new MemStorage();
