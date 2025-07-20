"""
Market data model for OHLCV candle storage
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, BigInteger
from sqlalchemy.sql import func
from app.core.database import Base

class MarketData(Base):
    __tablename__ = "market_data"
    
    id = Column(Integer, primary_key=True, index=True)
    pair = Column(String, nullable=False, index=True)
    timeframe = Column(String, nullable=False, index=True)
    
    # OHLCV Data
    timestamp = Column(BigInteger, nullable=False, index=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    class Config:
        indexes = [
            ("pair", "timeframe", "timestamp"),
        ]