"""
Market data API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.services.market_data import market_data_service

router = APIRouter()

@router.get("/{pair}/price")
async def get_realtime_price(pair: str):
    """Get real-time price for a currency pair"""
    try:
        price = await market_data_service.get_realtime_price(pair)
        return {"price": price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{pair}/{timeframe}/{limit}")
async def get_historical_data(pair: str, timeframe: str, limit: int = 100):
    """Get historical OHLCV data"""
    try:
        data = await market_data_service.get_historical_data(pair, timeframe, limit)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))