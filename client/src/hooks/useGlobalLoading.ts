import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLoading } from '@/contexts/LoadingContext';

export const useGlobalLoading = () => {
  const { setDataLoading } = useLoading();
  const queryClient = useQueryClient();
  const stuckQueryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' || event.type === 'added' || event.type === 'removed') {
        const queries = queryClient.getQueryCache().getAll();
        
        // Only consider queries that are actually pending (not failed or successful)
        const pendingQueries = queries.filter(query => 
          query.state.status === 'pending' && 
          !query.state.error && 
          query.state.fetchStatus !== 'idle'
        );
        
        const isLoading = pendingQueries.length > 0;
        
        // Clear any existing stuck query timeout
        if (stuckQueryTimeoutRef.current) {
          clearTimeout(stuckQueryTimeoutRef.current);
        }
        
        if (isLoading) {
          console.log('🔍 Loading detected - Pending queries:', pendingQueries.map(q => q.queryKey));
          
          // Set a timeout to force clear stuck queries after 5 seconds
          stuckQueryTimeoutRef.current = setTimeout(() => {
            console.log('⚠️ Force clearing stuck queries after 5 seconds');
            setDataLoading(false);
          }, 5000);
        } else {
          console.log('✅ No pending queries - Clearing loading state');
          setDataLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
      if (stuckQueryTimeoutRef.current) {
        clearTimeout(stuckQueryTimeoutRef.current);
      }
    };
  }, [queryClient, setDataLoading]);
};
