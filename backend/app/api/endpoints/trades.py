"""
Trade API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.trade import Trade

router = APIRouter()

@router.get("/active")
async def get_active_trades(db: AsyncSession = Depends(get_db)):
    """Get active trades for current user"""
    result = await db.execute(
        select(Trade).where(
            Trade.user_id == 1,
            Trade.status == "OPEN"
        )
    )
    trades = result.scalars().all()
    return trades

@router.get("/")
async def get_all_trades(db: AsyncSession = Depends(get_db)):
    """Get all trades for current user"""
    result = await db.execute(select(Trade).where(Trade.user_id == 1))
    trades = result.scalars().all()
    return trades