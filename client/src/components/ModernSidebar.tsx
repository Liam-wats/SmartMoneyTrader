import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  TrendingUp, 
  Settings, 
  Target, 
  Activity, 
  Brain,
  Home,
  PlayCircle,
  PauseCircle,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isStrategyActive: boolean;
  onToggleStrategy: () => void;
  isConnected: boolean;
}

export default function ModernSidebar({ isStrategyActive, onToggleStrategy, isConnected }: SidebarProps) {
  const [location] = useLocation();

  const navigationItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/live-trading", label: "Live Trading", icon: TrendingUp },
    { path: "/enhanced-signals", label: "Enhanced Signals", icon: Zap },
    { path: "/top-down-analysis", label: "Top-Down Analysis", icon: Target },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    { path: "/backtesting", label: "Backtesting", icon: Activity },
    { path: "/strategy-builder", label: "Strategy Builder", icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">SMC Trading</h1>
            <p className="text-sm text-muted-foreground">AI-Powered Platform</p>
          </div>
        </div>
      </div>

      {/* Strategy Status */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">Strategy Status</span>
          <Badge 
            variant={isStrategyActive ? "default" : "secondary"} 
            className={cn(
              "animate-pulse-slow",
              isStrategyActive ? "bg-green-500" : "bg-gray-500"
            )}
          >
            {isStrategyActive ? "ACTIVE" : "INACTIVE"}
          </Badge>
        </div>
        
        <Button 
          onClick={onToggleStrategy}
          className={cn(
            "w-full trading-button",
            isStrategyActive ? "trading-button-danger" : "trading-button-success"
          )}
        >
          {isStrategyActive ? (
            <>
              <PauseCircle className="w-4 h-4 mr-2" />
              Stop Strategy
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Strategy
            </>
          )}
        </Button>
      </div>

      {/* Connection Status */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <div className={cn(
                    "sidebar-nav-item",
                    isActive && "active"
                  )}>
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Zap className="w-4 h-4" />
          <span className="text-sm">Smart Money Concept</span>
        </div>
      </div>
    </div>
  );
}