import express from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { storage } from "./storage";
import { marketDataService } from "./services/marketData";
import { smcDetectionService } from "./services/smcDetection";
import { alertService } from "./services/alertService";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize storage and services
async function initializeServices() {
  try {
    // Initialize user and strategy if they don't exist
    const user = await storage.getUserByUsername("demo_user");
    if (!user) {
      await storage.createUser({
        username: "demo_user",
        password: "demo_password",
        accountBalance: 10000
      });
    }
    
    const strategies = await storage.getStrategies(1);
    if (strategies.length === 0) {
      await storage.createStrategy({
        userId: 1,
        name: "Default SMC Strategy",
        isActive: false,
        riskPercentage: 2,
        stopLoss: 50,
        takeProfit: 100,
        bosConfirmation: true,
        fvgTrading: true,
        liquiditySweeps: false,
        orderBlockFilter: true
      });
    }
    
    console.log("✅ Services initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing services:", error);
  }
}

// Register API routes and WebSocket
registerRoutes(app).then(server => {
  // Setup Vite dev server
  setupVite(app, server);
  
  // Initialize services after server is ready
  initializeServices();
  
  // Start server
  server.listen(PORT, () => {
    console.log(`[express] serving on port ${PORT}`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down gracefully...');
    server.close();
    process.exit(0);
  });
}).catch(error => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});