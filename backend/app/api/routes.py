"""
Main API router
"""
from fastapi import APIRouter

from .endpoints import (
    users,
    strategies, 
    trades,
    signals,
    market_data,
    backtests,
    analytics
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
api_router.include_router(trades.router, prefix="/trades", tags=["trades"])
api_router.include_router(signals.router, prefix="/smc-signals", tags=["signals"])
api_router.include_router(market_data.router, prefix="/market-data", tags=["market-data"])
api_router.include_router(backtests.router, prefix="/backtests", tags=["backtests"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])