"""
SMC Signals API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from app.core.database import get_db
from app.models.signal import SMCSignal
from app.services.smc_detection import smc_detection_service

router = APIRouter()

@router.get("/")
async def get_smc_signals(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Get recent SMC signals"""
    result = await db.execute(
        select(SMCSignal)
        .where(SMCSignal.is_active == True)
        .order_by(desc(SMCSignal.created_at))
        .limit(limit)
    )
    signals = result.scalars().all()
    return signals

@router.post("/analyze")
async def analyze_smc_patterns(pair: str = "EURUSD", timeframe: str = "1h"):
    """Analyze SMC patterns for a currency pair"""
    try:
        signals = await smc_detection_service.analyze_patterns(pair, timeframe)
        return signals
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))