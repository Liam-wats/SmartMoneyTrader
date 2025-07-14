import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  accountBalance: real("account_balance").default(10000),
  createdAt: timestamp("created_at").defaultNow(),
});

export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(false),
  riskPercentage: real("risk_percentage").default(2),
  stopLoss: integer("stop_loss").default(50),
  takeProfit: integer("take_profit").default(100),
  bosConfirmation: boolean("bos_confirmation").default(true),
  fvgTrading: boolean("fvg_trading").default(true),
  liquiditySweeps: boolean("liquidity_sweeps").default(false),
  orderBlockFilter: boolean("order_block_filter").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  strategyId: integer("strategy_id").references(() => strategies.id),
  pair: text("pair").notNull(),
  type: text("type").notNull(), // 'BUY' or 'SELL'
  size: real("size").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  pnl: real("pnl"),
  status: text("status").notNull().default('OPEN'), // 'OPEN', 'CLOSED', 'PENDING'
  entryTime: timestamp("entry_time").defaultNow(),
  exitTime: timestamp("exit_time"),
  smcPattern: text("smc_pattern"), // 'BOS', 'FVG', 'OB', 'LS'
});

export const smcSignals = pgTable("smc_signals", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  timeframe: text("timeframe").notNull(),
  pattern: text("pattern").notNull(), // 'BOS', 'CHoCH', 'FVG', 'OB', 'LS'
  direction: text("direction").notNull(), // 'BULLISH', 'BEARISH'
  price: real("price").notNull(),
  confidence: real("confidence").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketData = pgTable("market_data", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  timeframe: text("timeframe").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: real("volume").notNull(),
});

export const backtests = pgTable("backtests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  strategyId: integer("strategy_id").references(() => strategies.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalTrades: integer("total_trades").notNull(),
  winRate: real("win_rate").notNull(),
  profitFactor: real("profit_factor").notNull(),
  maxDrawdown: real("max_drawdown").notNull(),
  totalPnL: real("total_pnl").notNull(),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertStrategySchema = createInsertSchema(strategies).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  entryTime: true,
  exitTime: true,
  pnl: true,
});

export const insertSMCSignalSchema = createInsertSchema(smcSignals).omit({
  id: true,
  createdAt: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
});

export const insertBacktestSchema = createInsertSchema(backtests).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type SMCSignal = typeof smcSignals.$inferSelect;
export type InsertSMCSignal = z.infer<typeof insertSMCSignalSchema>;

export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;

export type Backtest = typeof backtests.$inferSelect;
export type InsertBacktest = z.infer<typeof insertBacktestSchema>;
