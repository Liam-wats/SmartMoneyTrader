import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  BarChart3, 
  Bot, 
  History, 
  ArrowLeftRight, 
  TrendingUp, 
  Settings,
  Activity
} from 'lucide-react';
import { User } from '@shared/schema';

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  const navigationItems = [
    { icon: BarChart3, label: 'Dashboard', href: '/' },
    { icon: Bot, label: 'Strategy Builder', href: '/strategy-builder' },
    { icon: History, label: 'Backtesting', href: '/backtesting' },
    { icon: ArrowLeftRight, label: 'Live Trading', href: '/live-trading' },
    { icon: TrendingUp, label: 'Analytics', href: '/analytics' },
  ];

  return (
    <div className="w-64 bg-secondary border-r border-border flex flex-col">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
            <Activity className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">SMC Trader</h1>
            <p className="text-xs text-muted-foreground">Professional Edition</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <button
            key={item.label}
            onClick={() => setLocation(item.href)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              location === item.href
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Account Status */}
      <div className="p-4 border-t border-border">
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Account Balance</span>
            <span className="text-xs profit-text">Live</span>
          </div>
          <div className="text-lg trading-mono font-semibold text-foreground">
            ${user?.balance?.toLocaleString() || '10,000.00'}
          </div>
          <div className="text-xs profit-text">+$247.33 (2.5%)</div>
        </div>
      </div>
    </div>
  );
}
