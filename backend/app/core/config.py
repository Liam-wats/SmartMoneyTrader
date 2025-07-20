"""
Application configuration settings
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = os.getenv("NODE_ENV", "development")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # External APIs
    TWELVE_DATA_API_KEY: str = os.getenv("TWELVE_DATA_API_KEY", "670c76c15401482e939dff52a32d6fe8")
    
    # WebSocket
    WS_CONNECTION_LIMIT: int = 100
    
    # Trading
    DEFAULT_BALANCE: float = 10000.0
    MAX_RISK_PER_TRADE: float = 0.02  # 2%
    
    # Market Data
    PRICE_UPDATE_INTERVAL: int = 2  # seconds
    CACHE_DURATION: int = 60  # seconds
    
    class Config:
        env_file = ".env"

settings = Settings()