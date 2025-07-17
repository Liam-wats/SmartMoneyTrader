"""
Database service for PostgreSQL operations
"""
import os
import asyncpg
from typing import List, Dict, Optional, Any
from datetime import datetime
import json

class DatabaseManager:
    def __init__(self):
        self.pool = None
        self.database_url = os.getenv("DATABASE_URL")
        
    async def initialize(self):
        """Initialize database connection pool"""
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        self.pool = await asyncpg.create_pool(
            self.database_url,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        
        # Create tables if they don't exist
        await self._create_tables()
        
    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
    
    async def _create_tables(self):
        """Create database tables"""
        async with self.pool.acquire() as conn:
            # Users table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    account_balance REAL DEFAULT 10000,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            ''')
            
            # Strategies table  
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS strategies (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    name TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT FALSE,
                    risk_percentage REAL DEFAULT 2,
                    stop_loss INTEGER DEFAULT 50,
                    take_profit INTEGER DEFAULT 100,
                    bos_confirmation BOOLEAN DEFAULT TRUE,
                    fvg_trading BOOLEAN DEFAULT TRUE,
                    liquidity_sweeps BOOLEAN DEFAULT FALSE,
                    order_block_filter BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            ''')
            
            # Trades table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS trades (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    strategy_id INTEGER REFERENCES strategies(id),
                    pair TEXT NOT NULL,
                    type TEXT NOT NULL,
                    size REAL NOT NULL,
                    entry_price REAL NOT NULL,
                    exit_price REAL,
                    stop_loss REAL,
                    take_profit REAL,
                    pnl REAL,
                    status TEXT DEFAULT 'OPEN',
                    entry_time TIMESTAMP DEFAULT NOW(),
                    exit_time TIMESTAMP,
                    smc_pattern TEXT
                )
            ''')
            
            # SMC Signals table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS smc_signals (
                    id SERIAL PRIMARY KEY,
                    pair TEXT NOT NULL,
                    timeframe TEXT NOT NULL,
                    pattern TEXT NOT NULL,
                    direction TEXT NOT NULL,
                    price REAL NOT NULL,
                    confidence REAL NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            ''')
            
            # Market Data table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS market_data (
                    id SERIAL PRIMARY KEY,
                    pair TEXT NOT NULL,
                    timeframe TEXT NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    open REAL NOT NULL,
                    high REAL NOT NULL,
                    low REAL NOT NULL,
                    close REAL NOT NULL,
                    volume REAL NOT NULL
                )
            ''')
            
            # Backtests table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS backtests (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    strategy_id INTEGER REFERENCES strategies(id),
                    start_date TIMESTAMP NOT NULL,
                    end_date TIMESTAMP NOT NULL,
                    initial_balance REAL NOT NULL,
                    final_balance REAL NOT NULL,
                    total_trades INTEGER NOT NULL,
                    winning_trades INTEGER NOT NULL,
                    win_rate REAL NOT NULL,
                    profit_factor REAL NOT NULL,
                    max_drawdown REAL NOT NULL,
                    results JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            ''')
    
    # User operations
    async def get_user(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        async with self.pool.acquire() as conn:
            result = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1", user_id
            )
            return dict(result) if result else None
    
    async def create_user(self, user_data: Dict) -> Dict:
        """Create new user"""
        async with self.pool.acquire() as conn:
            result = await conn.fetchrow(
                """INSERT INTO users (username, password, account_balance) 
                   VALUES ($1, $2, $3) RETURNING *""",
                user_data["username"],
                user_data["password"],
                user_data.get("account_balance", 10000.0)
            )
            return dict(result)
    
    async def update_user_balance(self, user_id: int, balance: float) -> None:
        """Update user balance"""
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET account_balance = $1 WHERE id = $2",
                balance, user_id
            )
    
    # Strategy operations
    async def get_strategies(self, user_id: int) -> List[Dict]:
        """Get user's strategies"""
        async with self.pool.acquire() as conn:
            results = await conn.fetch(
                "SELECT * FROM strategies WHERE user_id = $1 ORDER BY created_at DESC",
                user_id
            )
            return [dict(row) for row in results]
    
    async def create_strategy(self, strategy_data: Dict) -> Dict:
        """Create new strategy"""
        async with self.pool.acquire() as conn:
            result = await conn.fetchrow(
                """INSERT INTO strategies (user_id, name, is_active, risk_percentage, 
                   stop_loss, take_profit, bos_confirmation, fvg_trading, 
                   liquidity_sweeps, order_block_filter) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *""",
                strategy_data["user_id"],
                strategy_data["name"],
                strategy_data.get("is_active", False),
                strategy_data.get("risk_percentage", 2.0),
                strategy_data.get("stop_loss", 50),
                strategy_data.get("take_profit", 100),
                strategy_data.get("bos_confirmation", True),
                strategy_data.get("fvg_trading", True),
                strategy_data.get("liquidity_sweeps", False),
                strategy_data.get("order_block_filter", True)
            )
            return dict(result)
    
    # Trade operations
    async def get_active_trades(self, user_id: int) -> List[Dict]:
        """Get active trades for user"""
        async with self.pool.acquire() as conn:
            results = await conn.fetch(
                "SELECT * FROM trades WHERE user_id = $1 AND status = 'OPEN' ORDER BY entry_time DESC",
                user_id
            )
            return [dict(row) for row in results]
    
    async def get_all_trades(self, user_id: int) -> List[Dict]:
        """Get all trades for user"""
        async with self.pool.acquire() as conn:
            results = await conn.fetch(
                "SELECT * FROM trades WHERE user_id = $1 ORDER BY entry_time DESC",
                user_id
            )
            return [dict(row) for row in results]
    
    async def create_trade(self, trade_data: Dict) -> Dict:
        """Create new trade"""
        async with self.pool.acquire() as conn:
            result = await conn.fetchrow(
                """INSERT INTO trades (user_id, strategy_id, pair, type, size, 
                   entry_price, stop_loss, take_profit, smc_pattern, status) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *""",
                trade_data["user_id"],
                trade_data.get("strategy_id"),
                trade_data["pair"],
                trade_data["type"],
                trade_data["size"],
                trade_data["entry_price"],
                trade_data.get("stop_loss"),
                trade_data.get("take_profit"),
                trade_data.get("smc_pattern"),
                trade_data.get("status", "OPEN")
            )
            return dict(result)
    
    async def close_trade(self, trade_id: int, exit_price: float, pnl: float) -> Dict:
        """Close trade"""
        async with self.pool.acquire() as conn:
            result = await conn.fetchrow(
                """UPDATE trades SET exit_price = $1, pnl = $2, status = 'CLOSED', 
                   exit_time = NOW() WHERE id = $3 RETURNING *""",
                exit_price, pnl, trade_id
            )
            return dict(result) if result else None
    
    # SMC Signals operations
    async def get_smc_signals(self, limit: int = 50) -> List[Dict]:
        """Get recent SMC signals"""
        async with self.pool.acquire() as conn:
            results = await conn.fetch(
                "SELECT * FROM smc_signals ORDER BY created_at DESC LIMIT $1",
                limit
            )
            return [dict(row) for row in results]
    
    async def create_smc_signal(self, signal_data: Dict) -> Dict:
        """Create new SMC signal"""
        async with self.pool.acquire() as conn:
            result = await conn.fetchrow(
                """INSERT INTO smc_signals (pair, timeframe, pattern, direction, 
                   price, confidence, description) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *""",
                signal_data["pair"],
                signal_data["timeframe"],
                signal_data["pattern"],
                signal_data["direction"],
                signal_data["price"],
                signal_data["confidence"],
                signal_data.get("description")
            )
            return dict(result)
    
    # Market Data operations
    async def save_market_data(self, data: List[Dict]) -> None:
        """Save market data"""
        async with self.pool.acquire() as conn:
            await conn.executemany(
                """INSERT INTO market_data (pair, timeframe, timestamp, open, high, low, close, volume) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                   ON CONFLICT DO NOTHING""",
                [(d["pair"], d["timeframe"], d["timestamp"], d["open"], 
                  d["high"], d["low"], d["close"], d["volume"]) for d in data]
            )
    
    async def get_market_data(self, pair: str, timeframe: str, limit: int = 100) -> List[Dict]:
        """Get market data"""
        async with self.pool.acquire() as conn:
            results = await conn.fetch(
                """SELECT * FROM market_data WHERE pair = $1 AND timeframe = $2 
                   ORDER BY timestamp DESC LIMIT $3""",
                pair, timeframe, limit
            )
            return [dict(row) for row in results]
    
    # Backtest operations
    async def get_backtests(self, user_id: int) -> List[Dict]:
        """Get user's backtests"""
        async with self.pool.acquire() as conn:
            results = await conn.fetch(
                "SELECT * FROM backtests WHERE user_id = $1 ORDER BY created_at DESC",
                user_id
            )
            return [dict(row) for row in results]
    
    async def create_backtest(self, backtest_data: Dict) -> Dict:
        """Create new backtest"""
        async with self.pool.acquire() as conn:
            result = await conn.fetchrow(
                """INSERT INTO backtests (user_id, strategy_id, start_date, end_date, 
                   initial_balance, final_balance, total_trades, winning_trades, 
                   win_rate, profit_factor, max_drawdown, results) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *""",
                backtest_data["user_id"],
                backtest_data["strategy_id"],
                backtest_data["start_date"],
                backtest_data["end_date"],
                backtest_data["initial_balance"],
                backtest_data["final_balance"],
                backtest_data["total_trades"],
                backtest_data["winning_trades"],
                backtest_data["win_rate"],
                backtest_data["profit_factor"],
                backtest_data["max_drawdown"],
                json.dumps(backtest_data.get("results", {}))
            )
            return dict(result)