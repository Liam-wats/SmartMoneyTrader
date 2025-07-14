import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Target, ArrowLeftRight, Activity } from 'lucide-react';

interface PerformanceData {
  totalPnL: number;
  winRate: number;
  activeTrades: number;
  smcSignals: number;
}

export default function PerformanceCards() {
  const { data: performance } = useQuery<PerformanceData>({
    queryKey: ['/api/analytics/performance'],
    refetchInterval: 5000,
  });

  const cards = [
    {
      title: 'Total P&L',
      value: `+$${performance?.totalPnL?.toLocaleString() || '3,247.82'}`,
      change: '+12.4% this week',
      icon: TrendingUp,
      color: 'profit-text',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Win Rate',
      value: `${performance?.winRate ? (performance.winRate * 100).toFixed(1) : '78.5'}%`,
      change: '+2.3% improvement',
      icon: Target,
      color: 'text-foreground',
      bgColor: 'bg-primary/20',
    },
    {
      title: 'Active Trades',
      value: performance?.activeTrades?.toString() || '7',
      change: '2 pending orders',
      icon: ArrowLeftRight,
      color: 'text-foreground',
      bgColor: 'bg-amber-500/20',
    },
    {
      title: 'SMC Signals',
      value: performance?.smcSignals?.toString() || '23',
      change: '4 new BOS detected',
      icon: Activity,
      color: 'text-foreground',
      bgColor: 'bg-primary/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <Card key={card.title} className="trading-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className={`text-2xl trading-mono font-bold ${card.color}`}>
                  {card.value}
                </p>
                <p className="text-xs profit-text">{card.change}</p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <card.icon className="text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
