"""
Backtest API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.backtest import Backtest

router = APIRouter()

@router.get("/")
async def get_backtests(db: AsyncSession = Depends(get_db)):
    """Get all backtests for current user"""
    result = await db.execute(select(Backtest).where(Backtest.user_id == 1))
    backtests = result.scalars().all()
    return backtests