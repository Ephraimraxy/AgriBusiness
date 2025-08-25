import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import CSSFarmsLoader from '@/components/ui/css-farms-loader';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  setPageLoading: (loading: boolean) => void;
  setDataLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [location] = useLocation();

  // Combine all loading states
  const combinedLoading = isLoading || pageLoading || dataLoading;

  // Handle page transitions
  useEffect(() => {
    setPageLoading(true);
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 500); // Show loader for at least 500ms during page transitions

    return () => clearTimeout(timer);
  }, [location]);

  // Fallback: Clear data loading after 8 seconds to prevent stuck overlay
  useEffect(() => {
    if (dataLoading) {
      const fallbackTimer = setTimeout(() => {
        console.log('⚠️ Fallback: Clearing data loading state after 6 seconds');
        setDataLoading(false);
      }, 6000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [dataLoading]);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const setPageLoadingState = (loading: boolean) => {
    setPageLoading(loading);
  };

  const setDataLoadingState = (loading: boolean) => {
    setDataLoading(loading);
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading: combinedLoading,
        setLoading,
        setPageLoading: setPageLoadingState,
        setDataLoading: setDataLoadingState,
      }}
    >
      {children}
      
      {/* Global Loading Overlay */}
      {combinedLoading && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4">
            <CSSFarmsLoader size="lg" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Please wait while we prepare your content</p>
            </div>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};
