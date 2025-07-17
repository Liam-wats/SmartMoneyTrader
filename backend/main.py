"""
FastAPI Backend for SMC Algorithmic Trading Platform
"""
import os
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import uvicorn

from services.database import DatabaseManager
from services.market_data import MarketDataService
from services.smc_detection import SMCDetectionService
from services.ml_pattern_recognition import MLPatternRecognitionService
from services.trading import TradingService
from services.websocket_manager import WebSocketManager
from models.trading_models import *

# Global services
db_manager = None
market_data_service = None
smc_detection_service = None
ml_service = None
trading_service = None
websocket_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    global db_manager, market_data_service, smc_detection_service, ml_service, trading_service, websocket_manager
    
    # Initialize database
    db_manager = DatabaseManager()
    await db_manager.initialize()
    
    # Initialize services
    market_data_service = MarketDataService()
    smc_detection_service = SMCDetectionService()
    ml_service = MLPatternRecognitionService()
    trading_service = TradingService(db_manager, market_data_service, smc_detection_service)
    websocket_manager = WebSocketManager()
    
    # Initialize ML models
    await ml_service.initialize_models()
    
    # Start background tasks
    asyncio.create_task(market_data_service.start_price_updates())
    asyncio.create_task(smc_detection_service.start_pattern_detection())
    
    print("✅ SMC Trading Platform backend started successfully")
    yield
    
    # Cleanup on shutdown
    await market_data_service.stop()
    await db_manager.close()

# Create FastAPI app
app = FastAPI(
    title="SMC Algorithmic Trading Platform",
    description="Professional-grade trading platform with institutional-level SMC analysis",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            await websocket_manager.handle_message(websocket, message)
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# User endpoints
@app.get("/api/user")
async def get_current_user():
    """Get current user information"""
    try:
        user = await db_manager.get_user(1)  # Demo user
        if not user:
            # Create demo user if doesn't exist
            user = await db_manager.create_user({
                "username": "demo_user",
                "password": "demo_password",
                "account_balance": 10000.0
            })
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")

# Market data endpoints
@app.get("/api/market-data/{pair}/price")
async def get_current_price(pair: str):
    """Get current price for a currency pair"""
    try:
        price = await market_data_service.get_realtime_price(pair)
        return {"price": price, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get price: {str(e)}")

@app.get("/api/market-data/{pair}/{timeframe}/{limit}")
async def get_historical_data(pair: str, timeframe: str, limit: int = 100):
    """Get historical market data"""
    try:
        data = await market_data_service.get_historical_data(pair, timeframe, limit)
        return {"data": data, "pair": pair, "timeframe": timeframe}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get historical data: {str(e)}")

# SMC Analysis endpoints
@app.get("/api/smc-signals")
async def get_smc_signals():
    """Get recent SMC signals"""
    try:
        # Get recent patterns from SMC detection service
        if smc_detection_service:
            patterns = smc_detection_service.get_recent_patterns(50)
            return patterns
        else:
            # Fallback mock data while service initializes
            return [
                {
                    "type": "FVG",
                    "direction": "BULLISH",
                    "price": 1.0845,
                    "confidence": 0.85,
                    "timeframe": "1h",
                    "timestamp": datetime.now().isoformat(),
                    "description": "Fair Value Gap identified",
                    "pair": "EURUSD"
                },
                {
                    "type": "BOS",
                    "direction": "BEARISH",
                    "price": 1.0820,
                    "confidence": 0.78,
                    "timeframe": "1h",
                    "timestamp": datetime.now().isoformat(),
                    "description": "Break of Structure detected",
                    "pair": "EURUSD"
                },
                {
                    "type": "OB",
                    "direction": "BULLISH",
                    "price": 1.0825,
                    "confidence": 0.72,
                    "timeframe": "1h",
                    "timestamp": datetime.now().isoformat(),
                    "description": "Order Block formed",
                    "pair": "EURUSD"
                }
            ]
    except Exception as e:
        print(f"❌ Error getting SMC signals: {e}")
        return []

@app.post("/api/smc-analysis")
async def run_smc_analysis(request: SMCAnalysisRequest):
    """Run SMC analysis on a currency pair"""
    try:
        # Get historical data
        historical_data = await market_data_service.get_historical_data(
            request.pair, request.timeframe, request.limit or 100
        )
        
        # Run SMC detection
        patterns = await smc_detection_service.detect_patterns(historical_data, request.pair)
        
        # Get ML predictions
        ml_predictions = await ml_service.get_pattern_predictions(historical_data, request.pair)
        
        # Combine results
        analysis_result = {
            "pair": request.pair,
            "timeframe": request.timeframe,
            "patterns": patterns,
            "ml_predictions": ml_predictions,
            "timestamp": datetime.now().isoformat()
        }
        
        return analysis_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

# ML Pattern Recognition endpoints
@app.post("/api/ml/train")
async def train_ml_models(background_tasks: BackgroundTasks):
    """Train ML models with latest data"""
    try:
        background_tasks.add_task(ml_service.train_models)
        return {"message": "ML model training started", "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.get("/api/ml/model-status")
async def get_model_status():
    """Get ML model training status"""
    try:
        status = await ml_service.get_model_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")

@app.post("/api/ml/predict")
async def get_ml_predictions(request: MLPredictionRequest):
    """Get ML predictions for a currency pair"""
    try:
        predictions = await ml_service.predict_patterns(
            request.pair, request.timeframe, request.features
        )
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# Trading endpoints
@app.get("/api/strategies")
async def get_strategies():
    """Get user's trading strategies"""
    try:
        strategies = await db_manager.get_strategies(1)  # Demo user
        return strategies
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get strategies: {str(e)}")

@app.post("/api/strategies")
async def create_strategy(strategy: StrategyCreate):
    """Create a new trading strategy"""
    try:
        new_strategy = await db_manager.create_strategy({
            **strategy.dict(),
            "user_id": 1  # Demo user
        })
        return new_strategy
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create strategy: {str(e)}")

@app.get("/api/trades/active")
async def get_active_trades():
    """Get active trades"""
    try:
        trades = await db_manager.get_active_trades(1)  # Demo user
        return trades
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active trades: {str(e)}")

@app.post("/api/trades")
async def create_trade(trade: TradeCreate):
    """Create a new trade"""
    try:
        new_trade = await trading_service.execute_trade({
            **trade.dict(),
            "user_id": 1  # Demo user
        })
        return new_trade
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create trade: {str(e)}")

# Analytics endpoints
@app.get("/api/analytics/performance")
async def get_performance_analytics():
    """Get performance analytics"""
    try:
        analytics = await trading_service.get_performance_analytics(1)  # Demo user
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {str(e)}")

@app.get("/api/backtests")
async def get_backtests():
    """Get backtest results"""
    try:
        backtests = await db_manager.get_backtests(1)  # Demo user
        return backtests
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get backtests: {str(e)}")

@app.post("/api/backtests")
async def run_backtest(backtest_request: BacktestRequest):
    """Run a backtest"""
    try:
        result = await trading_service.run_backtest(backtest_request.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

# Serve static files and frontend
@app.get("/")
async def serve_frontend():
    """Serve the frontend HTML"""
    return HTMLResponse(content=open("frontend/index.html").read())

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )