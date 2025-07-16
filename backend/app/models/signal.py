"""
SMC Signal model for pattern detection results
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class SMCSignal(Base):
    __tablename__ = "smc_signals"
    
    id = Column(Integer, primary_key=True, index=True)
    pair = Column(String, nullable=False)
    timeframe = Column(String, nullable=False)
    
    # Pattern Information
    type = Column(String, nullable=False)  # BOS, FVG, OB, LS, CHoCH
    direction = Column(String, nullable=False)  # BULLISH, BEARISH
    price = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    
    # Pattern-specific data
    pattern_data = Column(JSON, default={})
    
    # Market context
    higher_timeframe_bias = Column(String, nullable=True)  # BULLISH, BEARISH, NEUTRAL
    confluence_count = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())