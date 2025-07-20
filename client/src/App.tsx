import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import Backtesting from "@/pages/Backtesting";
import LiveTrading from "@/pages/LiveTrading";
import TopDownAnalysis from "@/pages/TopDownAnalysis";
import StrategyBuilder from "@/pages/StrategyBuilder";
import Analytics from "@/pages/Analytics";
import EnhancedSignals from "@/pages/EnhancedSignals";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/backtesting" component={Backtesting} />
      <Route path="/live-trading" component={LiveTrading} />
      <Route path="/top-down-analysis" component={TopDownAnalysis} />
      <Route path="/strategy-builder" component={StrategyBuilder} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/enhanced-signals" component={EnhancedSignals} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground flex">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
