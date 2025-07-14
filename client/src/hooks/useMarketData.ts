import { useQuery } from '@tanstack/react-query';
import { MarketData } from '../types/trading';

export function useMarketData(pair: string, timeframe: string = '1h', limit: number = 100) {
  return useQuery<MarketData[]>({
    queryKey: ['/api/market-data', pair, timeframe, limit],
    enabled: !!pair,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function usePrice(pair: string) {
  return useQuery<{ price: number }>({
    queryKey: ['/api/market-data', pair, 'price'],
    enabled: !!pair,
    refetchInterval: 1000, // Refetch every second
  });
}
