import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap,
  Activity,
  Clock,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SMCSignal {
  id: number;
  pair: string;
  timeframe: string;
  pattern: string;
  direction: string;
  price: number;
  confidence: number;
  description: string;
  createdAt: string;
}

export default function ModernSMCSignals() {
  const { data: signals = [], isLoading, refetch } = useQuery<SMCSignal[]>({
    queryKey: ["/api/smc-signals"],
    refetchInterval: 5000,
  });

  const getPatternIcon = (pattern: string) => {
    switch (pattern) {
      case "BOS": return Target;
      case "CHoCH": return Activity;
      case "FVG": return TrendingUp;
      case "OB": return Zap;
      case "LS": return AlertTriangle;
      default: return Activity;
    }
  };

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case "BOS": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "CHoCH": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "FVG": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "OB": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "LS": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === "BULLISH" ? TrendingUp : TrendingDown;
  };

  const getDirectionColor = (direction: string) => {
    return direction === "BULLISH" ? "text-green-400" : "text-red-400";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const recentSignals = signals.slice(0, 10);

  if (isLoading) {
    return (
      <Card className="trading-card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>SMC Signals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="trading-card-elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>SMC Signals</span>
            <Badge variant="secondary">{signals.length}</Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
          >
            <Activity className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {recentSignals.length > 0 ? (
              recentSignals.map((signal) => {
                const PatternIcon = getPatternIcon(signal.pattern);
                const DirectionIcon = getDirectionIcon(signal.direction);
                
                return (
                  <div
                    key={signal.id}
                    className="flex items-center space-x-4 p-3 bg-card/50 rounded-lg border border-border/50 hover:bg-card/80 transition-colors"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center border",
                      getPatternColor(signal.pattern)
                    )}>
                      <PatternIcon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-foreground">
                          {signal.pair}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {signal.timeframe}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getPatternColor(signal.pattern))}
                        >
                          {signal.pattern}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-1">
                        <DirectionIcon className={cn("w-4 h-4", getDirectionColor(signal.direction))} />
                        <span className={cn("text-sm font-medium", getDirectionColor(signal.direction))}>
                          {signal.direction}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          @{signal.price.toFixed(5)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground truncate">
                        {signal.description}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      <div className="flex items-center space-x-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          getConfidenceColor(signal.confidence * 100)
                        )}></div>
                        <span className={cn(
                          "text-xs font-medium",
                          getConfidenceColor(signal.confidence * 100)
                        )}>
                          {(signal.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(signal.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No signals detected yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The system is analyzing market patterns...
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}