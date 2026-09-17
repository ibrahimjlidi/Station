import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';
import { socket } from '../lib/socket';

interface RealtimeQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  invalidateOn: string[];
}

export function useRealtimeQuery<T>({ queryKey, queryFn, invalidateOn, ...options }: RealtimeQueryOptions<T>) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const handlers = invalidateOn.map((event) => {
      const handler = () => { void queryClient.invalidateQueries({ queryKey }); };
      socket.on(event, handler);
      return { event, handler };
    });
    return () => handlers.forEach(({ event, handler }) => socket.off(event, handler));
  }, [queryClient, queryKey, invalidateOn]);
  return useQuery({ ...options, queryKey, queryFn });
}
