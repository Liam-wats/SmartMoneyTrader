#!/usr/bin/env python3
"""
Unified Python Server - FastAPI backend with Streamlit-style frontend
Serves both API and web interface on port 5000
"""
import asyncio
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import json
import os
import sys
import time
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

try:
    from app.api.routes import api_router
    from app.core.database import init_db
    from app.services.market_data import market_data_service
except ImportError as e:
    print(f"Error importing backend modules: {e}")
    print("Creating mock API endpoints...")
    
    # Create minimal mock API router
    from fastapi import APIRouter
    api_router = APIRouter()
    
    @api_router.get("/market-data/{pair}/price")
    async def get_price(pair: str):
        return {"price": 1.08500 + (hash(pair) % 1000) / 100000}
    
    @api_router.get("/market-data/{pair}/{timeframe}/{limit}")
    async def get_historical_data(pair: str, timeframe: str, limit: int):
        import random
        data = []
        base_price = 1.08500
        for i in range(limit):
            price = base_price + random.uniform(-0.001, 0.001)
            data.append({
                "timestamp": int(time.time() * 1000) - (i * 3600000),
                "open": price,
                "high": price + random.uniform(0, 0.0005),
                "low": price - random.uniform(0, 0.0005),
                "close": price + random.uniform(-0.0002, 0.0002),
                "volume": random.randint(1000, 10000)
            })
        return data[::-1]
    
    @api_router.get("/smc-signals")
    async def get_smc_signals():
        return [
            {
                "id": 1,
                "type": "BOS",
                "direction": "BULLISH",
                "pair": "EURUSD",
                "price": 1.08523,
                "confidence": 0.85,
                "pattern": "Break of Structure",
                "description": "Strong bullish break of structure detected"
            }
        ]
    
    @api_router.get("/analytics/performance")
    async def get_performance():
        return {
            "totalTrades": 0,
            "winRate": 0.0,
            "totalPnL": 0.0
        }
    
    @api_router.get("/trades/active")
    async def get_active_trades():
        return []
    
    @api_router.post("/smc-analysis")
    async def perform_smc_analysis(data: dict):
        return [
            {
                "type": "FVG",
                "direction": "BULLISH",
                "confidence": 0.72,
                "description": "Fair Value Gap detected in bullish trend"
            }
        ]
    
    # Mock initialization functions
    async def init_db():
        print("Mock database initialization")
    
    class MockMarketDataService:
        async def start_price_feeds(self):
            print("Mock market data service started")
        async def stop_price_feeds(self):
            print("Mock market data service stopped")
    
    market_data_service = MockMarketDataService()

app = FastAPI(title="SMC Trading Platform", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Templates
templates = Jinja2Templates(directory="frontend/templates") if os.path.exists("frontend/templates") else None

# Simple startup for now - remove complex async logic

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main trading dashboard"""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SMC Trading Platform</title>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { 
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
                color: white; 
                font-family: 'Inter', sans-serif;
            }
            .gradient-text {
                background: linear-gradient(45deg, #00ff88, #00d4ff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .card {
                background: rgba(30, 41, 59, 0.8);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 12px;
                padding: 1.5rem;
                margin: 1rem 0;
            }
            .metric-card {
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
                border: 1px solid rgba(59, 130, 246, 0.3);
            }
            .signal-card {
                background: rgba(15, 23, 42, 0.6);
                border-left: 4px solid;
                margin: 0.5rem 0;
                padding: 1rem;
                border-radius: 0 8px 8px 0;
            }
            .bullish { border-left-color: #00ff88; }
            .bearish { border-left-color: #ff4444; }
            .btn {
                background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                border: none;
                color: white;
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
            }
        </style>
    </head>
    <body>
        <div class="container mx-auto px-4 py-8">
            <!-- Header -->
            <div class="text-center mb-8">
                <h1 class="text-5xl font-bold gradient-text mb-4">🏛️ SMC Trading Platform</h1>
                <p class="text-slate-400 text-lg">Smart Money Concept Analysis & Algorithmic Trading</p>
            </div>

            <!-- Controls -->
            <div class="card">
                <div class="flex flex-wrap gap-4 items-center justify-between">
                    <div class="flex gap-4">
                        <select id="pairSelect" class="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600">
                            <option value="EURUSD">EUR/USD</option>
                            <option value="GBPUSD">GBP/USD</option>
                            <option value="USDJPY">USD/JPY</option>
                            <option value="AUDUSD">AUD/USD</option>
                        </select>
                        <select id="timeframeSelect" class="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600">
                            <option value="1m">1 Minute</option>
                            <option value="5m">5 Minutes</option>
                            <option value="15m">15 Minutes</option>
                            <option value="1h" selected>1 Hour</option>
                            <option value="4h">4 Hours</option>
                            <option value="1d">1 Day</option>
                        </select>
                    </div>
                    <div class="flex gap-4">
                        <button onclick="performAnalysis()" class="btn">🔍 Analyze Market</button>
                        <button onclick="refreshData()" class="btn">🔄 Refresh</button>
                    </div>
                </div>
            </div>

            <!-- Main Dashboard -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Chart Section -->
                <div class="lg:col-span-2">
                    <div class="card">
                        <h2 class="text-2xl font-bold mb-4">📊 Price Chart</h2>
                        <div id="priceChart" style="height: 500px;"></div>
                    </div>
                </div>

                <!-- Metrics Section -->
                <div>
                    <div class="card metric-card">
                        <h3 class="text-xl font-bold mb-4">💹 Current Price</h3>
                        <div id="currentPrice" class="text-3xl font-bold gradient-text">Loading...</div>
                        <div id="priceChange" class="text-sm text-slate-400 mt-2">-</div>
                    </div>

                    <div class="card metric-card">
                        <h3 class="text-xl font-bold mb-4">📈 Performance</h3>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <span>Total Trades:</span>
                                <span id="totalTrades" class="font-bold">0</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Win Rate:</span>
                                <span id="winRate" class="font-bold">0%</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Total P&L:</span>
                                <span id="totalPnL" class="font-bold">$0.00</span>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <h3 class="text-xl font-bold mb-4">🎯 Active Trades</h3>
                        <div id="activeTrades">No active trades</div>
                    </div>
                </div>
            </div>

            <!-- SMC Signals -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div class="card">
                    <h3 class="text-xl font-bold mb-4">🧠 Latest SMC Signals</h3>
                    <div id="smcSignals">Loading signals...</div>
                </div>

                <div class="card">
                    <h3 class="text-xl font-bold mb-4">🔍 Analysis Results</h3>
                    <div id="analysisResults">Click 'Analyze Market' to see detailed analysis</div>
                </div>
            </div>

            <!-- Footer -->
            <div class="text-center mt-8 text-slate-400">
                <p>SMC Trading Platform - Smart Money Concept Analysis | Last Updated: <span id="lastUpdate">-</span></p>
            </div>
        </div>

        <script>
            // Global variables
            let currentPair = 'EURUSD';
            let currentTimeframe = '1h';

            // API calls
            async function apiCall(endpoint, method = 'GET', data = null) {
                try {
                    const options = {
                        method,
                        headers: { 'Content-Type': 'application/json' }
                    };
                    if (data) options.body = JSON.stringify(data);

                    const response = await fetch(`/api${endpoint}`, options);
                    return await response.json();
                } catch (error) {
                    console.error('API Error:', error);
                    return null;
                }
            }

            // Update current price
            async function updateCurrentPrice() {
                const priceData = await apiCall(`/market-data/${currentPair}/price`);
                if (priceData) {
                    document.getElementById('currentPrice').textContent = priceData.price.toFixed(5);
                }
            }

            // Update performance metrics
            async function updatePerformance() {
                const performance = await apiCall('/analytics/performance');
                if (performance) {
                    document.getElementById('totalTrades').textContent = performance.totalTrades || 0;
                    document.getElementById('winRate').textContent = `${(performance.winRate * 100 || 0).toFixed(1)}%`;
                    document.getElementById('totalPnL').textContent = `$${(performance.totalPnL || 0).toFixed(2)}`;
                }
            }

            // Update SMC signals
            async function updateSMCSignals() {
                const signals = await apiCall('/smc-signals');
                if (signals) {
                    const signalsHtml = signals.slice(0, 5).map(signal => {
                        const directionClass = signal.direction === 'BULLISH' ? 'bullish' : 'bearish';
                        return `
                            <div class="signal-card ${directionClass}">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="font-bold">${signal.type} - ${signal.direction}</div>
                                        <div class="text-sm text-slate-400">${signal.pair} @ ${signal.price.toFixed(5)}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-sm">Confidence</div>
                                        <div class="font-bold">${(signal.confidence * 100).toFixed(1)}%</div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                    document.getElementById('smcSignals').innerHTML = signalsHtml || 'No signals available';
                }
            }

            // Update price chart
            async function updateChart() {
                const marketData = await apiCall(`/market-data/${currentPair}/${currentTimeframe}/100`);
                if (marketData && marketData.length > 0) {
                    const trace = {
                        x: marketData.map(d => new Date(d.timestamp)),
                        open: marketData.map(d => d.open),
                        high: marketData.map(d => d.high),
                        low: marketData.map(d => d.low),
                        close: marketData.map(d => d.close),
                        type: 'candlestick',
                        name: currentPair
                    };

                    const layout = {
                        title: `${currentPair} Price Chart`,
                        xaxis: { title: 'Time' },
                        yaxis: { title: 'Price' },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: 'white' }
                    };

                    Plotly.newPlot('priceChart', [trace], layout);
                }
            }

            // Perform SMC analysis
            async function performAnalysis() {
                const analysisData = await apiCall('/smc-analysis', 'POST', { pair: currentPair });
                if (analysisData) {
                    const analysisHtml = analysisData.slice(0, 5).map(result => {
                        const directionClass = result.direction === 'BULLISH' ? 'bullish' : 'bearish';
                        return `
                            <div class="signal-card ${directionClass}">
                                <div class="font-bold">${result.type} - ${result.direction}</div>
                                <div class="text-sm">Confidence: ${(result.confidence * 100).toFixed(1)}%</div>
                                <div class="text-sm text-slate-400">${result.description}</div>
                            </div>
                        `;
                    }).join('');
                    document.getElementById('analysisResults').innerHTML = analysisHtml || 'No analysis results';
                }
            }

            // Refresh all data
            async function refreshData() {
                await Promise.all([
                    updateCurrentPrice(),
                    updatePerformance(),
                    updateSMCSignals(),
                    updateChart()
                ]);
                document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
            }

            // Event listeners
            document.getElementById('pairSelect').addEventListener('change', (e) => {
                currentPair = e.target.value;
                refreshData();
            });

            document.getElementById('timeframeSelect').addEventListener('change', (e) => {
                currentTimeframe = e.target.value;
                updateChart();
            });

            // Initial load and auto-refresh
            refreshData();
            setInterval(refreshData, 5000); // Refresh every 5 seconds
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    print("🚀 Starting SMC Trading Platform with Python Stack...")
    uvicorn.run("python_server:app", host="0.0.0.0", port=5000, reload=False)