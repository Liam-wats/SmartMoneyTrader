import TelegramBot from 'node-telegram-bot-api';
import { TradingSignal } from './technicalAnalysis';

export class TelegramNotificationService {
  private bot: TelegramBot | null = null;
  private chatId: string | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    console.log('Telegram env check:', { 
      hasToken: !!token, 
      hasChatId: !!chatId,
      tokenStart: token ? token.substring(0, 10) + '...' : 'undefined',
      chatId: chatId || 'undefined'
    });

    if (token && chatId) {
      try {
        this.bot = new TelegramBot(token, { polling: false });
        this.chatId = chatId;
        this.isEnabled = true;
        console.log('✅ Telegram notification service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Telegram bot:', error);
        this.isEnabled = false;
      }
    } else {
      console.log('❌ Telegram bot token or chat ID not configured');
      this.isEnabled = false;
    }
  }

  async sendTradingSignal(signal: TradingSignal, message: string): Promise<boolean> {
    if (!this.isEnabled || !this.bot || !this.chatId) {
      console.log('Telegram notification service not enabled or configured');
      return false;
    }

    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      
      console.log(`Telegram notification sent for ${signal.pair} ${signal.direction} signal`);
      return true;
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      return false;
    }
  }

  async sendAlert(message: string): Promise<boolean> {
    console.log('Attempting to send Telegram alert:', { 
      isEnabled: this.isEnabled, 
      hasBot: !!this.bot, 
      hasChatId: !!this.chatId,
      message: message.substring(0, 50) + '...'
    });

    if (!this.isEnabled || !this.bot || !this.chatId) {
      console.log('Telegram not properly configured');
      return false;
    }

    try {
      const result = await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      
      console.log('✅ Telegram alert sent successfully:', result.message_id);
      return true;
    } catch (error) {
      console.error('Failed to send Telegram alert:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.bot) {
      return false;
    }

    try {
      const me = await this.bot.getMe();
      console.log('Telegram bot connection test successful:', me.username);
      return true;
    } catch (error) {
      console.error('Telegram bot connection test failed:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }
}