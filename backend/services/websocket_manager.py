"""
WebSocket Manager for real-time communication
"""
import asyncio
import json
from typing import Set, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect

class WebSocketManager:
    """Manages WebSocket connections and messaging"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "welcome",
            "message": "Connected to SMC Trading Platform",
            "timestamp": asyncio.get_event_loop().time()
        }))
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        self.active_connections.discard(websocket)
        
        # Remove from all subscriptions
        for subscription_type, connections in self.subscriptions.items():
            connections.discard(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"❌ Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all connected clients"""
        if not self.active_connections:
            return
        
        message_str = json.dumps(message)
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                print(f"❌ Error broadcasting to connection: {e}")
                disconnected.add(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
    
    async def broadcast_to_subscription(self, subscription_type: str, message: Dict[str, Any]):
        """Broadcast a message to subscribers of a specific type"""
        if subscription_type not in self.subscriptions:
            return
        
        connections = self.subscriptions[subscription_type].copy()
        if not connections:
            return
        
        message_str = json.dumps(message)
        disconnected = set()
        
        for connection in connections:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                print(f"❌ Error broadcasting to subscription {subscription_type}: {e}")
                disconnected.add(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection)
    
    async def handle_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle incoming WebSocket messages"""
        try:
            message_type = message.get("type")
            
            if message_type == "subscribe":
                await self._handle_subscribe(websocket, message)
            elif message_type == "unsubscribe":
                await self._handle_unsubscribe(websocket, message)
            elif message_type == "ping":
                await self._handle_ping(websocket, message)
            elif message_type == "market_data_request":
                await self._handle_market_data_request(websocket, message)
            elif message_type == "smc_analysis_request":
                await self._handle_smc_analysis_request(websocket, message)
            else:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                }))
                
        except Exception as e:
            print(f"❌ Error handling WebSocket message: {e}")
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Error processing message: {str(e)}"
            }))
    
    async def _handle_subscribe(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle subscription requests"""
        subscription_type = message.get("subscription_type")
        
        if not subscription_type:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "subscription_type is required"
            }))
            return
        
        if subscription_type not in self.subscriptions:
            self.subscriptions[subscription_type] = set()
        
        self.subscriptions[subscription_type].add(websocket)
        
        await websocket.send_text(json.dumps({
            "type": "subscribed",
            "subscription_type": subscription_type,
            "message": f"Subscribed to {subscription_type}"
        }))
    
    async def _handle_unsubscribe(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle unsubscription requests"""
        subscription_type = message.get("subscription_type")
        
        if not subscription_type:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "subscription_type is required"
            }))
            return
        
        if subscription_type in self.subscriptions:
            self.subscriptions[subscription_type].discard(websocket)
        
        await websocket.send_text(json.dumps({
            "type": "unsubscribed",
            "subscription_type": subscription_type,
            "message": f"Unsubscribed from {subscription_type}"
        }))
    
    async def _handle_ping(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle ping messages"""
        await websocket.send_text(json.dumps({
            "type": "pong",
            "timestamp": asyncio.get_event_loop().time()
        }))
    
    async def _handle_market_data_request(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle market data requests"""
        pair = message.get("pair")
        
        if not pair:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "pair is required"
            }))
            return
        
        # In a real implementation, this would fetch actual market data
        # For now, send mock data
        await websocket.send_text(json.dumps({
            "type": "market_data",
            "pair": pair,
            "price": 1.0850,
            "timestamp": asyncio.get_event_loop().time()
        }))
    
    async def _handle_smc_analysis_request(self, websocket: WebSocket, message: Dict[str, Any]):
        """Handle SMC analysis requests"""
        pair = message.get("pair")
        timeframe = message.get("timeframe", "1h")
        
        if not pair:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "pair is required"
            }))
            return
        
        # In a real implementation, this would trigger actual SMC analysis
        # For now, send mock analysis
        await websocket.send_text(json.dumps({
            "type": "smc_analysis",
            "pair": pair,
            "timeframe": timeframe,
            "patterns": [
                {
                    "type": "FVG",
                    "direction": "BULLISH",
                    "confidence": 0.85,
                    "price": 1.0845
                }
            ],
            "timestamp": asyncio.get_event_loop().time()
        }))
    
    def get_connection_count(self) -> int:
        """Get the number of active connections"""
        return len(self.active_connections)
    
    def get_subscription_count(self, subscription_type: str) -> int:
        """Get the number of subscribers for a specific type"""
        return len(self.subscriptions.get(subscription_type, set()))
    
    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket manager statistics"""
        return {
            "active_connections": len(self.active_connections),
            "subscriptions": {
                sub_type: len(connections) 
                for sub_type, connections in self.subscriptions.items()
            }
        }