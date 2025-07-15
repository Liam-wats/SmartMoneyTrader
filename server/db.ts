import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { eq } from 'drizzle-orm';
import { users, strategies, trades, smcSignals, marketData, backtests, type User, type InsertUser, type Strategy, type InsertStrategy, type Trade, type InsertTrade, type SMCSignal, type InsertSMCSignal, type MarketData, type InsertMarketData, type Backtest, type InsertBacktest } from '@shared/schema';
import type { IStorage } from './storage';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserBalance(userId: number, balance: number): Promise<void> {
    await db.update(users).set({ accountBalance: balance }).where(eq(users.id, userId));
  }

  async getStrategies(userId: number): Promise<Strategy[]> {
    return await db.select().from(strategies).where(eq(strategies.userId, userId));
  }

  async getStrategy(id: number): Promise<Strategy | undefined> {
    const [strategy] = await db.select().from(strategies).where(eq(strategies.id, id));
    return strategy || undefined;
  }

  async createStrategy(strategy: InsertStrategy & { userId: number }): Promise<Strategy> {
    const [newStrategy] = await db.insert(strategies).values(strategy).returning();
    return newStrategy;
  }

  async updateStrategy(id: number, strategy: Partial<InsertStrategy>): Promise<Strategy | undefined> {
    const [updated] = await db.update(strategies).set(strategy).where(eq(strategies.id, id)).returning();
    return updated || undefined;
  }

  async deleteStrategy(id: number): Promise<void> {
    await db.delete(strategies).where(eq(strategies.id, id));
  }

  async getTrades(userId: number): Promise<Trade[]> {
    return await db.select().from(trades).where(eq(trades.userId, userId));
  }

  async getActiveTrades(userId: number): Promise<Trade[]> {
    return await db.select().from(trades).where(eq(trades.userId, userId)).where(eq(trades.status, 'OPEN'));
  }

  async getTrade(id: number): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade || undefined;
  }

  async createTrade(trade: InsertTrade & { userId: number }): Promise<Trade> {
    const [newTrade] = await db.insert(trades).values(trade).returning();
    return newTrade;
  }

  async updateTrade(id: number, trade: Partial<Trade>): Promise<Trade | undefined> {
    const [updated] = await db.update(trades).set(trade).where(eq(trades.id, id)).returning();
    return updated || undefined;
  }

  async closeTrade(id: number, exitPrice: number, pnl: number): Promise<Trade | undefined> {
    const [updated] = await db.update(trades).set({ 
      exitPrice, 
      pnl, 
      status: 'CLOSED',
      exitTime: new Date()
    }).where(eq(trades.id, id)).returning();
    return updated || undefined;
  }

  async getSMCSignals(limit: number = 50): Promise<SMCSignal[]> {
    return await db.select().from(smcSignals).limit(limit);
  }

  async createSMCSignal(signal: InsertSMCSignal): Promise<SMCSignal> {
    const [newSignal] = await db.insert(smcSignals).values(signal).returning();
    return newSignal;
  }

  async deleteSMCSignal(id: number): Promise<void> {
    await db.delete(smcSignals).where(eq(smcSignals.id, id));
  }

  async getMarketData(pair: string, timeframe: string, limit: number = 100): Promise<MarketData[]> {
    return await db.select().from(marketData)
      .where(eq(marketData.pair, pair))
      .where(eq(marketData.timeframe, timeframe))
      .limit(limit);
  }

  async createMarketData(data: InsertMarketData): Promise<MarketData> {
    const [newData] = await db.insert(marketData).values(data).returning();
    return newData;
  }

  async getBacktests(userId: number): Promise<Backtest[]> {
    return await db.select().from(backtests).where(eq(backtests.userId, userId));
  }

  async createBacktest(backtest: InsertBacktest & { userId: number }): Promise<Backtest> {
    const [newBacktest] = await db.insert(backtests).values(backtest).returning();
    return newBacktest;
  }

  async getBacktest(id: number): Promise<Backtest | undefined> {
    const [backtest] = await db.select().from(backtests).where(eq(backtests.id, id));
    return backtest || undefined;
  }
}
