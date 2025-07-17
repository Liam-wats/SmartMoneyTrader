import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  Target,
  BarChart3,
  Users,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PerformanceMetric {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  currentDrawdown: number;
  maxDrawdown: number;
  sharpeRatio: number;
  riskRewardRatio: number;
  expectancy: number;
}

export default function ModernPerformanceCards() {
  const { data: performance, isLoading } = useQuery<PerformanceMetric>({
    queryKey: ["/api/analytics/performance"],
    refetchInterval: 5000,
  });

  if (isLoading || !performance) {
    return (
      <div className="performance-grid">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="trading-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-4"></div>
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const netPnL = (performance.totalProfit || 0) - Math.abs(performance.totalLoss || 0);
  const isProfitable = netPnL > 0;

  const cards = [
    {
      title: "Net P&L",
      value: `$${netPnL.toFixed(2)}`,
      icon: DollarSign,
      color: isProfitable ? "text-green-400" : "text-red-400",
      bgColor: isProfitable ? "bg-green-500 bg-opacity-10" : "bg-red-500 bg-opacity-10",
      change: isProfitable ? "+12.5%" : "-8.3%",
      changeColor: isProfitable ? "text-green-400" : "text-red-400"
    },
    {
      title: "Win Rate",
      value: `${(performance.winRate || 0).toFixed(1)}%`,
      icon: Target,
      color: (performance.winRate || 0) >= 50 ? "text-green-400" : "text-yellow-400",
      bgColor: (performance.winRate || 0) >= 50 ? "bg-green-500 bg-opacity-10" : "bg-yellow-500 bg-opacity-10",
      progress: performance.winRate || 0,
      subtitle: `${performance.winningTrades || 0}/${performance.totalTrades || 0} trades`
    },
    {
      title: "Total Trades",
      value: (performance.totalTrades || 0).toString(),
      icon: Activity,
      color: "text-blue-400",
      bgColor: "bg-blue-500 bg-opacity-10",
      subtitle: "All time"
    },
    {
      title: "Profit Factor",
      value: (performance.profitFactor || 0).toFixed(2),
      icon: BarChart3,
      color: (performance.profitFactor || 0) >= 1.5 ? "text-green-400" : "text-yellow-400",
      bgColor: (performance.profitFactor || 0) >= 1.5 ? "bg-green-500 bg-opacity-10" : "bg-yellow-500 bg-opacity-10",
      subtitle: "Risk/Reward efficiency"
    },
    {
      title: "Average Win",
      value: `$${(performance.averageWin || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-500 bg-opacity-10",
      subtitle: "Per winning trade"
    },
    {
      title: "Average Loss", 
      value: `$${Math.abs(performance.averageLoss || 0).toFixed(2)}`,
      icon: TrendingDown,
      color: "text-red-400",
      bgColor: "bg-red-500 bg-opacity-10",
      subtitle: "Per losing trade"
    },
    {
      title: "Max Drawdown",
      value: `${(performance.maxDrawdown || 0).toFixed(1)}%`,
      icon: TrendingDown,
      color: "text-red-400",
      bgColor: "bg-red-500 bg-opacity-10",
      subtitle: "Worst decline"
    },
    {
      title: "Sharpe Ratio",
      value: (performance.sharpeRatio || 0).toFixed(2),
      icon: BarChart3,
      color: (performance.sharpeRatio || 0) >= 1 ? "text-green-400" : "text-yellow-400",
      bgColor: (performance.sharpeRatio || 0) >= 1 ? "bg-green-500 bg-opacity-10" : "bg-yellow-500 bg-opacity-10",
      subtitle: "Risk-adjusted return"
    }
  ];

  return (
    <div className="performance-grid">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="trading-card-elevated hover:scale-105 transition-transform">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </div>
                  {card.subtitle && (
                    <p className="text-xs text-muted-foreground">
                      {card.subtitle}
                    </p>
                  )}
                </div>
                {card.change && (
                  <Badge 
                    variant="outline" 
                    className={`${card.changeColor} border-current`}
                  >
                    {card.change}
                  </Badge>
                )}
              </div>
              {card.progress !== undefined && (
                <div className="mt-4">
                  <Progress value={card.progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}