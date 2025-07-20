"""
Market Data Service for real-time and historical price data
"""
import asyncio
import aiohttp
import logging
from typing import Dict, List, Optional, Callable
from datetime import datetime, timezone
import json

from app.core.config import settings

logger = logging.getLogger(__name__)

class CandleData:
    def __init__(self, timestamp: int, open: float, high: float, low: float, close: float, volume: float):
        self.timestamp = timestamp
        self.open = open
        self.high = high
        self.low = low
        self.close = close
        self.volume = volume

class MarketDataService:
    def __init__(self):
        self.price_cache: Dict[str, Dict] = {}
        self.price_subscriptions: Dict[str, List[Callable]] = {}
        self.running = False
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def start_price_feeds(self):
        """Start real-time price feed services"""
        self.running = True
        try:
            self.session = aiohttp.ClientSession()
            logger.info("Market data service started")
        except Exception as e:
            logger.warning(f"Market data service startup issue: {e}")
            self.session = None
    
    async def stop_price_feeds(self):
        """Stop real-time price feed services"""
        self.running = False
        if self.session:
            await self.session.close()
        logger.info("Market data service stopped")
    
    async def get_realtime_price(self, pair: str) -> float:
        """Get real-time price for a currency pair"""
        # Check cache first (1 minute cache)
        cache_key = f"price_{pair}"
        if cache_key in self.price_cache:
            cache_data = self.price_cache[cache_key]
            if (datetime.now().timestamp() - cache_data['timestamp']) < settings.CACHE_DURATION:
                return cache_data['price']
        
        if self.session:
            try:
                # Twelve Data API call
                url = f"https://api.twelvedata.com/price"
                params = {
                    "symbol": pair,
                    "apikey": settings.TWELVE_DATA_API_KEY
                }
                
                async with self.session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        if 'price' in data:
                            price = float(data['price'])
                            # Cache the price
                            self.price_cache[cache_key] = {
                                'price': price,
                                'timestamp': datetime.now().timestamp()
                            }
                            return price
                            
            except Exception as e:
                logger.warning(f"Twelve Data API error for {pair}: {e}")
        
        # Fallback to mock data if API fails
        return self._get_mock_price(pair)
    
    async def get_historical_data(self, pair: str, timeframe: str, limit: int = 100) -> List[Dict]:
        """Get historical OHLCV data"""
        try:
            # Twelve Data API call
            url = f"https://api.twelvedata.com/time_series"
            params = {
                "symbol": pair,
                "interval": self._timeframe_to_interval(timeframe),
                "outputsize": limit,
                "apikey": settings.TWELVE_DATA_API_KEY
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if 'values' in data:
                        candles = []
                        for item in data['values']:
                            candles.append({
                                "timestamp": int(datetime.fromisoformat(item['datetime'].replace('Z', '+00:00')).timestamp() * 1000),
                                "open": float(item['open']),
                                "high": float(item['high']),
                                "low": float(item['low']),
                                "close": float(item['close']),
                                "volume": float(item['volume']) if item['volume'] else 0
                            })
                        return candles[::-1]  # Reverse to get chronological order
                        
        except Exception as e:
            logger.warning(f"Twelve Data historical API error for {pair}: {e}")
        
        # Fallback to mock data
        return self._get_mock_historical_data(pair, limit)
    
    def _timeframe_to_interval(self, timeframe: str) -> str:
        """Convert timeframe to Twelve Data interval format"""
        mapping = {
            "1m": "1min",
            "5m": "5min", 
            "15m": "15min",
            "30m": "30min",
            "1h": "1h",
            "4h": "4h",
            "1d": "1day"
        }
        return mapping.get(timeframe, "1h")
    
    def _get_mock_price(self, pair: str) -> float:
        """Generate mock price data for fallback"""
        import random
        base_prices = {
            "EURUSD": 1.0850,
            "GBPUSD": 1.2650,
            "USDJPY": 110.50,
            "AUDUSD": 0.7350
        }
        base_price = base_prices.get(pair, 1.0000)
        # Add small random variation
        variation = random.uniform(-0.005, 0.005)
        return base_price + (base_price * variation)
    
    def _get_mock_historical_data(self, pair: str, limit: int) -> List[Dict]:
        """Generate mock historical data for fallback"""
        import random
        from datetime import timedelta
        
        base_price = self._get_mock_price(pair)
        candles = []
        current_time = datetime.now()
        
        for i in range(limit):
            timestamp = int((current_time - timedelta(hours=limit-i)).timestamp() * 1000)
            
            # Generate realistic OHLCV data
            open_price = base_price + random.uniform(-0.01, 0.01)
            high_price = open_price + random.uniform(0, 0.02)
            low_price = open_price - random.uniform(0, 0.02)
            close_price = open_price + random.uniform(-0.015, 0.015)
            volume = random.uniform(1000, 5000)
            
            candles.append({
                "timestamp": timestamp,
                "open": round(open_price, 5),
                "high": round(high_price, 5),
                "low": round(low_price, 5),
                "close": round(close_price, 5),
                "volume": round(volume, 2)
            })
            
            base_price = close_price  # Next candle starts from previous close
        
        return candles

# Global service instance
market_data_service = MarketDataService()