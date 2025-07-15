export interface MarketSession {
  name: string;
  open: number; // Hour in UTC
  close: number; // Hour in UTC
  timezone: string;
}

export interface MarketHours {
  isOpen: boolean;
  currentSession: string | null;
  nextOpen: Date | null;
  nextClose: Date | null;
}

export class MarketHoursService {
  private sessions: MarketSession[] = [
    { name: 'SYDNEY', open: 22, close: 6, timezone: 'Australia/Sydney' },
    { name: 'TOKYO', open: 23, close: 8, timezone: 'Asia/Tokyo' },
    { name: 'LONDON', open: 8, close: 16, timezone: 'Europe/London' },
    { name: 'NEW_YORK', open: 13, close: 22, timezone: 'America/New_York' }
  ];

  getMarketStatus(): MarketHours {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    
    // Check if it's weekend
    if (utcDay === 0 || utcDay === 6) {
      return {
        isOpen: false,
        currentSession: null,
        nextOpen: this.getNextMondayOpen(),
        nextClose: null
      };
    }

    // Check each session
    for (const session of this.sessions) {
      if (this.isSessionOpen(session, utcHour)) {
        return {
          isOpen: true,
          currentSession: session.name,
          nextOpen: null,
          nextClose: this.getNextClose(session, now)
        };
      }
    }

    return {
      isOpen: false,
      currentSession: null,
      nextOpen: this.getNextOpen(now),
      nextClose: null
    };
  }

  private isSessionOpen(session: MarketSession, utcHour: number): boolean {
    if (session.open < session.close) {
      // Same day session (e.g., London: 8-16)
      return utcHour >= session.open && utcHour < session.close;
    } else {
      // Overnight session (e.g., Sydney: 22-6)
      return utcHour >= session.open || utcHour < session.close;
    }
  }

  private getNextOpen(now: Date): Date {
    const nextOpen = new Date(now);
    
    // Find next session that will open
    for (let i = 0; i < 48; i++) { // Check next 48 hours
      const checkTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const checkHour = checkTime.getUTCHours();
      const checkDay = checkTime.getUTCDay();
      
      // Skip weekends
      if (checkDay === 0 || checkDay === 6) continue;
      
      for (const session of this.sessions) {
        if (checkHour === session.open) {
          return checkTime;
        }
      }
    }
    
    return this.getNextMondayOpen();
  }

  private getNextClose(session: MarketSession, now: Date): Date {
    const nextClose = new Date(now);
    
    if (session.open < session.close) {
      // Same day session
      nextClose.setUTCHours(session.close, 0, 0, 0);
    } else {
      // Overnight session
      const currentHour = now.getUTCHours();
      if (currentHour >= session.open) {
        // Will close tomorrow
        nextClose.setUTCDate(nextClose.getUTCDate() + 1);
      }
      nextClose.setUTCHours(session.close, 0, 0, 0);
    }
    
    return nextClose;
  }

  private getNextMondayOpen(): Date {
    const now = new Date();
    const daysUntilMonday = (1 + 7 - now.getUTCDay()) % 7 || 7;
    const nextMonday = new Date(now.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
    
    // Sydney opens first at 22:00 UTC Sunday (which is Monday in Sydney)
    nextMonday.setUTCHours(22, 0, 0, 0);
    nextMonday.setUTCDate(nextMonday.getUTCDate() - 1); // Go back to Sunday
    
    return nextMonday;
  }

  shouldProcessSignals(): boolean {
    return this.getMarketStatus().isOpen;
  }

  getCurrentSession(): string | null {
    return this.getMarketStatus().currentSession;
  }
}

export const marketHoursService = new MarketHoursService();