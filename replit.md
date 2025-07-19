# SMC Algorithmic Trading Platform

## Overview

This is a full-stack algorithmic trading application built on the Smart Money Concept (SMC) methodology used in institutional trading. The application provides real-time market analysis, automated pattern detection, backtesting capabilities, and live trading functionality with a focus on SMC patterns like Break of Structure (BOS), Fair Value Gaps (FVG), Order Blocks (OB), and Liquidity Sweeps (LS).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (July 19, 2025)

### Migration to Standard Replit Environment Complete ✅
- ✅ Successfully migrated SMC Algorithmic Trading Platform from Replit Agent to standard environment
- ✅ Fixed all dependencies and resolved technical indicator library integration
- ✅ Implemented comprehensive Demo Broker Integration with:
  - Virtual $10,000 trading account with real-time P&L tracking
  - Automated order execution and position management
  - Stop loss and take profit automation
  - Risk management with margin level monitoring
  - Manual trading interface for testing signals
- ✅ Enhanced Live Trading dashboard with broker integration components
- ✅ All core services verified and functional:
  - Market data feeds working with TwelveData API
  - SMC pattern detection algorithms active
  - WebSocket real-time updates operational
  - Database properly configured with PostgreSQL
  - Technical analysis indicators functioning
- ✅ Application ready for demo trading with full broker simulation

### Previous Updates (July 17, 2025)

### Enhanced Signal Detection with Telegram Notifications - Complete ✅
- ✅ Implemented comprehensive Enhanced Signal Detection Service:
  - Advanced technical analysis using RSI, Moving Averages, Bollinger Bands, MACD, Stochastic, and ATR indicators
  - Smart Money Concept (SMC) pattern integration with BOS, FVG, OB, LS, and CHoCH detection
  - Multi-factor signal confirmation system requiring 3+ confluences for high-confidence signals
  - Automated confidence scoring with 70%+ threshold for signal generation
  - Risk-reward analysis with minimum 2:1 RR ratio filtering
- ✅ Built automatic Telegram notification system:
  - Real-time signal broadcasting to configured Telegram channels
  - Professional signal formatting with entry, take-profit, and stop-loss levels
  - Technical confirmation details and SMC pattern analysis in notifications
  - Configurable via TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID secrets
- ✅ Created Enhanced Signals dashboard page:
  - Real-time signal monitoring with live confidence metrics
  - Interactive currency pair analysis with manual signal generation
  - Performance tracking with signal history and success rates
  - Modern UI with progress bars and signal strength indicators
- ✅ Established automated monitoring system:
  - Continuous market scanning every 15 minutes across 8 major currency pairs
  - Background service running independently of user interface
  - Automatic signal detection and notification without manual intervention
- ✅ Enhanced trading platform stability:
  - Fixed technical indicator calculation errors with proper data validation
  - Improved database initialization with proper user/strategy creation
  - Telegram service integration with environment variable configuration
  - All core services running successfully with comprehensive error handling

### Advanced FastAPI Backend with ML Integration - Complete ✅
- ✅ Successfully migrated from Node.js/Express to FastAPI backend architecture
- ✅ Built comprehensive machine learning service with multiple algorithms:
  - Random Forest and SVM classifiers for structured SMC pattern recognition
  - XGBoost for high-performance classification with confidence scoring
  - Custom CNN and LSTM models using PyTorch for deep learning pattern detection
  - Ensemble prediction system combining all models with weighted voting
- ✅ Implemented advanced SMC detection service with institutional-grade patterns:
  - Break of Structure (BOS) detection with momentum confirmation
  - Change of Character (CHoCH) identification for trend reversals
  - Fair Value Gap (FVG) recognition with gap size analysis
  - Order Block (OB) detection with rejection strength calculation
  - Liquidity Sweep (LS) patterns at equal highs/lows
- ✅ Created professional trading frontend with real-time capabilities:
  - Interactive candlestick charts with Plotly.js integration
  - Live price feeds with WebSocket connections
  - ML prediction dashboard with confidence metrics
  - SMC signal display with pattern visualization
  - Performance analytics with comprehensive trading metrics
- ✅ Established robust backend architecture with proper CORS, error handling
- ✅ PostgreSQL database integration with asyncpg for high-performance queries
- ✅ All endpoints documented with structured JSON responses
- ✅ System ready for production deployment with scalable ML model serving

### Tech Stack Migration to Python/FastAPI - Complete ✅
- ✅ Successfully migrated from Node.js/TypeScript to Python/FastAPI architecture
- ✅ Created professional FastAPI backend with async SQLAlchemy ORM
- ✅ Implemented advanced SMC detection service with institutional-grade algorithms
- ✅ Built high-performance market data service with aiohttp and rate limiting
- ✅ WebSocket service for real-time updates with automatic reconnection
- ✅ Database models optimized for trading operations and analytics
- ✅ All core API endpoints implemented: users, strategies, trades, signals, analytics
- ✅ FastAPI server running successfully on port 5000 with PostgreSQL integration
- ✅ Comprehensive error handling and fallback mechanisms implemented
- ✅ Ready for enhanced machine learning integration and backtesting with Backtrader

### Migration to Standard Replit Environment - Complete ✅
- ✅ Successfully migrated SMC trading platform from Replit Agent to standard Replit environment
- ✅ Database properly configured with PostgreSQL and all schema migrations applied
- ✅ All dependencies installed and application running smoothly on port 5000
- ✅ Core functionality verified: market data feeds, SMC analysis, user authentication, and real-time updates
- ✅ WebSocket connections stable with live price feeds and trading signals
- ✅ Project ready for further development and enhancements

### Enhanced Trading Platform with Advanced Analysis
- ✅ Fixed critical WebSocket unhandled promise rejections with comprehensive error handling
- ✅ Implemented advanced Top-Down Analysis service with multi-timeframe SMC analysis:
  - Higher timeframe bias detection (4H structure analysis)
  - Lower timeframe entry confirmation (1H and 15m analysis)
  - Confluence-based signal generation requiring 3+ confirming factors
  - Risk-reward filtering with minimum 2:1 RR ratio requirement
  - Advanced pattern confidence scoring and ranking system
- ✅ Created comprehensive SMC Detection Service with institutional-grade patterns:
  - Break of Structure (BOS) detection with momentum confirmation
  - Fair Value Gap (FVG) identification with size-based confidence
  - Order Block (OB) recognition with rejection confirmation
  - Liquidity Sweep (LS) detection at equal highs/lows
  - Change of Character (CHoCH) identification for trend shifts
- ✅ Built professional Top-Down Analysis dashboard:
  - Multi-timeframe bias visualization with confidence metrics
  - High-probability confluence signal display
  - Real-time recommendation engine (STRONG_BUY/BUY/NEUTRAL/SELL/STRONG_SELL)
  - Interactive currency pair selection and analysis execution
- ✅ Enhanced SMC signals UI with compact, chart-optimized layout
- ✅ Fixed all null PnL crashes across LiveTrading, ActiveTrades, and AlertNotifications components

### Previous Migrations and Fixes (July 15, 2025)
- ✅ Successfully migrated SMC trading platform to standard Replit environment
- ✅ Fixed all core functionality issues and enhanced alert system
- ✅ Database properly configured with PostgreSQL and all migrations applied

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket client for live market data and trading signals

### Backend Architecture
- **Runtime**: Python 3.11 with FastAPI framework (ACTIVE)
- **Language**: Python with async/await support
- **Database**: PostgreSQL with SQLAlchemy ORM (async)
- **Real-time Communication**: WebSocket server for live updates
- **Market Data**: TwelveData API integration with aiohttp
- **Technical Analysis**: Custom SMC detection algorithms with numpy

### Frontend Architecture  
- **Framework**: Python FastAPI with HTML/JavaScript frontend (ACTIVE)
- **Styling**: Tailwind CSS with custom trading themes
- **Charts**: Plotly.js for interactive candlestick charts
- **Real-time Updates**: JavaScript auto-refresh every 5 seconds
- **UI Components**: Custom HTML components optimized for trading

## Key Components

### Database Schema (PostgreSQL + Drizzle)
- **Users**: Account management with balance tracking
- **Strategies**: Configurable trading strategies with SMC parameters
- **Trades**: Trade execution records with P&L tracking
- **SMC Signals**: Pattern detection results storage
- **Market Data**: OHLCV candlestick data storage
- **Backtests**: Historical strategy performance records

### Trading Services
- **Market Data Service**: Real-time price feeds and historical data retrieval
- **SMC Detection Service**: Pattern recognition algorithms for BOS, FVG, OB, LS
- **Backtesting Service**: Historical strategy performance analysis
- **Trading Service**: Live trade execution and risk management

### Frontend Components
- **Dashboard**: Main trading interface with real-time data
- **Trading Chart**: Candlestick visualization with SMC pattern overlays
- **Performance Analytics**: Strategy metrics and equity curves
- **Strategy Settings**: Risk management and pattern configuration
- **Active Trades**: Live position monitoring and management

## Data Flow

1. **Market Data Ingestion**: Real-time price data from TwelveData API
2. **Pattern Detection**: SMC algorithms analyze market structure
3. **Signal Generation**: Trading signals based on detected patterns
4. **Strategy Execution**: Automated trade placement with risk management
5. **Performance Tracking**: Real-time P&L and analytics updates
6. **WebSocket Broadcasting**: Live updates to connected clients

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Market Data**: TwelveData API for real-time and historical forex data
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Charts**: Custom canvas-based charting with SMC markup support

### Development Tools
- **Build System**: Vite with TypeScript compilation
- **Database Migrations**: Drizzle Kit for schema management
- **Code Quality**: ESLint and TypeScript strict mode
- **Styling**: PostCSS with Tailwind CSS processing

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: tsx for TypeScript execution with auto-reload
- **Database**: Neon serverless PostgreSQL instance

### Production Build
- **Frontend**: Vite production build with optimized assets
- **Backend**: esbuild bundling for Node.js deployment
- **Database**: Drizzle migrations for schema deployment

### Architecture Decisions

1. **Monorepo Structure**: Shared schema and types between client/server
2. **WebSocket Integration**: Real-time updates for trading signals and market data
3. **Database Storage**: PostgreSQL with Drizzle ORM for persistent data storage
4. **Modular Service Architecture**: Separate services for different trading functions
5. **SMC-Focused Design**: UI and logic specifically tailored for Smart Money Concept trading
6. **Risk Management**: Built-in position sizing and stop-loss mechanisms

The application is designed to be a professional-grade trading platform with institutional-level SMC analysis capabilities, real-time market monitoring, and comprehensive backtesting features.