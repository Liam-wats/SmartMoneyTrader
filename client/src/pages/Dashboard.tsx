import { useState } from 'react';
import ModernSidebar from '@/components/ModernSidebar';
import ModernTradingChart from '@/components/ModernTradingChart';
import ModernPerformanceCards from '@/components/ModernPerformanceCards';
import ModernSMCSignals from '@/components/ModernSMCSignals';
import ActiveTrades from '@/components/ActiveTrades';
import StrategySettings from '@/components/StrategySettings';
import PerformanceAnalytics from '@/components/PerformanceAnalytics';
import TopDownAnalysis from '@/components/TopDownAnalysis';
import MLPatternRecognition from '@/components/MLPatternRecognition';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Play, Pause, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertNotifications } from '@/components/AlertNotifications';

export default function Dashboard() {
  const [isStrategyActive, setIsStrategyActive] = useState(false);
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const { toast } = useToast();
  
  const { isConnected, subscribe, send } = useWebSocket('/ws');

  // Subscribe to trading signals
  subscribe('trading_signal', (data) => {
    toast({
      title: "🚨 Trading Signal",
      description: `${data.signal.type} signal for ${data.signal.pair} at ${data.signal.price}`,
    });
  });

  // Subscribe to SMC signals
  subscribe('new_smc_signal', (data) => {
    toast({
      title: "🔍 SMC Pattern Detected",
      description: `${data.signal.pattern} pattern on ${data.signal.pair}`,
    });
  });

  // Subscribe to strategy events
  subscribe('strategy_started', (data) => {
    setIsStrategyActive(true);
  });

  subscribe('strategy_stopped', (data) => {
    setIsStrategyActive(false);
  });

  // Subscribe to trade events for alerts
  subscribe('trade_opened', (data) => {
    toast({
      title: "📈 Trade Opened",
      description: `${data.trade.type} ${data.trade.pair} at ${data.trade.entryPrice}`,
    });
  });

  subscribe('trade_closed', (data) => {
    const pnlEmoji = data.trade.pnl >= 0 ? '💰' : '📉';
    toast({
      title: `${pnlEmoji} Trade Closed`,
      description: `P&L: $${data.trade.pnl?.toFixed(2)} | Exit: ${data.trade.exitPrice}`,
    });
  });

  subscribe('stop_loss_hit', (data) => {
    toast({
      title: "🛑 Stop Loss Hit",
      description: `${data.trade.pair} stopped at ${data.trade.exitPrice}`,
      variant: "destructive",
    });
  });

  subscribe('take_profit_hit', (data) => {
    toast({
      title: "🎯 Take Profit Hit",
      description: `${data.trade.pair} target reached at ${data.trade.exitPrice}`,
    });
  });

  const handleStartStrategy = async () => {
    try {
      const response = await fetch('/api/strategy/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId: 1 }),
      });
      
      if (!response.ok) throw new Error('Failed to start strategy');
      
      setIsStrategyActive(true);
      toast({
        title: "Strategy Started",
        description: "Algorithmic trading strategy is now active",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start trading strategy",
        variant: "destructive",
      });
    }
  };

  const handleStopStrategy = async () => {
    try {
      const response = await fetch('/api/strategy/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to stop strategy');
      
      setIsStrategyActive(false);
      toast({
        title: "Strategy Stopped",
        description: "Algorithmic trading strategy has been paused",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop trading strategy",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <ModernSidebar 
        isStrategyActive={isStrategyActive}
        onToggleStrategy={isStrategyActive ? handleStopStrategy : handleStartStrategy}
        isConnected={isConnected}
      />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-secondary border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Trading Dashboard</h2>
                <p className="text-sm text-muted-foreground">Smart Money Concept Analysis</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Markets Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={handleStartStrategy}
                disabled={isStrategyActive}
                className="trading-button-success"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Strategy
              </Button>
              
              <Button
                onClick={handleStopStrategy}
                disabled={!isStrategyActive}
                variant="secondary"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause All
              </Button>
              
              <AlertNotifications />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="dashboard-grid">
            <div className="dashboard-main">
              <ModernPerformanceCards />
              <ModernTradingChart 
                pair={selectedPair}
                timeframe={selectedTimeframe}
                onPairChange={setSelectedPair}
                onTimeframeChange={setSelectedTimeframe}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopDownAnalysis pair={selectedPair} />
                <MLPatternRecognition pair={selectedPair} timeframe={selectedTimeframe} />
              </div>
              <PerformanceAnalytics />
            </div>
            
            <div className="dashboard-sidebar">
              <ModernSMCSignals />
              <ActiveTrades />
              <StrategySettings />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
