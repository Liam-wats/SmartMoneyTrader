import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TradingChart from '@/components/TradingChart';
import PerformanceCards from '@/components/PerformanceCards';
import SMCSignals from '@/components/SMCSignals';
import ActiveTrades from '@/components/ActiveTrades';
import StrategySettings from '@/components/StrategySettings';
import PerformanceAnalytics from '@/components/PerformanceAnalytics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Play, Pause, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [isStrategyActive, setIsStrategyActive] = useState(false);
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const { toast } = useToast();
  
  const { isConnected, subscribe, send } = useWebSocket('/ws');

  // Subscribe to trading signals
  subscribe('trading_signal', (data) => {
    toast({
      title: "Trading Signal",
      description: `${data.signal.type} signal for ${data.signal.pair}`,
    });
  });

  // Subscribe to SMC signals
  subscribe('new_smc_signal', (data) => {
    toast({
      title: "SMC Pattern Detected",
      description: `${data.signal.pattern} pattern on ${data.signal.pair}`,
    });
  });

  const handleStartStrategy = () => {
    setIsStrategyActive(true);
    toast({
      title: "Strategy Started",
      description: "Algorithmic trading strategy is now active",
    });
  };

  const handleStopStrategy = () => {
    setIsStrategyActive(false);
    toast({
      title: "Strategy Stopped",
      description: "Algorithmic trading strategy has been paused",
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
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
              
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 space-y-6">
          <PerformanceCards />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TradingChart 
                pair={selectedPair}
                timeframe={selectedTimeframe}
                onPairChange={setSelectedPair}
                onTimeframeChange={setSelectedTimeframe}
              />
            </div>
            
            <SMCSignals />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActiveTrades />
            <StrategySettings />
          </div>
          
          <PerformanceAnalytics />
        </main>
      </div>
    </div>
  );
}
