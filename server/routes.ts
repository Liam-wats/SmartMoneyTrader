import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { marketDataService } from "./services/marketData";
import { smcDetectionService } from "./services/smcDetection";
import { backtestingService } from "./services/backtesting";
import { tradingService } from "./services/trading";
import { topDownAnalysisService } from "./services/topDownAnalysis";
import { mlPatternRecognitionService } from "./services/mlPatternRecognition";
import { marketHoursService } from "./services/marketHours";
import { 
  insertStrategySchema, 
  insertTradeSchema, 
  insertSMCSignalSchema,
  insertBacktestSchema 
} from "@shared/schema";
import { alertService } from "./services/alertService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedClients: Set<WebSocket> = new Set();
  
  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    alertService.addWebSocketClient(ws);
    
    ws.on('close', () => {
      connectedClients.delete(ws);
    });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleWebSocketMessage(ws, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
  });

  // Broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Handle WebSocket messages
  async function handleWebSocketMessage(ws: WebSocket, data: any) {
    try {
      switch (data.type) {
        case 'subscribe_market_data':
          const pair = data.pair;
          marketDataService.subscribeToPrice(pair, (price) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'market_data_update',
                pair,
                price
              }));
            }
          });
          break;
          
        case 'unsubscribe_market_data':
          marketDataService.unsubscribeFromPrice(data.pair);
          break;
          
        default:
          console.warn('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  // Set up trading signal notifications
  tradingService.onSignal((signal) => {
    broadcast({
      type: 'trading_signal',
      signal
    });
  });

  // API Routes

  // Get current user (demo user for now)
  app.get('/api/user', async (req, res) => {
    try {
      const user = await storage.getUser(1); // Demo user
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Get market status
  app.get('/api/market-status', async (req, res) => {
    try {
      const marketStatus = marketHoursService.getMarketStatus();
      res.json(marketStatus);
    } catch (error) {
      console.error('Error fetching market status:', error);
      res.status(500).json({ error: 'Failed to fetch market status' });
    }
  });

  // Strategy routes
  app.get('/api/strategies', async (req, res) => {
    try {
      // Get demo user
      let user = await storage.getUserByUsername('demo_user');
      if (!user) {
        user = await storage.createUser({
          username: 'demo_user',
          password: 'demo_password',
          accountBalance: 10000
        });
      }
      const strategies = await storage.getStrategies(user.id);
      res.json(strategies);
    } catch (error) {
      console.error('Error fetching strategies:', error);
      res.status(500).json({ error: 'Failed to fetch strategies' });
    }
  });

  app.post('/api/strategies', async (req, res) => {
    try {
      console.log('Received strategy data:', req.body);
      const strategy = insertStrategySchema.parse(req.body);
      console.log('Parsed strategy:', strategy);
      
      // Ensure demo user exists
      let user = await storage.getUserByUsername('demo_user');
      if (!user) {
        user = await storage.createUser({
          username: 'demo_user',
          password: 'demo_password',
          accountBalance: 10000
        });
      }
      
      console.log('Using user ID:', user.id);
      const newStrategy = await storage.createStrategy({ ...strategy, userId: user.id });
      res.json(newStrategy);
    } catch (error) {
      console.error('Strategy creation error:', error);
      res.status(400).json({ error: 'Invalid strategy data', details: error.message });
    }
  });

  app.put('/api/strategies/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const strategy = insertStrategySchema.parse(req.body);
      const updatedStrategy = await storage.updateStrategy(id, strategy);
      
      if (!updatedStrategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }
      
      res.json(updatedStrategy);
    } catch (error) {
      res.status(400).json({ error: 'Invalid strategy data' });
    }
  });

  app.delete('/api/strategies/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStrategy(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete strategy' });
    }
  });

  // Start/stop strategy
  app.post('/api/strategies/:id/start', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const strategy = await storage.getStrategy(id);
      
      if (!strategy) {
        return res.status(404).json({ error: 'Strategy not found' });
      }
      
      await storage.updateStrategy(id, { isActive: true });
      tradingService.startStrategy({ ...strategy, isActive: true });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to start strategy' });
    }
  });

  app.post('/api/strategies/:id/stop', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateStrategy(id, { isActive: false });
      tradingService.stopStrategy(id);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop strategy' });
    }
  });

  // Trade routes
  app.get('/api/trades', async (req, res) => {
    try {
      // Get demo user
      let user = await storage.getUserByUsername('demo_user');
      if (!user) {
        user = await storage.createUser({
          username: 'demo_user',
          password: 'demo_password',
          accountBalance: 10000
        });
      }
      const trades = await storage.getTrades(user.id);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  app.get('/api/trades/active', async (req, res) => {
    try {
      // Get demo user
      let user = await storage.getUserByUsername('demo_user');
      if (!user) {
        user = await storage.createUser({
          username: 'demo_user',
          password: 'demo_password',
          accountBalance: 10000
        });
      }
      const trades = await storage.getActiveTrades(user.id);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch active trades' });
    }
  });

  app.post('/api/trades', async (req, res) => {
    try {
      const trade = insertTradeSchema.parse(req.body);
      // Get demo user
      let user = await storage.getUserByUsername('demo_user');
      if (!user) {
        user = await storage.createUser({
          username: 'demo_user',
          password: 'demo_password',
          accountBalance: 10000
        });
      }

      const newTrade = await storage.createTrade({ ...trade, userId: user.id });
      
      // Broadcast trade opened event
      broadcast({
        type: 'trade_opened',
        trade: newTrade
      });

      // Send entry alert
      const alert = alertService.createEntryAlert(newTrade.id, newTrade.pair, newTrade.entryPrice, newTrade.type);
      await alertService.sendAlert(user.id, alert);
      
      res.json(newTrade);
    } catch (error) {
      console.error('Error creating trade:', error);
      res.status(400).json({ error: 'Invalid trade data' });
    }
  });

  app.post('/api/trades/:id/close', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { exitPrice, pnl } = req.body;
      
      const closedTrade = await storage.closeTrade(id, exitPrice, pnl);
      
      if (!closedTrade) {
        return res.status(404).json({ error: 'Trade not found' });
      }
      
      // Broadcast appropriate trade event
      const eventType = pnl >= 0 ? 'trade_closed' : 'trade_closed';
      
      // Check if it was a stop loss or take profit
      if (closedTrade.stopLoss && Math.abs(exitPrice - closedTrade.stopLoss) < 0.0001) {
        broadcast({
          type: 'stop_loss_hit',
          trade: closedTrade
        });
      } else if (closedTrade.takeProfit && Math.abs(exitPrice - closedTrade.takeProfit) < 0.0001) {
        broadcast({
          type: 'take_profit_hit',
          trade: closedTrade
        });
      } else {
        broadcast({
          type: eventType,
          trade: closedTrade
        });
      }
      
      res.json(closedTrade);
    } catch (error) {
      console.error('Error closing trade:', error);
      res.status(500).json({ error: 'Failed to close trade' });
    }
  });

  // SMC Signal routes
  app.get('/api/smc-signals', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const signals = await storage.getSMCSignals(limit);
      res.json(signals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch SMC signals' });
    }
  });

  // Market data routes
  app.get('/api/market-data/:pair', async (req, res) => {
    try {
      const { pair } = req.params;
      const timeframe = req.query.timeframe as string || '1h';
      const limit = parseInt(req.query.limit as string) || 100;
      
      const data = await marketDataService.getHistoricalData(pair, timeframe, limit);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch market data' });
    }
  });

  app.get('/api/market-data/:pair/price', async (req, res) => {
    try {
      const { pair } = req.params;
      const price = await marketDataService.getRealtimePrice(pair);
      res.json({ price });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch price' });
    }
  });

  // SMC Analysis
  app.post('/api/smc-analysis', async (req, res) => {
    try {
      const { pair, timeframe, limit } = req.body;
      const data = await marketDataService.getHistoricalData(pair, timeframe, limit || 100);
      const patterns = smcDetectionService.detectPatterns(data, pair, timeframe);
      
      // Store significant patterns as signals
      for (const pattern of patterns) {
        if (pattern.confidence > 0.8) {
          await storage.createSMCSignal({
            pair,
            timeframe,
            pattern: pattern.type,
            direction: pattern.direction,
            price: pattern.price,
            confidence: pattern.confidence,
            description: pattern.description
          });
        }
      }
      
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze SMC patterns' });
    }
  });

  // Top-down analysis endpoint
  app.post('/api/top-down-analysis', async (req, res) => {
    try {
      const { pair } = req.body;
      
      if (!pair) {
        return res.status(400).json({ error: 'Pair is required' });
      }
      
      const analysis = await topDownAnalysisService.performTopDownAnalysis(pair);
      res.json(analysis);
    } catch (error) {
      console.error('Error in top-down analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ML Pattern Recognition endpoint
  app.post('/api/ml-pattern-analysis', async (req, res) => {
    try {
      const { pair, timeframe, limit = 100 } = req.body;
      
      if (!pair || !timeframe) {
        return res.status(400).json({ error: 'Pair and timeframe are required' });
      }
      
      const data = await marketDataService.getHistoricalData(pair, timeframe, limit);
      const predictions = await mlPatternRecognitionService.analyzePattern(data, pair, timeframe);
      
      res.json(predictions);
    } catch (error) {
      console.error('Error in ML pattern analysis:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Strategy execution routes
  app.post('/api/strategy/start', async (req, res) => {
    try {
      const { strategyId } = req.body;
      
      // Ensure demo user exists
      let user = await storage.getUserByUsername('demo_user');
      if (!user) {
        user = await storage.createUser({
          username: 'demo_user',
          password: 'demo_password',
          accountBalance: 10000
        });
      }
      
      let strategy = await storage.getStrategy(strategyId || 1);
      
      // Create default strategy if none exists
      if (!strategy) {
        strategy = await storage.createStrategy({
          userId: user.id,
          name: 'Default SMC Strategy',
          riskPercentage: 2,
          stopLoss: 50,
          takeProfit: 100,
          bosConfirmation: true,
          fvgTrading: true,
          liquiditySweeps: false,
          orderBlockFilter: true,
        });
      }
      
      // Start monitoring for signals and execute trades
      broadcast({
        type: 'strategy_started',
        strategy: strategy
      });

      // Send trading alert
      const alert = alertService.createStrategyStartAlert(strategy.id, strategy.name);
      await alertService.sendAlert(user.id, alert);
      
      res.json({ success: true, strategy });
    } catch (error) {
      console.error('Error starting strategy:', error);
      res.status(500).json({ error: 'Failed to start strategy' });
    }
  });

  app.post('/api/strategy/stop', async (req, res) => {
    try {
      broadcast({
        type: 'strategy_stopped'
      });

      // Send strategy stop alert
      let user = await storage.getUserByUsername('demo_user');
      if (user) {
        const alert = alertService.createStrategyStopAlert(1, 'Active Strategy');
        await alertService.sendAlert(user.id, alert);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error stopping strategy:', error);
      res.status(500).json({ error: 'Failed to stop strategy' });
    }
  });

  // Backtesting routes
  app.post('/api/backtest', async (req, res) => {
    try {
      const { strategyId, startDate, endDate, pair, timeframe } = req.body;
      let strategy = await storage.getStrategy(strategyId);
      
      // Ensure user exists for strategy creation
      let user = await storage.getUserByUsername('demo_user');
      if (!user) {
        user = await storage.createUser({
          username: 'demo_user',
          password: 'demo_password',
          accountBalance: 10000
        });
      }
      
      // Create default strategy if none exists
      if (!strategy) {
        strategy = await storage.createStrategy({
          userId: user.id,
          name: 'Default SMC Strategy',
          riskPercentage: 2,
          stopLoss: 50,
          takeProfit: 100,
          bosConfirmation: true,
          fvgTrading: true,
          liquiditySweeps: false,
          orderBlockFilter: true,
        });
      }
      
      const data = await marketDataService.getHistoricalData(pair, timeframe, 1000);
      const results = await backtestingService.runBacktest(data, strategy);
      
      // Store backtest results
      const backtest = await storage.createBacktest({
        userId: user.id,
        strategyId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalTrades: results.totalTrades,
        winRate: results.winRate,
        profitFactor: results.profitFactor,
        maxDrawdown: results.maxDrawdown,
        totalPnL: results.totalPnL,
        results: results
      });
      
      res.json(backtest);
    } catch (error) {
      console.error('Backtest error:', error);
      res.status(500).json({ error: 'Failed to run backtest', details: error.message });
    }
  });

  app.get('/api/backtests', async (req, res) => {
    try {
      // Get demo user
      let user = await storage.getUserByUsername('demo_user');
      if (!user) {
        user = await storage.createUser({
          username: 'demo_user',
          password: 'demo_password',
          accountBalance: 10000
        });
      }
      const backtests = await storage.getBacktests(user.id);
      res.json(backtests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch backtests' });
    }
  });

  // Analytics routes
  app.get('/api/analytics/performance', async (req, res) => {
    try {
      // Get demo user
      let user = await storage.getUserByUsername('demo_user');
      if (!user) {
        user = await storage.createUser({
          username: 'demo_user',
          password: 'demo_password',
          accountBalance: 10000
        });
      }
      const trades = await storage.getTrades(user.id);
      const completedTrades = trades.filter(t => t.status === 'CLOSED');
      
      const analytics = {
        totalTrades: completedTrades.length,
        winningTrades: completedTrades.filter(t => (t.pnl || 0) > 0).length,
        losingTrades: completedTrades.filter(t => (t.pnl || 0) < 0).length,
        totalPnL: completedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
        winRate: completedTrades.length > 0 ? 
          completedTrades.filter(t => (t.pnl || 0) > 0).length / completedTrades.length : 0,
        profitFactor: 0, // Calculate based on gross profit/loss
        maxDrawdown: 0, // Calculate based on equity curve
      };
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Periodically generate SMC signals only when market is open
  setInterval(() => {
    (async () => {
      try {
        // Only process signals when market is open
        if (!marketHoursService.shouldProcessSignals()) {
          return;
        }

        const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];
        const timeframes = ['1h', '4h'];
        
        for (const pair of pairs) {
          for (const timeframe of timeframes) {
            try {
              const data = await marketDataService.getHistoricalData(pair, timeframe, 50);
              const patterns = smcDetectionService.detectPatterns(data, pair, timeframe);
              
              for (const pattern of patterns) {
                if (pattern.confidence > 0.75 && Math.random() > 0.8) {
                  try {
                    const signal = await storage.createSMCSignal({
                      pair,
                      timeframe,
                      pattern: pattern.type,
                      direction: pattern.direction,
                      price: pattern.price,
                      confidence: pattern.confidence,
                      description: pattern.description
                    });
                    
                    // Broadcast to connected clients
                    broadcast({
                      type: 'new_smc_signal',
                      signal
                    });
                  } catch (signalError) {
                    console.error(`Error creating SMC signal for ${pair}:`, signalError);
                  }
                }
              }
            } catch (pairError) {
              console.error(`Error processing ${pair} ${timeframe}:`, pairError);
            }
          }
        }
      } catch (error) {
        console.error('Error in SMC signal generation:', error);
      }
    })().catch(error => console.error('Unhandled error in SMC signal generation:', error));
  }, 30000); // Every 30 seconds to reduce load

  return httpServer;
}
