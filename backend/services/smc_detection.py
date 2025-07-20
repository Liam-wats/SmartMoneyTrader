"""
SMC (Smart Money Concept) Detection Service
Advanced pattern recognition for institutional trading patterns
"""
import asyncio
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

@dataclass
class SMCPattern:
    """SMC Pattern data class"""
    type: str
    direction: str
    price: float
    confidence: float
    timeframe: str
    timestamp: datetime
    description: str
    additional_data: Dict = None

class SMCDetectionService:
    """Advanced SMC pattern detection service"""
    
    def __init__(self):
        self.patterns = []
        self.running = False
        self.market_data_service = None
        
    async def initialize(self, market_data_service=None):
        """Initialize the SMC detection service"""
        self.market_data_service = market_data_service
        
    async def start_pattern_detection(self):
        """Start background pattern detection"""
        self.running = True
        
        while self.running:
            try:
                # Analyze major pairs
                pairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"]
                timeframes = ["1h", "4h"]
                
                for pair in pairs:
                    for timeframe in timeframes:
                        if self.market_data_service:
                            historical_data = await self.market_data_service.get_historical_data(
                                pair, timeframe, 100
                            )
                            
                            if historical_data:
                                patterns = await self.detect_patterns(historical_data, pair, timeframe)
                                self.patterns.extend(patterns)
                
                # Keep only recent patterns (last 24 hours)
                cutoff_time = datetime.now() - timedelta(hours=24)
                self.patterns = [p for p in self.patterns if p.timestamp > cutoff_time]
                
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                print(f"❌ Error in pattern detection: {e}")
                await asyncio.sleep(60)
    
    async def detect_patterns(self, historical_data: List[Dict], pair: str, timeframe: str = "1h") -> List[SMCPattern]:
        """Detect SMC patterns in historical data"""
        if not historical_data or len(historical_data) < 20:
            return []
        
        # Convert to DataFrame for easier analysis
        df = pd.DataFrame(historical_data)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        
        patterns = []
        
        # Detect different SMC patterns
        patterns.extend(await self._detect_bos_patterns(df, pair, timeframe))
        patterns.extend(await self._detect_choch_patterns(df, pair, timeframe))
        patterns.extend(await self._detect_fvg_patterns(df, pair, timeframe))
        patterns.extend(await self._detect_order_blocks(df, pair, timeframe))
        patterns.extend(await self._detect_liquidity_sweeps(df, pair, timeframe))
        
        return patterns
    
    async def _detect_bos_patterns(self, df: pd.DataFrame, pair: str, timeframe: str) -> List[SMCPattern]:
        """Detect Break of Structure (BOS) patterns"""
        patterns = []
        
        if len(df) < 10:
            return patterns
        
        # Calculate swing highs and lows
        df['swing_high'] = df['high'].rolling(window=5, center=True).max() == df['high']
        df['swing_low'] = df['low'].rolling(window=5, center=True).min() == df['low']
        
        # Get significant swing points
        swing_highs = df[df['swing_high']].copy()
        swing_lows = df[df['swing_low']].copy()
        
        # Look for BOS patterns
        if len(swing_highs) >= 2:
            # Bullish BOS - break above previous swing high
            for i in range(1, len(swing_highs)):
                prev_high = swing_highs.iloc[i-1]
                curr_high = swing_highs.iloc[i]
                
                if curr_high['high'] > prev_high['high']:
                    # Check for strong momentum
                    momentum = self._calculate_momentum(df, curr_high.name)
                    
                    if momentum > 0.6:  # Strong bullish momentum
                        patterns.append(SMCPattern(
                            type="BOS",
                            direction="BULLISH",
                            price=curr_high['high'],
                            confidence=min(momentum, 0.95),
                            timeframe=timeframe,
                            timestamp=curr_high['timestamp'],
                            description=f"Bullish BOS at {curr_high['high']:.5f}",
                            additional_data={"momentum": momentum, "pair": pair}
                        ))
        
        if len(swing_lows) >= 2:
            # Bearish BOS - break below previous swing low
            for i in range(1, len(swing_lows)):
                prev_low = swing_lows.iloc[i-1]
                curr_low = swing_lows.iloc[i]
                
                if curr_low['low'] < prev_low['low']:
                    # Check for strong momentum
                    momentum = self._calculate_momentum(df, curr_low.name)
                    
                    if momentum < -0.6:  # Strong bearish momentum
                        patterns.append(SMCPattern(
                            type="BOS",
                            direction="BEARISH",
                            price=curr_low['low'],
                            confidence=min(abs(momentum), 0.95),
                            timeframe=timeframe,
                            timestamp=curr_low['timestamp'],
                            description=f"Bearish BOS at {curr_low['low']:.5f}",
                            additional_data={"momentum": momentum, "pair": pair}
                        ))
        
        return patterns
    
    async def _detect_choch_patterns(self, df: pd.DataFrame, pair: str, timeframe: str) -> List[SMCPattern]:
        """Detect Change of Character (CHoCH) patterns"""
        patterns = []
        
        if len(df) < 15:
            return patterns
        
        # Calculate trend using moving averages
        df['ma_20'] = df['close'].rolling(20).mean()
        df['ma_50'] = df['close'].rolling(50).mean()
        
        # Detect trend changes
        for i in range(50, len(df)):
            current_trend = 1 if df.iloc[i]['ma_20'] > df.iloc[i]['ma_50'] else -1
            prev_trend = 1 if df.iloc[i-10]['ma_20'] > df.iloc[i-10]['ma_50'] else -1
            
            if current_trend != prev_trend:
                # Trend change detected
                confidence = self._calculate_trend_change_confidence(df, i)
                
                if confidence > 0.7:
                    direction = "BULLISH" if current_trend == 1 else "BEARISH"
                    price = df.iloc[i]['close']
                    
                    patterns.append(SMCPattern(
                        type="CHoCH",
                        direction=direction,
                        price=price,
                        confidence=confidence,
                        timeframe=timeframe,
                        timestamp=df.iloc[i]['timestamp'],
                        description=f"CHoCH to {direction} at {price:.5f}",
                        additional_data={"trend_change": current_trend, "pair": pair}
                    ))
        
        return patterns
    
    async def _detect_fvg_patterns(self, df: pd.DataFrame, pair: str, timeframe: str) -> List[SMCPattern]:
        """Detect Fair Value Gap (FVG) patterns"""
        patterns = []
        
        if len(df) < 3:
            return patterns
        
        # Look for gaps between candles
        for i in range(2, len(df)):
            candle1 = df.iloc[i-2]
            candle2 = df.iloc[i-1]
            candle3 = df.iloc[i]
            
            # Bullish FVG - gap between candle1 high and candle3 low
            if candle2['low'] > candle1['high'] and candle3['low'] < candle2['high']:
                gap_size = candle2['low'] - candle1['high']
                
                if gap_size > 0:
                    gap_ratio = gap_size / candle1['high']
                    
                    if gap_ratio > 0.0005:  # Significant gap
                        confidence = min(gap_ratio * 1000, 0.9)
                        
                        patterns.append(SMCPattern(
                            type="FVG",
                            direction="BULLISH",
                            price=(candle1['high'] + candle2['low']) / 2,
                            confidence=confidence,
                            timeframe=timeframe,
                            timestamp=candle3['timestamp'],
                            description=f"Bullish FVG {candle1['high']:.5f} - {candle2['low']:.5f}",
                            additional_data={"gap_size": gap_size, "pair": pair}
                        ))
            
            # Bearish FVG - gap between candle1 low and candle3 high
            elif candle2['high'] < candle1['low'] and candle3['high'] > candle2['low']:
                gap_size = candle1['low'] - candle2['high']
                
                if gap_size > 0:
                    gap_ratio = gap_size / candle1['low']
                    
                    if gap_ratio > 0.0005:  # Significant gap
                        confidence = min(gap_ratio * 1000, 0.9)
                        
                        patterns.append(SMCPattern(
                            type="FVG",
                            direction="BEARISH",
                            price=(candle1['low'] + candle2['high']) / 2,
                            confidence=confidence,
                            timeframe=timeframe,
                            timestamp=candle3['timestamp'],
                            description=f"Bearish FVG {candle2['high']:.5f} - {candle1['low']:.5f}",
                            additional_data={"gap_size": gap_size, "pair": pair}
                        ))
        
        return patterns
    
    async def _detect_order_blocks(self, df: pd.DataFrame, pair: str, timeframe: str) -> List[SMCPattern]:
        """Detect Order Block (OB) patterns"""
        patterns = []
        
        if len(df) < 10:
            return patterns
        
        # Look for strong rejection candles
        for i in range(5, len(df)):
            candle = df.iloc[i]
            
            # Calculate rejection strength
            body_size = abs(candle['close'] - candle['open'])
            total_range = candle['high'] - candle['low']
            
            if total_range > 0:
                upper_wick = candle['high'] - max(candle['open'], candle['close'])
                lower_wick = min(candle['open'], candle['close']) - candle['low']
                
                # Bullish Order Block - strong rejection from support
                if lower_wick > body_size * 2 and lower_wick > total_range * 0.6:
                    # Check for subsequent bullish movement
                    future_move = self._check_future_movement(df, i, direction="up")
                    
                    if future_move > 0.3:
                        confidence = min(lower_wick / total_range, 0.9)
                        
                        patterns.append(SMCPattern(
                            type="OB",
                            direction="BULLISH",
                            price=candle['low'],
                            confidence=confidence,
                            timeframe=timeframe,
                            timestamp=candle['timestamp'],
                            description=f"Bullish OB at {candle['low']:.5f}",
                            additional_data={"rejection_strength": lower_wick/total_range, "pair": pair}
                        ))
                
                # Bearish Order Block - strong rejection from resistance
                elif upper_wick > body_size * 2 and upper_wick > total_range * 0.6:
                    # Check for subsequent bearish movement
                    future_move = self._check_future_movement(df, i, direction="down")
                    
                    if future_move > 0.3:
                        confidence = min(upper_wick / total_range, 0.9)
                        
                        patterns.append(SMCPattern(
                            type="OB",
                            direction="BEARISH",
                            price=candle['high'],
                            confidence=confidence,
                            timeframe=timeframe,
                            timestamp=candle['timestamp'],
                            description=f"Bearish OB at {candle['high']:.5f}",
                            additional_data={"rejection_strength": upper_wick/total_range, "pair": pair}
                        ))
        
        return patterns
    
    async def _detect_liquidity_sweeps(self, df: pd.DataFrame, pair: str, timeframe: str) -> List[SMCPattern]:
        """Detect Liquidity Sweep (LS) patterns"""
        patterns = []
        
        if len(df) < 20:
            return patterns
        
        # Find equal highs and lows
        df['equal_highs'] = df['high'].rolling(window=10, center=True).apply(
            lambda x: len(set(np.round(x, 4))) < len(x) * 0.7
        )
        df['equal_lows'] = df['low'].rolling(window=10, center=True).apply(
            lambda x: len(set(np.round(x, 4))) < len(x) * 0.7
        )
        
        # Look for liquidity sweeps
        for i in range(15, len(df)):
            candle = df.iloc[i]
            
            # Check for sweep of equal highs (bearish)
            if candle['high'] > df.iloc[i-10:i]['high'].max():
                # Check if it's followed by reversal
                reversal_strength = self._check_reversal_strength(df, i, direction="down")
                
                if reversal_strength > 0.5:
                    confidence = min(reversal_strength, 0.85)
                    
                    patterns.append(SMCPattern(
                        type="LS",
                        direction="BEARISH",
                        price=candle['high'],
                        confidence=confidence,
                        timeframe=timeframe,
                        timestamp=candle['timestamp'],
                        description=f"Bearish LS at {candle['high']:.5f}",
                        additional_data={"reversal_strength": reversal_strength, "pair": pair}
                    ))
            
            # Check for sweep of equal lows (bullish)
            elif candle['low'] < df.iloc[i-10:i]['low'].min():
                # Check if it's followed by reversal
                reversal_strength = self._check_reversal_strength(df, i, direction="up")
                
                if reversal_strength > 0.5:
                    confidence = min(reversal_strength, 0.85)
                    
                    patterns.append(SMCPattern(
                        type="LS",
                        direction="BULLISH",
                        price=candle['low'],
                        confidence=confidence,
                        timeframe=timeframe,
                        timestamp=candle['timestamp'],
                        description=f"Bullish LS at {candle['low']:.5f}",
                        additional_data={"reversal_strength": reversal_strength, "pair": pair}
                    ))
        
        return patterns
    
    def _calculate_momentum(self, df: pd.DataFrame, index: int) -> float:
        """Calculate momentum at a specific index"""
        if index < 10:
            return 0.0
        
        # Calculate price change over last 10 periods
        current_price = df.iloc[index]['close']
        prev_price = df.iloc[index-10]['close']
        
        price_change = (current_price - prev_price) / prev_price
        
        # Normalize to [-1, 1] range
        return max(-1, min(1, price_change * 100))
    
    def _calculate_trend_change_confidence(self, df: pd.DataFrame, index: int) -> float:
        """Calculate confidence of trend change"""
        if index < 20:
            return 0.0
        
        # Calculate various factors
        ma_separation = abs(df.iloc[index]['ma_20'] - df.iloc[index]['ma_50'])
        volume_factor = df.iloc[index]['volume'] / df.iloc[index-10:index]['volume'].mean()
        
        # Combine factors
        confidence = min(ma_separation * 1000 + volume_factor * 0.1, 1.0)
        
        return confidence
    
    def _check_future_movement(self, df: pd.DataFrame, index: int, direction: str) -> float:
        """Check future price movement strength"""
        if index >= len(df) - 5:
            return 0.0
        
        current_price = df.iloc[index]['close']
        future_prices = df.iloc[index+1:index+6]['close']
        
        if direction == "up":
            max_future = future_prices.max()
            movement = (max_future - current_price) / current_price
        else:
            min_future = future_prices.min()
            movement = (current_price - min_future) / current_price
        
        return max(0, movement * 100)
    
    def _check_reversal_strength(self, df: pd.DataFrame, index: int, direction: str) -> float:
        """Check strength of price reversal"""
        if index >= len(df) - 5:
            return 0.0
        
        current_price = df.iloc[index]['close']
        future_prices = df.iloc[index+1:index+6]
        
        if direction == "up":
            # Check for bullish reversal
            reversal_count = sum(1 for p in future_prices.iterrows() if p[1]['close'] > current_price)
        else:
            # Check for bearish reversal
            reversal_count = sum(1 for p in future_prices.iterrows() if p[1]['close'] < current_price)
        
        return reversal_count / len(future_prices)
    
    def get_recent_patterns(self, limit: int = 50) -> List[Dict]:
        """Get recent SMC patterns"""
        # Sort by timestamp (newest first)
        sorted_patterns = sorted(self.patterns, key=lambda x: x.timestamp, reverse=True)
        
        # Convert to dictionary format
        result = []
        for pattern in sorted_patterns[:limit]:
            result.append({
                "type": pattern.type,
                "direction": pattern.direction,
                "price": pattern.price,
                "confidence": pattern.confidence,
                "timeframe": pattern.timeframe,
                "timestamp": pattern.timestamp.isoformat(),
                "description": pattern.description,
                "pair": pattern.additional_data.get("pair", "") if pattern.additional_data else ""
            })
        
        return result
    
    def stop(self):
        """Stop the pattern detection service"""
        self.running = False