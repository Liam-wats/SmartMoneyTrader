# SMC Algorithmic Trading Platform

## Overview

This is a full-stack algorithmic trading application built on the Smart Money Concept (SMC) methodology used in institutional trading. The application provides real-time market analysis, automated pattern detection, backtesting capabilities, and live trading functionality with a focus on SMC patterns like Break of Structure (BOS), Fair Value Gaps (FVG), Order Blocks (OB), and Liquidity Sweeps (LS).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (July 16, 2025)

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
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM (DatabaseStorage implementation)
- **Real-time Communication**: WebSocket server for live updates
- **Market Data**: TwelveData API integration with API key authentication

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