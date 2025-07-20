#!/usr/bin/env python3
"""
Streamlit Frontend for SMC Trading Platform
"""
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import requests
import pandas as pd
import json
import time
from datetime import datetime, timedelta
from streamlit_autorefresh import st_autorefresh

# Configure page
st.set_page_config(
    page_title="SMC Trading Platform",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# API Base URL
API_BASE = "http://localhost:5000/api"

# Custom CSS for trading theme
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        color: #00ff88;
        text-align: center;
        margin-bottom: 2rem;
        text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
    }
    .metric-card {
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
        padding: 1rem;
        border-radius: 10px;
        color: white;
        margin: 0.5rem 0;
    }
    .bullish { color: #00ff88; }
    .bearish { color: #ff4444; }
    .neutral { color: #ffaa00; }
    .signal-card {
        border: 1px solid #333;
        border-radius: 8px;
        padding: 1rem;
        margin: 0.5rem 0;
        background: #1a1a1a;
    }
</style>
""", unsafe_allow_html=True)

def make_api_request(endpoint, method="GET", data=None):
    """Make API request with error handling"""
    try:
        url = f"{API_BASE}{endpoint}"
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code}")
            return None
    except Exception as e:
        st.error(f"Connection Error: {str(e)}")
        return None

def get_market_data(pair="EURUSD", timeframe="1h", limit=100):
    """Fetch market data"""
    return make_api_request(f"/market-data/{pair}/{timeframe}/{limit}")

def get_smc_signals():
    """Fetch SMC signals"""
    return make_api_request("/smc-signals")

def get_current_price(pair="EURUSD"):
    """Get current price"""
    return make_api_request(f"/market-data/{pair}/price")

def get_active_trades():
    """Get active trades"""
    return make_api_request("/trades/active")

def get_performance_analytics():
    """Get performance analytics"""
    return make_api_request("/analytics/performance")

def perform_smc_analysis(pair="EURUSD"):
    """Perform SMC analysis"""
    return make_api_request("/smc-analysis", method="POST", data={"pair": pair})

def create_candlestick_chart(market_data):
    """Create candlestick chart with SMC patterns"""
    if not market_data:
        return None
    
    df = pd.DataFrame(market_data)
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    
    fig = go.Figure(data=go.Candlestick(
        x=df['timestamp'],
        open=df['open'],
        high=df['high'],
        low=df['low'],
        close=df['close'],
        name="EURUSD"
    ))
    
    fig.update_layout(
        title="EURUSD Price Chart",
        yaxis_title="Price",
        xaxis_title="Time",
        template="plotly_dark",
        height=500,
        showlegend=False
    )
    
    return fig

def display_smc_signals(signals):
    """Display SMC signals in a formatted way"""
    if not signals:
        st.info("No SMC signals available")
        return
    
    for signal in signals[:10]:  # Show latest 10 signals
        signal_type = signal.get('type', 'Unknown')
        direction = signal.get('direction', 'Unknown')
        confidence = signal.get('confidence', 0)
        pair = signal.get('pair', 'Unknown')
        price = signal.get('price', 0)
        
        # Color based on direction
        color_class = "bullish" if direction == "BULLISH" else "bearish"
        
        st.markdown(f"""
        <div class="signal-card">
            <h4 class="{color_class}">{signal_type} - {direction}</h4>
            <p><strong>Pair:</strong> {pair}</p>
            <p><strong>Price:</strong> {price:.5f}</p>
            <p><strong>Confidence:</strong> {confidence:.1%}</p>
            <p><strong>Pattern:</strong> {signal.get('pattern', 'N/A')}</p>
        </div>
        """, unsafe_allow_html=True)

def main():
    """Main Streamlit application"""
    
    # Auto-refresh every 5 seconds
    count = st_autorefresh(interval=5000, limit=None, key="data_refresh")
    
    # Header
    st.markdown('<h1 class="main-header">🏛️ SMC Trading Platform</h1>', unsafe_allow_html=True)
    
    # Sidebar for controls
    st.sidebar.title("Trading Controls")
    
    # Currency pair selection
    pairs = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"]
    selected_pair = st.sidebar.selectbox("Select Currency Pair", pairs)
    
    # Timeframe selection
    timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"]
    selected_timeframe = st.sidebar.selectbox("Select Timeframe", timeframes, index=4)
    
    # Analysis button
    if st.sidebar.button("🔍 Perform SMC Analysis", type="primary"):
        with st.spinner("Analyzing market structure..."):
            analysis_result = perform_smc_analysis(selected_pair)
            if analysis_result:
                st.sidebar.success("Analysis completed!")
                st.session_state['analysis_result'] = analysis_result
    
    # Main content area
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        st.subheader("📊 Price Chart")
        
        # Get market data and create chart
        market_data = get_market_data(selected_pair, selected_timeframe)
        if market_data:
            chart = create_candlestick_chart(market_data)
            if chart:
                st.plotly_chart(chart, use_container_width=True)
        else:
            st.warning("Unable to load market data")
    
    with col2:
        st.subheader("💹 Current Price")
        
        # Display current price
        price_data = get_current_price(selected_pair)
        if price_data:
            current_price = price_data.get('price', 0)
            st.metric(
                label=f"{selected_pair}",
                value=f"{current_price:.5f}",
                delta=None
            )
        
        st.subheader("📈 Performance")
        
        # Display performance metrics
        performance = get_performance_analytics()
        if performance:
            st.metric("Total Trades", performance.get('totalTrades', 0))
            win_rate = performance.get('winRate', 0)
            st.metric("Win Rate", f"{win_rate:.1%}")
            total_pnl = performance.get('totalPnL', 0)
            st.metric("Total P&L", f"${total_pnl:.2f}")
    
    with col3:
        st.subheader("🎯 Active Trades")
        
        # Display active trades
        active_trades = get_active_trades()
        if active_trades:
            for trade in active_trades:
                trade_type = trade.get('type', 'Unknown')
                trade_pair = trade.get('pair', 'Unknown')
                entry_price = trade.get('entryPrice', 0)
                pnl = trade.get('unrealizedPnL', 0)
                
                pnl_color = "🟢" if pnl >= 0 else "🔴"
                st.write(f"{pnl_color} {trade_type} {trade_pair}")
                st.write(f"Entry: {entry_price:.5f}")
                st.write(f"P&L: ${pnl:.2f}")
                st.write("---")
        else:
            st.info("No active trades")
    
    # SMC Signals section
    st.subheader("🧠 SMC Signals")
    
    col4, col5 = st.columns(2)
    
    with col4:
        st.write("**Latest Signals**")
        signals = get_smc_signals()
        display_smc_signals(signals)
    
    with col5:
        st.write("**Analysis Results**")
        if 'analysis_result' in st.session_state:
            analysis = st.session_state['analysis_result']
            for result in analysis[:5]:  # Show top 5 analysis results
                signal_type = result.get('type', 'Unknown')
                direction = result.get('direction', 'Unknown')
                confidence = result.get('confidence', 0)
                
                color_class = "bullish" if direction == "BULLISH" else "bearish"
                
                st.markdown(f"""
                <div class="signal-card">
                    <h5 class="{color_class}">{signal_type} - {direction}</h5>
                    <p><strong>Confidence:</strong> {confidence:.1%}</p>
                    <p><strong>Description:</strong> {result.get('description', 'N/A')}</p>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.info("Click 'Perform SMC Analysis' to see detailed analysis")
    
    # Footer
    st.markdown("---")
    st.markdown(
        "<div style='text-align: center; color: #666;'>"
        "SMC Trading Platform - Smart Money Concept Analysis | "
        f"Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        "</div>", 
        unsafe_allow_html=True
    )

if __name__ == "__main__":
    main()