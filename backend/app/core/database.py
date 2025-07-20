"""
Database configuration and connection
"""
import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData

from .config import settings

logger = logging.getLogger(__name__)

# Database engine
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    # Remove sslmode parameter that causes issues with asyncpg
    if "?sslmode=" in database_url:
        database_url = database_url.split("?sslmode=")[0]

engine = create_async_engine(
    database_url,
    echo=True if settings.ENVIRONMENT == "development" else False,
    pool_size=10,
    max_overflow=0
)

# Session factory
async_session = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()

async def get_db():
    """Database dependency"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    """Initialize database tables"""
    try:
        # Import models to register them
        from app.models import user, strategy, trade, signal, market_data, backtest
        
        # Create tables if they don't exist (for demo - in production use migrations)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Database initialization skipped: {e}")
        # Continue without database for demo purposes