import { createContext, useContext, type ReactNode } from 'react';

export interface OptimisticQueryProviderProps {
  /** Default error handler called when no local onError is provided */
  onError?: (error: Error) => void;
  children: ReactNode;
}

interface OptimisticQueryContextValue {
  onError?: (error: Error) => void;
}

const OptimisticQueryContext = createContext<OptimisticQueryContextValue>({});

export function OptimisticQueryProvider({ onError, children }: OptimisticQueryProviderProps) {
  return (
    <OptimisticQueryContext.Provider value={{ onError }}>
      {children}
    </OptimisticQueryContext.Provider>
  );
}

export function useOptimisticQueryContext(): OptimisticQueryContextValue {
  return useContext(OptimisticQueryContext);
}
