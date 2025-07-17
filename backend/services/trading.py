"""
Trading Service for execution and management
"""
import asyncio
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Callable
import backtrader as bt

class TradingService:
    """Advanced trading service with backtesting capabilities"""
    
    def __init__(self, db_manager, market_data_service, smc_detection_service):
        self.db_manager = db_manager
        self.market_data_service = market_data_service
        self.smc_detection_service = smc_detection_service
        self.signal_callbacks = []
        
    async def execute_trade(self, trade_data: Dict) -> Dict:
        """Execute a new trade"""
        try:
            # Validate trade data
            if not self._validate_trade_data(trade_data):
                raise ValueError("Invalid trade data")
            
            # Check account balance and risk
            user_id = trade_data["user_id"]
            user = await self.db_manager.get_user(user_id)
            
            if not user:
                raise ValueError("User not found")
            
            # Calculate position size based on risk management
            position_size = self._calculate_position_size(
                user["account_balance"],
                trade_data.get("risk_percentage", 2.0),
                trade_data["entry_price"],
                trade_data.get("stop_loss", 0)
            )
            
            trade_data["size"] = position_size
            
            # Create trade record
            trade = await self.db_manager.create_trade(trade_data)
            
            # Notify subscribers
            await self._notify_signal_callbacks({
                "type": "trade_opened",
                "trade": trade,
                "timestamp": datetime.now().isoformat()
            })
            
            return trade
            
        except Exception as e:
            print(f"❌ Error executing trade: {e}")
            raise
    
    def _validate_trade_data(self, trade_data: Dict) -> bool:
        """Validate trade data"""
        required_fields = ["user_id", "pair", "type", "entry_price"]
        return all(field in trade_data for field in required_fields)
    
    def _calculate_position_size(self, balance: float, risk_percentage: float, 
                               entry_price: float, stop_loss: float) -> float:
        """Calculate position size based on risk management"""
        if stop_loss == 0:
            return balance * 0.01  # 1% of balance as default
        
        risk_amount = balance * (risk_percentage / 100)
        price_difference = abs(entry_price - stop_loss)
        
        if price_difference > 0:
            return risk_amount / price_difference
        
        return balance * 0.01
    
    async def close_trade(self, trade_id: int, exit_price: float) -> Optional[Dict]:
        """Close an existing trade"""
        try:
            trade = await self.db_manager.get_trade(trade_id)
            
            if not trade:
                return None
            
            # Calculate P&L
            pnl = self._calculate_pnl(trade, exit_price)
            
            # Update trade record
            closed_trade = await self.db_manager.close_trade(trade_id, exit_price, pnl)
            
            # Update user balance
            if closed_trade:
                user = await self.db_manager.get_user(trade["user_id"])
                new_balance = user["account_balance"] + pnl
                await self.db_manager.update_user_balance(trade["user_id"], new_balance)
            
            # Notify subscribers
            await self._notify_signal_callbacks({
                "type": "trade_closed",
                "trade": closed_trade,
                "pnl": pnl,
                "timestamp": datetime.now().isoformat()
            })
            
            return closed_trade
            
        except Exception as e:
            print(f"❌ Error closing trade: {e}")
            return None
    
    def _calculate_pnl(self, trade: Dict, exit_price: float) -> float:
        """Calculate profit/loss for a trade"""
        entry_price = trade["entry_price"]
        size = trade["size"]
        trade_type = trade["type"]
        
        if trade_type == "BUY":
            return (exit_price - entry_price) * size
        else:  # SELL
            return (entry_price - exit_price) * size
    
    async def get_performance_analytics(self, user_id: int) -> Dict:
        """Get performance analytics for a user"""
        try:
            trades = await self.db_manager.get_all_trades(user_id)
            
            if not trades:
                return self._empty_analytics()
            
            total_trades = len(trades)
            closed_trades = [t for t in trades if t.get("status") == "CLOSED" and t.get("pnl") is not None]
            
            if not closed_trades:
                return self._empty_analytics()
            
            winning_trades = [t for t in closed_trades if t["pnl"] > 0]
            losing_trades = [t for t in closed_trades if t["pnl"] < 0]
            
            win_rate = len(winning_trades) / len(closed_trades) * 100 if closed_trades else 0
            
            total_pnl = sum(t["pnl"] for t in closed_trades)
            
            gross_profit = sum(t["pnl"] for t in winning_trades) if winning_trades else 0
            gross_loss = abs(sum(t["pnl"] for t in losing_trades)) if losing_trades else 0
            
            profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
            
            # Calculate drawdown
            max_drawdown = self._calculate_max_drawdown(closed_trades)
            
            # Get current balance
            user = await self.db_manager.get_user(user_id)
            current_balance = user["account_balance"] if user else 0
            
            return {
                "total_trades": total_trades,
                "winning_trades": len(winning_trades),
                "losing_trades": len(losing_trades),
                "win_rate": win_rate,
                "profit_factor": profit_factor,
                "max_drawdown": max_drawdown,
                "total_pnl": total_pnl,
                "average_win": gross_profit / len(winning_trades) if winning_trades else 0,
                "average_loss": gross_loss / len(losing_trades) if losing_trades else 0,
                "sharpe_ratio": self._calculate_sharpe_ratio(closed_trades),
                "current_balance": current_balance
            }
            
        except Exception as e:
            print(f"❌ Error getting performance analytics: {e}")
            return self._empty_analytics()
    
    def _empty_analytics(self) -> Dict:
        """Return empty analytics"""
        return {
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "max_drawdown": 0.0,
            "total_pnl": 0.0,
            "average_win": 0.0,
            "average_loss": 0.0,
            "sharpe_ratio": 0.0,
            "current_balance": 10000.0
        }
    
    def _calculate_max_drawdown(self, trades: List[Dict]) -> float:
        """Calculate maximum drawdown from trades"""
        if not trades:
            return 0.0
        
        # Sort trades by exit time
        sorted_trades = sorted(trades, key=lambda x: x.get("exit_time", datetime.now()))
        
        running_balance = 10000.0  # Starting balance
        max_balance = running_balance
        max_drawdown = 0.0
        
        for trade in sorted_trades:
            running_balance += trade["pnl"]
            
            if running_balance > max_balance:
                max_balance = running_balance
            
            current_drawdown = (max_balance - running_balance) / max_balance * 100
            max_drawdown = max(max_drawdown, current_drawdown)
        
        return max_drawdown
    
    def _calculate_sharpe_ratio(self, trades: List[Dict]) -> float:
        """Calculate Sharpe ratio from trades"""
        if not trades:
            return 0.0
        
        returns = [t["pnl"] for t in trades]
        
        if len(returns) < 2:
            return 0.0
        
        avg_return = np.mean(returns)
        std_return = np.std(returns)
        
        if std_return == 0:
            return 0.0
        
        return avg_return / std_return
    
    async def run_backtest(self, backtest_data: Dict) -> Dict:
        """Run a backtest using Backtrader"""
        try:
            # Get strategy
            strategy = await self.db_manager.get_strategy(backtest_data["strategy_id"])
            if not strategy:
                raise ValueError("Strategy not found")
            
            # Get historical data
            pair = strategy.get("pair", "EURUSD")
            start_date = backtest_data["start_date"]
            end_date = backtest_data["end_date"]
            
            # For now, return a simplified backtest result
            # In production, this would use actual Backtrader implementation
            result = await self._run_simple_backtest(strategy, start_date, end_date, pair)
            
            # Save backtest result
            backtest_record = await self.db_manager.create_backtest({
                "user_id": backtest_data.get("user_id", 1),
                "strategy_id": backtest_data["strategy_id"],
                "start_date": start_date,
                "end_date": end_date,
                "initial_balance": backtest_data.get("initial_balance", 10000.0),
                "final_balance": result["final_balance"],
                "total_trades": result["total_trades"],
                "winning_trades": result["winning_trades"],
                "win_rate": result["win_rate"],
                "profit_factor": result["profit_factor"],
                "max_drawdown": result["max_drawdown"],
                "results": result
            })
            
            return result
            
        except Exception as e:
            print(f"❌ Error running backtest: {e}")
            raise
    
    async def _run_simple_backtest(self, strategy: Dict, start_date: datetime, 
                                 end_date: datetime, pair: str) -> Dict:
        """Run a simplified backtest"""
        # Get historical data
        historical_data = await self.market_data_service.get_historical_data(pair, "1h", 1000)
        
        if not historical_data:
            return self._empty_backtest_result()
        
        # Filter data by date range
        filtered_data = [
            d for d in historical_data 
            if start_date <= d["timestamp"] <= end_date
        ]
        
        if not filtered_data:
            return self._empty_backtest_result()
        
        # Simple trend-following backtest
        balance = 10000.0
        trades = []
        position = None
        
        for i, candle in enumerate(filtered_data[20:], 20):  # Skip first 20 for indicators
            
            # Simple moving average crossover strategy
            if i >= 20:
                short_ma = np.mean([d["close"] for d in filtered_data[i-10:i]])
                long_ma = np.mean([d["close"] for d in filtered_data[i-20:i]])
                
                current_price = candle["close"]
                
                # Entry signals
                if not position and short_ma > long_ma:
                    # Buy signal
                    position = {
                        "type": "BUY",
                        "entry_price": current_price,
                        "entry_time": candle["timestamp"],
                        "size": balance * 0.1 / current_price  # 10% of balance
                    }
                
                elif not position and short_ma < long_ma:
                    # Sell signal
                    position = {
                        "type": "SELL",
                        "entry_price": current_price,
                        "entry_time": candle["timestamp"],
                        "size": balance * 0.1 / current_price  # 10% of balance
                    }
                
                # Exit signals
                elif position:
                    exit_condition = False
                    
                    if position["type"] == "BUY" and short_ma < long_ma:
                        exit_condition = True
                    elif position["type"] == "SELL" and short_ma > long_ma:
                        exit_condition = True
                    
                    if exit_condition:
                        # Close position
                        if position["type"] == "BUY":
                            pnl = (current_price - position["entry_price"]) * position["size"]
                        else:
                            pnl = (position["entry_price"] - current_price) * position["size"]
                        
                        balance += pnl
                        
                        trades.append({
                            "entry_time": position["entry_time"],
                            "exit_time": candle["timestamp"],
                            "type": position["type"],
                            "entry_price": position["entry_price"],
                            "exit_price": current_price,
                            "pnl": pnl,
                            "size": position["size"]
                        })
                        
                        position = None
        
        # Calculate results
        if trades:
            winning_trades = [t for t in trades if t["pnl"] > 0]
            losing_trades = [t for t in trades if t["pnl"] < 0]
            
            win_rate = len(winning_trades) / len(trades) * 100
            
            gross_profit = sum(t["pnl"] for t in winning_trades)
            gross_loss = abs(sum(t["pnl"] for t in losing_trades))
            
            profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
            
            max_drawdown = self._calculate_max_drawdown(trades)
            
            return {
                "initial_balance": 10000.0,
                "final_balance": balance,
                "total_trades": len(trades),
                "winning_trades": len(winning_trades),
                "losing_trades": len(losing_trades),
                "win_rate": win_rate,
                "profit_factor": profit_factor,
                "max_drawdown": max_drawdown,
                "total_pnl": balance - 10000.0,
                "trades": trades,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        
        return self._empty_backtest_result()
    
    def _empty_backtest_result(self) -> Dict:
        """Return empty backtest result"""
        return {
            "initial_balance": 10000.0,
            "final_balance": 10000.0,
            "total_trades": 0,
            "winning_trades": 0,
            "losing_trades": 0,
            "win_rate": 0.0,
            "profit_factor": 0.0,
            "max_drawdown": 0.0,
            "total_pnl": 0.0,
            "trades": []
        }
    
    def on_signal(self, callback: Callable):
        """Register callback for trading signals"""
        self.signal_callbacks.append(callback)
    
    async def _notify_signal_callbacks(self, signal: Dict):
        """Notify all signal callbacks"""
        for callback in self.signal_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(signal)
                else:
                    callback(signal)
            except Exception as e:
                print(f"❌ Error in signal callback: {e}")