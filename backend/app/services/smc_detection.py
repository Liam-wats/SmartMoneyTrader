"""
Smart Money Concept (SMC) Detection Service
"""
import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime
import numpy as np

from .market_data import market_data_service

logger = logging.getLogger(__name__)

class SMCPattern:
    def __init__(self, type: str, direction: str, price: float, confidence: float, **kwargs):
        self.type = type
        self.direction = direction
        self.price = price
        self.confidence = confidence
        self.data = kwargs

class SMCDetectionService:
    def __init__(self):
        self.patterns = {
            "BOS": self._detect_break_of_structure,
            "FVG": self._detect_fair_value_gaps,
            "OB": self._detect_order_blocks,
            "LS": self._detect_liquidity_sweeps,
            "CHoCH": self._detect_change_of_character
        }
    
    async def analyze_patterns(self, pair: str, timeframe: str) -> List[Dict]:
        """Analyze SMC patterns for a given pair and timeframe"""
        try:
            # Get historical data
            candles = await market_data_service.get_historical_data(pair, timeframe, 200)
            if not candles:
                return []
            
            detected_patterns = []
            
            # Run all pattern detection algorithms
            for pattern_type, detector in self.patterns.items():
                patterns = detector(candles)
                detected_patterns.extend(patterns)
            
            # Convert to API response format
            return [self._pattern_to_dict(p) for p in detected_patterns]
            
        except Exception as e:
            logger.error(f"SMC analysis error for {pair}: {e}")
            return []
    
    def _detect_fair_value_gaps(self, candles: List[Dict]) -> List[SMCPattern]:
        """Detect Fair Value Gaps (FVG)"""
        patterns = []
        
        for i in range(2, len(candles)):
            prev_candle = candles[i-2]
            current_candle = candles[i-1]
            next_candle = candles[i]
            
            # Bullish FVG: Gap between previous low and next high
            if (prev_candle['low'] > next_candle['high'] and 
                current_candle['close'] > current_candle['open']):
                
                gap_size = prev_candle['low'] - next_candle['high']
                if gap_size > 0.0010:  # Minimum gap size
                    confidence = min(gap_size * 1000, 1.0)  # Scale confidence
                    patterns.append(SMCPattern(
                        type="FVG",
                        direction="BULLISH",
                        price=(prev_candle['low'] + next_candle['high']) / 2,
                        confidence=confidence,
                        gap_size=gap_size,
                        timestamp=current_candle['timestamp']
                    ))
            
            # Bearish FVG: Gap between previous high and next low
            elif (prev_candle['high'] < next_candle['low'] and
                  current_candle['close'] < current_candle['open']):
                
                gap_size = next_candle['low'] - prev_candle['high']
                if gap_size > 0.0010:
                    confidence = min(gap_size * 1000, 1.0)
                    patterns.append(SMCPattern(
                        type="FVG",
                        direction="BEARISH",
                        price=(prev_candle['high'] + next_candle['low']) / 2,
                        confidence=confidence,
                        gap_size=gap_size,
                        timestamp=current_candle['timestamp']
                    ))
        
        return patterns[-5:]  # Return last 5 patterns
    
    def _detect_break_of_structure(self, candles: List[Dict]) -> List[SMCPattern]:
        """Detect Break of Structure (BOS)"""
        patterns = []
        
        # Simple BOS detection based on swing highs/lows
        swing_highs = []
        swing_lows = []
        
        for i in range(2, len(candles) - 2):
            candle = candles[i]
            
            # Swing high
            if (candle['high'] > candles[i-1]['high'] and candle['high'] > candles[i-2]['high'] and
                candle['high'] > candles[i+1]['high'] and candle['high'] > candles[i+2]['high']):
                swing_highs.append((i, candle['high'], candle['timestamp']))
            
            # Swing low
            if (candle['low'] < candles[i-1]['low'] and candle['low'] < candles[i-2]['low'] and
                candle['low'] < candles[i+1]['low'] and candle['low'] < candles[i+2]['low']):
                swing_lows.append((i, candle['low'], candle['timestamp']))
        
        # Check for BOS
        current_price = candles[-1]['close']
        
        if swing_highs:
            last_high = swing_highs[-1][1]
            if current_price > last_high:
                patterns.append(SMCPattern(
                    type="BOS",
                    direction="BULLISH",
                    price=last_high,
                    confidence=0.8,
                    broken_level=last_high,
                    timestamp=candles[-1]['timestamp']
                ))
        
        if swing_lows:
            last_low = swing_lows[-1][1]
            if current_price < last_low:
                patterns.append(SMCPattern(
                    type="BOS",
                    direction="BEARISH",
                    price=last_low,
                    confidence=0.8,
                    broken_level=last_low,
                    timestamp=candles[-1]['timestamp']
                ))
        
        return patterns
    
    def _detect_order_blocks(self, candles: List[Dict]) -> List[SMCPattern]:
        """Detect Order Blocks (OB)"""
        patterns = []
        
        for i in range(10, len(candles)):
            candle = candles[i]
            
            # Look for strong bullish candles
            if candle['close'] > candle['open']:
                body_size = candle['close'] - candle['open']
                wick_size = candle['high'] - candle['close']
                
                if body_size > wick_size * 2:  # Strong bullish candle
                    # Check if price returned to this level
                    ob_level = candle['open']
                    found_return = False
                    
                    for j in range(i+1, min(i+20, len(candles))):
                        if candles[j]['low'] <= ob_level <= candles[j]['high']:
                            found_return = True
                            break
                    
                    if found_return:
                        patterns.append(SMCPattern(
                            type="OB",
                            direction="BULLISH",
                            price=ob_level,
                            confidence=0.7,
                            candle_index=i,
                            timestamp=candle['timestamp']
                        ))
        
        return patterns[-3:]  # Return last 3 patterns
    
    def _detect_liquidity_sweeps(self, candles: List[Dict]) -> List[SMCPattern]:
        """Detect Liquidity Sweeps (LS)"""
        patterns = []
        
        # Detect equal highs/lows that get swept
        for i in range(20, len(candles)):
            current_high = candles[i]['high']
            current_low = candles[i]['low']
            
            # Look for equal highs in previous candles
            equal_highs = []
            for j in range(i-20, i):
                if abs(candles[j]['high'] - current_high) < 0.0005:
                    equal_highs.append(j)
            
            if len(equal_highs) >= 2:
                # Check if current candle sweeps above and reverses
                if (candles[i]['high'] > current_high and 
                    candles[i]['close'] < candles[i]['open']):
                    patterns.append(SMCPattern(
                        type="LS",
                        direction="BEARISH",
                        price=current_high,
                        confidence=0.75,
                        swept_level=current_high,
                        timestamp=candles[i]['timestamp']
                    ))
        
        return patterns[-2:]  # Return last 2 patterns
    
    def _detect_change_of_character(self, candles: List[Dict]) -> List[SMCPattern]:
        """Detect Change of Character (CHoCH)"""
        patterns = []
        
        # Simple CHoCH based on trend change
        if len(candles) < 50:
            return patterns
        
        # Calculate simple moving averages
        short_ma = np.mean([c['close'] for c in candles[-10:]])
        long_ma = np.mean([c['close'] for c in candles[-30:]])
        prev_short_ma = np.mean([c['close'] for c in candles[-20:-10]])
        prev_long_ma = np.mean([c['close'] for c in candles[-50:-20]])
        
        # Detect trend change
        if prev_short_ma < prev_long_ma and short_ma > long_ma:
            patterns.append(SMCPattern(
                type="CHoCH",
                direction="BULLISH",
                price=candles[-1]['close'],
                confidence=0.6,
                change_type="bearish_to_bullish",
                timestamp=candles[-1]['timestamp']
            ))
        elif prev_short_ma > prev_long_ma and short_ma < long_ma:
            patterns.append(SMCPattern(
                type="CHoCH",
                direction="BEARISH",
                price=candles[-1]['close'],
                confidence=0.6,
                change_type="bullish_to_bearish",
                timestamp=candles[-1]['timestamp']
            ))
        
        return patterns
    
    def _pattern_to_dict(self, pattern: SMCPattern) -> Dict:
        """Convert SMCPattern to dictionary for API response"""
        return {
            "type": pattern.type,
            "direction": pattern.direction,
            "price": round(pattern.price, 5),
            "confidence": round(pattern.confidence, 2),
            "timestamp": pattern.data.get('timestamp', int(datetime.now().timestamp() * 1000)),
            **{k: v for k, v in pattern.data.items() if k != 'timestamp'}
        }

# Global service instance
smc_detection_service = SMCDetectionService()