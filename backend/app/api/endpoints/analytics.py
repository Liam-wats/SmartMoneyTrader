"""
Analytics API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.core.database import get_db
from app.models.trade import Trade

router = APIRouter()

@router.get("/performance")
async def get_performance_analytics(db: AsyncSession = Depends(get_db)):
    """Get performance analytics for current user"""
    # Get trade statistics
    result = await db.execute(
        select(
            func.count(Trade.id).label("total_trades"),
            func.count(Trade.id).filter(Trade.pnl > 0).label("winning_trades"),
            func.count(Trade.id).filter(Trade.pnl < 0).label("losing_trades"),
            func.sum(Trade.pnl).label("total_pnl"),
            func.avg(Trade.pnl).label("avg_pnl")
        ).where(Trade.user_id == 1, Trade.status == "CLOSED")
    )
    
    stats = result.first()
    
    total_trades = stats.total_trades or 0
    winning_trades = stats.winning_trades or 0
    losing_trades = stats.losing_trades or 0
    total_pnl = float(stats.total_pnl or 0)
    avg_pnl = float(stats.avg_pnl or 0)
    
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    
    return {
        "totalTrades": total_trades,
        "winningTrades": winning_trades,
        "losingTrades": losing_trades,
        "winRate": win_rate,
        "totalPnL": total_pnl,
        "avgPnL": avg_pnl,
        "profitFactor": 0.0,  # TODO: Calculate properly
        "maxDrawdown": 0.0   # TODO: Calculate properly
    }