import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SMCSignal } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

export default function SMCSignals() {
  const { data: signals, isLoading } = useQuery<SMCSignal[]>({
    queryKey: ['/api/smc-signals'],
    refetchInterval: 5000,
  });

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'BOS':
        return 'bg-green-500/20 text-green-400';
      case 'FVG':
        return 'bg-blue-500/20 text-blue-400';
      case 'OB':
        return 'bg-purple-500/20 text-purple-400';
      case 'LS':
        return 'bg-amber-500/20 text-amber-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPatternName = (pattern: string) => {
    switch (pattern) {
      case 'BOS':
        return 'Break of Structure';
      case 'FVG':
        return 'Fair Value Gap';
      case 'OB':
        return 'Order Block';
      case 'LS':
        return 'Liquidity Sweep';
      default:
        return pattern;
    }
  };

  if (isLoading) {
    return (
      <Card className="trading-card">
        <CardHeader>
          <CardTitle>SMC Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 bg-muted/30 rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="trading-card">
      <CardHeader>
        <CardTitle>SMC Signals</CardTitle>
        <p className="text-sm text-muted-foreground">Real-time pattern detection</p>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {signals?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent signals</p>
            </div>
          ) : (
            signals?.map((signal) => (
              <div key={signal.id} className="p-3 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getPatternColor(signal.pattern)}>
                    {getPatternName(signal.pattern)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(signal.createdAt!), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {signal.pair} • {signal.price.toFixed(4)} • {signal.timeframe}
                  </div>
                  <div className="text-xs text-primary">
                    {signal.description}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={signal.direction === 'BULLISH' ? 'default' : 'secondary'}>
                      {signal.direction}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {(signal.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
