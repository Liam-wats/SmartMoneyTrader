"""
Strategy model for trading configurations
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Strategy(Base):
    __tablename__ = "strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    pair = Column(String, nullable=False)
    timeframe = Column(String, nullable=False)
    
    # Risk Management
    risk_per_trade = Column(Float, default=0.02)  # 2%
    max_daily_loss = Column(Float, default=0.05)  # 5%
    max_drawdown = Column(Float, default=0.10)    # 10%
    
    # SMC Parameters
    use_break_of_structure = Column(Boolean, default=True)
    use_fair_value_gaps = Column(Boolean, default=True)
    use_order_blocks = Column(Boolean, default=True)
    use_liquidity_sweeps = Column(Boolean, default=True)
    
    # Additional settings stored as JSON
    settings = Column(JSON, default={})
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="strategies")
    trades = relationship("Trade", back_populates="strategy")
    backtests = relationship("Backtest", back_populates="strategy")