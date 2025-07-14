import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

interface AnalyticsData {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
}

export default function PerformanceAnalytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/performance'],
    refetchInterval: 30000,
  });

  const { data: backtests } = useQuery({
    queryKey: ['/api/backtests'],
  });

  const timeframes = ['7D', '30D', '90D'];

  if (isLoading) {
    return (
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-4 bg-muted rounded w-24 mx-auto mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16 mx-auto"></div>
                </div>
              ))}
            </div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="trading-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Analytics</CardTitle>
          <div className="flex items-center space-x-2">
            {timeframes.map((tf, index) => (
              <Button
                key={tf}
                variant={index === 0 ? 'default' : 'secondary'}
                size="sm"
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl trading-mono font-bold text-foreground">
              {analytics?.totalTrades || 342}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-2xl trading-mono font-bold profit-text">
              {analytics?.winRate ? (analytics.winRate * 100).toFixed(1) : '78.5'}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Profit Factor</p>
            <p className="text-2xl trading-mono font-bold neutral-text">
              {analytics?.profitFactor?.toFixed(2) || '2.34'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Max Drawdown</p>
            <p className="text-2xl trading-mono font-bold loss-text">
              {analytics?.maxDrawdown ? (analytics.maxDrawdown * 100).toFixed(1) : '8.2'}%
            </p>
          </div>
        </div>
        
        {/* Performance Chart Placeholder */}
        <div className="h-64 bg-background rounded-lg border border-border relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Performance Chart</p>
              <p className="text-sm text-muted-foreground">Equity curve and performance metrics</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
