import { WebSocket } from 'ws';

export interface AlertConfig {
  userId: number;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  inAppEnabled: boolean;
  emailAddress?: string;
  telegramChatId?: string;
}

export interface TradingAlert {
  type: 'ENTRY' | 'EXIT' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'STRATEGY_START' | 'STRATEGY_STOP';
  title: string;
  message: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  timestamp: Date;
  tradeId?: number;
  strategyId?: number;
  price?: number;
  pnl?: number;
  emoji?: string;
}

export class AlertService {
  private wsClients: Set<WebSocket> = new Set();
  private alertConfigs: Map<number, AlertConfig> = new Map();

  constructor() {
    // Default alert configuration for demo user
    this.alertConfigs.set(1, {
      userId: 1,
      emailEnabled: false,
      telegramEnabled: false,
      inAppEnabled: true
    });
  }

  addWebSocketClient(ws: WebSocket): void {
    this.wsClients.add(ws);
    ws.on('close', () => {
      this.wsClients.delete(ws);
    });
  }

  async sendAlert(userId: number, alert: TradingAlert): Promise<void> {
    const config = this.alertConfigs.get(userId);
    if (!config) return;

    try {
      // In-app notifications via WebSocket
      if (config.inAppEnabled) {
        await this.sendInAppAlert(alert);
      }

      // Email notifications
      if (config.emailEnabled && config.emailAddress) {
        await this.sendEmailAlert(config.emailAddress, alert);
      }

      // Telegram notifications
      if (config.telegramEnabled && config.telegramChatId) {
        await this.sendTelegramAlert(config.telegramChatId, alert);
      }

      console.log(`Alert sent: ${alert.type} - ${alert.title}`);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  private async sendInAppAlert(alert: TradingAlert): Promise<void> {
    const message = {
      type: 'trading_alert',
      alert: {
        ...alert,
        id: Date.now(),
        timestamp: alert.timestamp.toISOString()
      }
    };

    this.wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  private async sendEmailAlert(email: string, alert: TradingAlert): Promise<void> {
    // Email implementation would require email service like SendGrid, SES, etc.
    // For now, we'll log the email that would be sent
    console.log(`📧 EMAIL ALERT to ${email}:`);
    console.log(`Subject: ${alert.title}`);
    console.log(`Body: ${alert.message}`);
    console.log(`Severity: ${alert.severity}`);
    
    // In production, implement actual email sending:
    /*
    await emailService.send({
      to: email,
      subject: `SMC Trading Alert: ${alert.title}`,
      html: this.generateEmailTemplate(alert)
    });
    */
  }

  private async sendTelegramAlert(chatId: string, alert: TradingAlert): Promise<void> {
    // Telegram implementation would require Telegram Bot API
    // For now, we'll log the telegram message that would be sent
    console.log(`📱 TELEGRAM ALERT to ${chatId}:`);
    console.log(`${alert.emoji || '🔔'} *${alert.title}*`);
    console.log(`${alert.message}`);
    console.log(`Time: ${alert.timestamp.toLocaleString()}`);
    
    // In production, implement actual telegram sending:
    /*
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `${alert.emoji || '🔔'} *${alert.title}*\n\n${alert.message}`,
        parse_mode: 'Markdown'
      })
    });
    */
  }

  // Pre-defined alert templates
  createEntryAlert(tradeId: number, pair: string, price: number, direction: string): TradingAlert {
    return {
      type: 'ENTRY',
      title: `🎯 Trade Entry - ${pair}`,
      message: `${direction} position opened at ${price}. Trade ID: ${tradeId}`,
      severity: 'INFO',
      timestamp: new Date(),
      tradeId,
      price,
      emoji: direction === 'BUY' ? '📈' : '📉'
    };
  }

  createExitAlert(tradeId: number, pair: string, exitPrice: number, pnl: number): TradingAlert {
    const isProfit = pnl > 0;
    return {
      type: 'EXIT',
      title: `${isProfit ? '✅' : '❌'} Trade Closed - ${pair}`,
      message: `Position closed at ${exitPrice}. P&L: ${isProfit ? '+' : ''}$${pnl.toFixed(2)}`,
      severity: isProfit ? 'SUCCESS' : 'WARNING',
      timestamp: new Date(),
      tradeId,
      price: exitPrice,
      pnl,
      emoji: isProfit ? '💰' : '⚠️'
    };
  }

  createStopLossAlert(tradeId: number, pair: string, price: number, pnl: number): TradingAlert {
    return {
      type: 'STOP_LOSS',
      title: `🛑 Stop Loss Hit - ${pair}`,
      message: `Stop loss triggered at ${price}. Loss: -$${Math.abs(pnl).toFixed(2)}`,
      severity: 'ERROR',
      timestamp: new Date(),
      tradeId,
      price,
      pnl,
      emoji: '🚨'
    };
  }

  createTakeProfitAlert(tradeId: number, pair: string, price: number, pnl: number): TradingAlert {
    return {
      type: 'TAKE_PROFIT',
      title: `🎉 Take Profit Hit - ${pair}`,
      message: `Take profit reached at ${price}. Profit: +$${pnl.toFixed(2)}`,
      severity: 'SUCCESS',
      timestamp: new Date(),
      tradeId,
      price,
      pnl,
      emoji: '🎯'
    };
  }

  createStrategyStartAlert(strategyId: number, strategyName: string): TradingAlert {
    return {
      type: 'STRATEGY_START',
      title: `🚀 Strategy Started`,
      message: `"${strategyName}" is now active and monitoring markets`,
      severity: 'INFO',
      timestamp: new Date(),
      strategyId,
      emoji: '🤖'
    };
  }

  createStrategyStopAlert(strategyId: number, strategyName: string): TradingAlert {
    return {
      type: 'STRATEGY_STOP',
      title: `⏹️ Strategy Stopped`,
      message: `"${strategyName}" has been paused`,
      severity: 'INFO',
      timestamp: new Date(),
      strategyId,
      emoji: '⏸️'
    };
  }

  updateAlertConfig(userId: number, config: Partial<AlertConfig>): void {
    const existing = this.alertConfigs.get(userId) || {
      userId,
      emailEnabled: false,
      telegramEnabled: false,
      inAppEnabled: true
    };
    
    this.alertConfigs.set(userId, { ...existing, ...config });
  }

  getAlertConfig(userId: number): AlertConfig | undefined {
    return this.alertConfigs.get(userId);
  }

  private generateEmailTemplate(alert: TradingAlert): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${alert.emoji} ${alert.title}</h2>
        <p style="font-size: 16px; line-height: 1.5;">${alert.message}</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Alert Details:</strong><br>
          Type: ${alert.type}<br>
          Severity: ${alert.severity}<br>
          Time: ${alert.timestamp.toLocaleString()}<br>
          ${alert.tradeId ? `Trade ID: ${alert.tradeId}<br>` : ''}
          ${alert.price ? `Price: $${alert.price}<br>` : ''}
          ${alert.pnl ? `P&L: $${alert.pnl.toFixed(2)}<br>` : ''}
        </div>
        <p style="color: #666; font-size: 12px;">
          This is an automated alert from your SMC Trading Platform.
        </p>
      </div>
    `;
  }
}

export const alertService = new AlertService();