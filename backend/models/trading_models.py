"""
Pydantic models for trading platform
"""
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class SMCAnalysisRequest(BaseModel):
    pair: str = Field(..., description="Currency pair (e.g., EURUSD)")
    timeframe: str = Field(..., description="Timeframe (e.g., 1h, 4h, 1d)")
    limit: Optional[int] = Field(100, description="Number of candles to analyze")

class MLPredictionRequest(BaseModel):
    pair: str = Field(..., description="Currency pair")
    timeframe: str = Field(..., description="Timeframe")
    features: List[float] = Field(..., description="Feature vector for prediction")

class StrategyCreate(BaseModel):
    name: str = Field(..., description="Strategy name")
    is_active: bool = Field(default=False, description="Whether strategy is active")
    risk_percentage: float = Field(default=2.0, description="Risk percentage per trade")
    stop_loss: int = Field(default=50, description="Stop loss in pips")
    take_profit: int = Field(default=100, description="Take profit in pips")
    bos_confirmation: bool = Field(default=True, description="Use BOS confirmation")
    fvg_trading: bool = Field(default=True, description="Use FVG trading")
    liquidity_sweeps: bool = Field(default=False, description="Use liquidity sweeps")
    order_block_filter: bool = Field(default=True, description="Use order block filter")

class TradeCreate(BaseModel):
    strategy_id: int = Field(..., description="Strategy ID")
    pair: str = Field(..., description="Currency pair")
    type: str = Field(..., description="Trade type (BUY/SELL)")
    size: float = Field(..., description="Trade size")
    entry_price: float = Field(..., description="Entry price")
    stop_loss: Optional[float] = Field(None, description="Stop loss price")
    take_profit: Optional[float] = Field(None, description="Take profit price")
    smc_pattern: Optional[str] = Field(None, description="SMC pattern that triggered the trade")

class BacktestRequest(BaseModel):
    strategy_id: int = Field(..., description="Strategy ID to backtest")
    start_date: datetime = Field(..., description="Backtest start date")
    end_date: datetime = Field(..., description="Backtest end date")
    initial_balance: float = Field(default=10000.0, description="Initial account balance")

class SMCPattern(BaseModel):
    type: str = Field(..., description="Pattern type (BOS, FVG, OB, LS, CHoCH)")
    direction: str = Field(..., description="Direction (BULLISH/BEARISH)")
    price: float = Field(..., description="Pattern price level")
    confidence: float = Field(..., description="Pattern confidence (0-1)")
    timeframe: str = Field(..., description="Timeframe where pattern was detected")
    timestamp: datetime = Field(..., description="Pattern detection timestamp")
    description: Optional[str] = Field(None, description="Pattern description")

class MLPrediction(BaseModel):
    pattern_type: str = Field(..., description="Predicted pattern type")
    direction: str = Field(..., description="Predicted direction")
    confidence: float = Field(..., description="Prediction confidence (0-1)")
    probability: float = Field(..., description="Probability of pattern occurrence")
    features_used: List[str] = Field(..., description="Features used for prediction")
    model_name: str = Field(..., description="ML model used for prediction")
    timestamp: datetime = Field(..., description="Prediction timestamp")

class MarketDataPoint(BaseModel):
    timestamp: datetime = Field(..., description="Data timestamp")
    open: float = Field(..., description="Open price")
    high: float = Field(..., description="High price")
    low: float = Field(..., description="Low price")
    close: float = Field(..., description="Close price")
    volume: float = Field(..., description="Volume")

class TradingSignal(BaseModel):
    pair: str = Field(..., description="Currency pair")
    signal_type: str = Field(..., description="Signal type (BUY/SELL)")
    confidence: float = Field(..., description="Signal confidence (0-1)")
    entry_price: float = Field(..., description="Recommended entry price")
    stop_loss: float = Field(..., description="Recommended stop loss")
    take_profit: float = Field(..., description="Recommended take profit")
    risk_reward_ratio: float = Field(..., description="Risk/reward ratio")
    smc_patterns: List[SMCPattern] = Field(..., description="SMC patterns supporting the signal")
    ml_predictions: List[MLPrediction] = Field(..., description="ML predictions supporting the signal")
    timestamp: datetime = Field(..., description="Signal generation timestamp")

class PerformanceAnalytics(BaseModel):
    total_trades: int = Field(..., description="Total number of trades")
    winning_trades: int = Field(..., description="Number of winning trades")
    losing_trades: int = Field(..., description="Number of losing trades")
    win_rate: float = Field(..., description="Win rate percentage")
    profit_factor: float = Field(..., description="Profit factor")
    max_drawdown: float = Field(..., description="Maximum drawdown")
    total_pnl: float = Field(..., description="Total P&L")
    average_win: float = Field(..., description="Average winning trade")
    average_loss: float = Field(..., description="Average losing trade")
    sharpe_ratio: float = Field(..., description="Sharpe ratio")
    current_balance: float = Field(..., description="Current account balance")