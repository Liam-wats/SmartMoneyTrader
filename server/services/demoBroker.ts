import { storage } from '../storage';
import { marketDataService } from './marketData';
import { Trade, InsertTrade } from '@shared/schema';
import { TradingSignal } from './trading';

export interface BrokerOrder {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  timestamp: Date;
  fillPrice?: number;
}

export interface BrokerBalance {
  accountBalance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
}

export interface BrokerPosition {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  size: number;
  openPrice: number;
  currentPrice: number;
  pnl: number;
  swap: number;
  commission: number;
  openTime: Date;
}

export class DemoBrokerService {
  private orders: Map<string, BrokerOrder> = new Map();
  private positions: Map<string, BrokerPosition> = new Map();
  private orderCallbacks: ((order: BrokerOrder) => void)[] = [];
  private positionCallbacks: ((position: BrokerPosition) => void)[] = [];
  
  // Demo account settings
  private readonly DEMO_BALANCE = 10000; // $10,000 demo account
  private readonly LEVERAGE = 100;
  private readonly SPREAD = 0.0001; // 1 pip spread
  private readonly COMMISSION_PER_LOT = 7; // $7 per lot commission
  
  constructor() {
    // Simulate order processing every 100ms
    setInterval(() => {
      this.processOrders();
    }, 100);
    
    // Update position P&L every second
    setInterval(() => {
      this.updatePositions();
    }, 1000);
  }

  async placeOrder(signal: TradingSignal, userId: number, strategyId: number): Promise<BrokerOrder> {
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const order: BrokerOrder = {
      id: orderId,
      pair: signal.pair,
      type: signal.type,
      size: signal.size,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      status: 'PENDING',
      timestamp: new Date()
    };
    
    this.orders.set(orderId, order);
    
    // Create database trade record
    const tradeData: InsertTrade & { userId: number } = {
      userId,
      strategyId,
      pair: signal.pair,
      type: signal.type,
      size: signal.size,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      status: 'PENDING',
      smcPattern: signal.pattern
    };
    
    try {
      await storage.createTrade(tradeData);
      console.log(`✅ Created order ${orderId} for ${signal.pair} ${signal.type} ${signal.size}`);
    } catch (error) {
      console.error('Error creating trade record:', error);
    }
    
    return order;
  }

  async closePosition(positionId: string): Promise<boolean> {
    const position = this.positions.get(positionId);
    if (!position) return false;
    
    try {
      const currentPrice = await marketDataService.getRealtimePrice(position.pair);
      const adjustedPrice = position.type === 'BUY' ? 
        currentPrice - this.SPREAD : currentPrice + this.SPREAD;
      
      // Calculate final P&L
      const finalPnL = this.calculatePnL(position, adjustedPrice);
      
      // Update database
      const trades = await storage.getTrades(1); // Get user trades
      const trade = trades.find(t => t.pair === position.pair && t.status === 'OPEN');
      
      if (trade) {
        await storage.closeTrade(trade.id, adjustedPrice, finalPnL);
        console.log(`✅ Closed position ${positionId} with P&L: $${finalPnL.toFixed(2)}`);
      }
      
      this.positions.delete(positionId);
      return true;
    } catch (error) {
      console.error('Error closing position:', error);
      return false;
    }
  }

  async getAccountInfo(): Promise<BrokerBalance> {
    const trades = await storage.getTrades(1);
    const activeTrades = trades.filter(t => t.status === 'OPEN');
    
    let totalPnL = 0;
    let usedMargin = 0;
    
    for (const trade of activeTrades) {
      if (trade.pnl) {
        totalPnL += trade.pnl;
      }
      // Calculate margin used (simplified)
      const lotSize = trade.size;
      const marginRequired = (lotSize * 100000) / this.LEVERAGE;
      usedMargin += marginRequired;
    }
    
    const currentBalance = this.DEMO_BALANCE + totalPnL;
    const equity = currentBalance + totalPnL;
    const freeMargin = Math.max(0, equity - usedMargin);
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0;
    
    return {
      accountBalance: currentBalance,
      equity,
      margin: usedMargin,
      freeMargin,
      marginLevel
    };
  }

  getPositions(): BrokerPosition[] {
    return Array.from(this.positions.values());
  }

  getOrders(): BrokerOrder[] {
    return Array.from(this.orders.values());
  }

  onOrderUpdate(callback: (order: BrokerOrder) => void): void {
    this.orderCallbacks.push(callback);
  }

  onPositionUpdate(callback: (position: BrokerPosition) => void): void {
    this.positionCallbacks.push(callback);
  }

  private async processOrders(): Promise<void> {
    for (const [orderId, order] of this.orders) {
      if (order.status === 'PENDING') {
        try {
          const currentPrice = await marketDataService.getRealtimePrice(order.pair);
          
          // Simulate order execution with spread
          const executionPrice = order.type === 'BUY' ? 
            currentPrice + this.SPREAD : currentPrice - this.SPREAD;
          
          // Check if order should be filled (simplified market execution)
          if (this.shouldFillOrder(order, currentPrice)) {
            await this.fillOrder(order, executionPrice);
          }
        } catch (error) {
          console.error(`Error processing order ${orderId}:`, error);
        }
      }
    }
  }

  private shouldFillOrder(order: BrokerOrder, currentPrice: number): boolean {
    // For demo purposes, fill orders immediately if they're market orders
    // (close to current price within reasonable spread)
    const tolerance = 0.0050; // 50 pip tolerance for demo
    
    if (order.type === 'BUY') {
      return Math.abs(currentPrice - order.entryPrice) <= tolerance;
    } else {
      return Math.abs(currentPrice - order.entryPrice) <= tolerance;
    }
  }

  private async fillOrder(order: BrokerOrder, fillPrice: number): Promise<void> {
    const positionId = `POS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const position: BrokerPosition = {
      id: positionId,
      pair: order.pair,
      type: order.type,
      size: order.size,
      openPrice: fillPrice,
      currentPrice: fillPrice,
      pnl: 0,
      swap: 0,
      commission: this.COMMISSION_PER_LOT * order.size,
      openTime: new Date()
    };
    
    this.positions.set(positionId, position);
    
    // Update order status
    order.status = 'FILLED';
    order.fillPrice = fillPrice;
    
    // Notify callbacks
    this.orderCallbacks.forEach(callback => callback(order));
    this.positionCallbacks.forEach(callback => callback(position));
    
    console.log(`🎯 Order filled: ${order.pair} ${order.type} ${order.size} at ${fillPrice}`);
  }

  private async updatePositions(): Promise<void> {
    for (const position of this.positions.values()) {
      try {
        const currentPrice = await marketDataService.getRealtimePrice(position.pair);
        const adjustedPrice = position.type === 'BUY' ? 
          currentPrice - this.SPREAD : currentPrice + this.SPREAD;
        
        position.currentPrice = adjustedPrice;
        position.pnl = this.calculatePnL(position, adjustedPrice);
        
        // Check for stop loss or take profit
        await this.checkStopLossAndTakeProfit(position);
        
      } catch (error) {
        console.error(`Error updating position ${position.id}:`, error);
      }
    }
  }

  private calculatePnL(position: BrokerPosition, currentPrice: number): number {
    let pnl = 0;
    
    if (position.type === 'BUY') {
      pnl = (currentPrice - position.openPrice) * position.size * 100000;
    } else {
      pnl = (position.openPrice - currentPrice) * position.size * 100000;
    }
    
    // Subtract commission and swap
    pnl -= position.commission + position.swap;
    
    return pnl;
  }

  private async checkStopLossAndTakeProfit(position: BrokerPosition): Promise<void> {
    const currentPrice = position.currentPrice;
    
    // Get the original trade to check SL/TP levels
    const trades = await storage.getTrades(1);
    const trade = trades.find(t => 
      t.pair === position.pair && 
      t.type === position.type && 
      t.status === 'OPEN'
    );
    
    if (!trade) return;
    
    let shouldClose = false;
    let reason = '';
    
    if (position.type === 'BUY') {
      if (trade.stopLoss && currentPrice <= trade.stopLoss) {
        shouldClose = true;
        reason = 'Stop Loss';
      } else if (trade.takeProfit && currentPrice >= trade.takeProfit) {
        shouldClose = true;
        reason = 'Take Profit';
      }
    } else {
      if (trade.stopLoss && currentPrice >= trade.stopLoss) {
        shouldClose = true;
        reason = 'Stop Loss';
      } else if (trade.takeProfit && currentPrice <= trade.takeProfit) {
        shouldClose = true;
        reason = 'Take Profit';
      }
    }
    
    if (shouldClose) {
      console.log(`🛑 ${reason} triggered for ${position.pair} at ${currentPrice}`);
      await this.closePosition(position.id);
    }
  }

  // Integration with existing trading signals
  async executeSignal(signal: TradingSignal, userId: number, strategyId: number): Promise<string> {
    try {
      const order = await this.placeOrder(signal, userId, strategyId);
      console.log(`📈 Signal executed: ${signal.pair} ${signal.type} - ${signal.pattern}`);
      return order.id;
    } catch (error) {
      console.error('Error executing trading signal:', error);
      throw error;
    }
  }

  // Risk management
  async checkRiskLimits(signal: TradingSignal): Promise<boolean> {
    const accountInfo = await this.getAccountInfo();
    const positionValue = signal.size * 100000; // Standard lot size
    const marginRequired = positionValue / this.LEVERAGE;
    
    // Check if sufficient free margin
    if (marginRequired > accountInfo.freeMargin) {
      console.warn(`❌ Insufficient margin for ${signal.pair} ${signal.type}`);
      return false;
    }
    
    // Check maximum risk per trade (2% of account)
    const maxRisk = accountInfo.accountBalance * 0.02;
    const potentialLoss = Math.abs(signal.entryPrice - signal.stopLoss) * signal.size * 100000;
    
    if (potentialLoss > maxRisk) {
      console.warn(`❌ Risk too high for ${signal.pair}: $${potentialLoss.toFixed(2)} > $${maxRisk.toFixed(2)}`);
      return false;
    }
    
    return true;
  }
}

// Global instance
export const demoBrokerService = new DemoBrokerService();