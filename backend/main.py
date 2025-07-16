"""
FastAPI main application for SMC Trading Platform
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.api.routes import api_router
from app.core.config import settings
from app.core.database import init_db
from app.services.market_data import market_data_service
from app.services.websocket import websocket_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    logger.info("Starting SMC Trading Platform...")
    await init_db()
    
    # Start market data service
    asyncio.create_task(market_data_service.start_price_feeds())
    
    yield
    
    # Shutdown
    logger.info("Shutting down SMC Trading Platform...")
    await market_data_service.stop_price_feeds()

# Create FastAPI app
app = FastAPI(
    title="SMC Trading Platform",
    description="Smart Money Concept Algorithmic Trading Platform",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# WebSocket endpoint
app.mount("/ws", websocket_manager.get_router())

# Serve static files (React build)
if settings.ENVIRONMENT == "production":
    app.mount("/", StaticFiles(directory="client/dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=True if settings.ENVIRONMENT == "development" else False,
        log_level="info"
    )