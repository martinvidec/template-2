"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import ErrorDialog from '@/components/ErrorDialog'; // We will create this next

interface ErrorState {
  error: Error | null;
  contextInfo?: Record<string, any> | string; // Optional context info (e.g., component name, operation)
}

interface ErrorContextType extends ErrorState {
  reportError: (error: Error, contextInfo?: Record<string, any> | string) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider = ({ children }: { children: ReactNode }) => {
  const [errorState, setErrorState] = useState<ErrorState>({ error: null, contextInfo: undefined });

  const reportError = useCallback((error: Error, contextInfo?: Record<string, any> | string) => {
    console.error("Error reported:", error, "Context:", contextInfo); // Log for developers
    setErrorState({ error, contextInfo });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({ error: null, contextInfo: undefined });
  }, []);

  const contextValue: ErrorContextType = {
    ...errorState,
    reportError,
    clearError,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
      {errorState.error && (
        <ErrorDialog
          error={errorState.error}
          contextInfo={errorState.contextInfo}
          onClose={clearError}
        />
      )}
    </ErrorContext.Provider>
  );
};

export const useErrorContext = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
}; 