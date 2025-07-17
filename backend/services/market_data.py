"""
Market Data Service for real-time and historical data
"""
import asyncio
import aiohttp
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Callable
import os
import json

class MarketDataService:
    """Real-time and historical market data service"""
    
    def __init__(self):
        self.api_key = os.getenv("TWELVE_DATA_API_KEY", "670c76c15401482e939dff52a32d6fe8")
        self.base_url = "https://api.twelvedata.com"
        self.price_callbacks = {}
        self.price_cache = {}
        self.running = False
        self.session = None
        
    async def initialize(self):
        """Initialize the market data service"""
        self.session = aiohttp.ClientSession()
        
    async def close(self):
        """Close the service"""
        if self.session:
            await self.session.close()
            
    async def start_price_updates(self):
        """Start background price updates"""
        self.running = True
        while self.running:
            try:
                # Update prices for subscribed pairs
                for pair in self.price_callbacks.keys():
                    await self._update_price(pair)
                
                await asyncio.sleep(1)  # Update every second
                
            except Exception as e:
                print(f"❌ Error updating prices: {e}")
                await asyncio.sleep(5)
    
    async def stop(self):
        """Stop the service"""
        self.running = False
        if self.session:
            await self.session.close()
    
    async def get_realtime_price(self, pair: str) -> float:
        """Get real-time price for a currency pair"""
        try:
            if not self.session:
                await self.initialize()
            
            # Check cache first
            if pair in self.price_cache:
                cache_time = self.price_cache[pair]["timestamp"]
                if datetime.now() - cache_time < timedelta(seconds=30):
                    return self.price_cache[pair]["price"]
            
            # Make API request
            url = f"{self.base_url}/price"
            params = {
                "symbol": pair,
                "apikey": self.api_key
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if "price" in data:
                        price = float(data["price"])
                        
                        # Cache the price
                        self.price_cache[pair] = {
                            "price": price,
                            "timestamp": datetime.now()
                        }
                        
                        return price
                        
        except Exception as e:
            print(f"❌ Error getting realtime price for {pair}: {e}")
        
        # Return mock price if API fails
        return self._get_mock_price(pair)
    
    async def get_historical_data(self, pair: str, timeframe: str, limit: int = 100) -> List[Dict]:
        """Get historical market data"""
        try:
            if not self.session:
                await self.initialize()
            
            # Convert timeframe to twelvedata format
            interval = self._timeframe_to_interval(timeframe)
            
            url = f"{self.base_url}/time_series"
            params = {
                "symbol": pair,
                "interval": interval,
                "outputsize": limit,
                "apikey": self.api_key
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    if "values" in data:
                        candles = []
                        for item in data["values"]:
                            candles.append({
                                "timestamp": datetime.fromisoformat(item["datetime"]),
                                "open": float(item["open"]),
                                "high": float(item["high"]),
                                "low": float(item["low"]),
                                "close": float(item["close"]),
                                "volume": float(item.get("volume", 0))
                            })
                        return candles
                        
        except Exception as e:
            print(f"❌ Error getting historical data for {pair}: {e}")
        
        # Return mock data if API fails
        return self._get_mock_historical_data(pair, limit)
    
    def _timeframe_to_interval(self, timeframe: str) -> str:
        """Convert timeframe to twelvedata interval"""
        mapping = {
            "1m": "1min",
            "5m": "5min",
            "15m": "15min",
            "30m": "30min",
            "1h": "1h",
            "4h": "4h",
            "1d": "1day",
            "1w": "1week",
            "1M": "1month"
        }
        return mapping.get(timeframe, "1h")
    
    def _get_mock_price(self, pair: str) -> float:
        """Generate mock price for testing"""
        base_prices = {
            "EURUSD": 1.0850,
            "GBPUSD": 1.2650,
            "USDJPY": 148.50,
            "AUDUSD": 0.6750,
            "USDCAD": 1.3450,
            "USDCHF": 0.8750,
            "NZDUSD": 0.6150,
            "EURJPY": 161.25,
            "GBPJPY": 187.80,
            "EURGBP": 0.8580
        }
        
        base_price = base_prices.get(pair, 1.0000)
        
        # Add some random variation
        variation = np.random.uniform(-0.001, 0.001)
        return base_price + variation
    
    def _get_mock_historical_data(self, pair: str, limit: int) -> List[Dict]:
        """Generate mock historical data for testing"""
        base_price = self._get_mock_price(pair)
        candles = []
        
        current_time = datetime.now()
        
        for i in range(limit):
            timestamp = current_time - timedelta(hours=i)
            
            # Generate realistic OHLCV data
            price_change = np.random.uniform(-0.005, 0.005)
            open_price = base_price + np.random.uniform(-0.002, 0.002)
            
            high_price = open_price + abs(np.random.uniform(0, 0.003))
            low_price = open_price - abs(np.random.uniform(0, 0.003))
            close_price = open_price + price_change
            
            # Ensure high/low are correct
            high_price = max(high_price, open_price, close_price)
            low_price = min(low_price, open_price, close_price)
            
            volume = np.random.uniform(1000, 10000)
            
            candles.append({
                "timestamp": timestamp,
                "open": round(open_price, 5),
                "high": round(high_price, 5),
                "low": round(low_price, 5),
                "close": round(close_price, 5),
                "volume": round(volume, 2)
            })
            
            base_price = close_price
        
        return list(reversed(candles))  # Return oldest first
    
    async def _update_price(self, pair: str):
        """Update price for a specific pair"""
        try:
            price = await self.get_realtime_price(pair)
            
            # Notify subscribers
            if pair in self.price_callbacks:
                for callback in self.price_callbacks[pair]:
                    try:
                        await callback(pair, price)
                    except Exception as e:
                        print(f"❌ Error in price callback for {pair}: {e}")
                        
        except Exception as e:
            print(f"❌ Error updating price for {pair}: {e}")
    
    def subscribe_to_price(self, pair: str, callback: Callable):
        """Subscribe to real-time price updates"""
        if pair not in self.price_callbacks:
            self.price_callbacks[pair] = []
        
        self.price_callbacks[pair].append(callback)
    
    def unsubscribe_from_price(self, pair: str, callback: Callable = None):
        """Unsubscribe from price updates"""
        if pair in self.price_callbacks:
            if callback:
                if callback in self.price_callbacks[pair]:
                    self.price_callbacks[pair].remove(callback)
            else:
                # Remove all callbacks for this pair
                self.price_callbacks[pair] = []
    
    def get_market_status(self) -> Dict:
        """Get current market status"""
        # Simple market hours logic (can be expanded)
        current_time = datetime.now()
        current_hour = current_time.hour
        
        # Basic forex market hours (24/5)
        is_open = current_time.weekday() < 5  # Monday-Friday
        
        if current_time.weekday() == 6:  # Sunday
            is_open = current_hour >= 17  # Opens at 5 PM UTC Sunday
        elif current_time.weekday() == 4:  # Friday
            is_open = current_hour < 22  # Closes at 10 PM UTC Friday
        
        current_session = None
        if is_open:
            if 22 <= current_hour or current_hour < 8:
                current_session = "Sydney/Tokyo"
            elif 8 <= current_hour < 15:
                current_session = "London"
            elif 15 <= current_hour < 22:
                current_session = "New York"
        
        return {
            "isOpen": is_open,
            "currentSession": current_session,
            "timestamp": current_time.isoformat()
        }