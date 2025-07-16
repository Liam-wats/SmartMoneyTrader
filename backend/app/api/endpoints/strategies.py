"""
Strategy API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.strategy import Strategy

router = APIRouter()

@router.get("/")
async def get_strategies(db: AsyncSession = Depends(get_db)):
    """Get all strategies for current user"""
    # For demo, get strategies for user_id = 1
    result = await db.execute(select(Strategy).where(Strategy.user_id == 1))
    strategies = result.scalars().all()
    return strategies