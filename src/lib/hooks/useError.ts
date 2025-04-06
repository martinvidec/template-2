"use client";

import { useErrorContext } from '@/lib/contexts/ErrorContext';

/**
 * Custom hook to easily access the error reporting function.
 */
export const useError = () => {
  const { reportError } = useErrorContext();
  return { reportError };
}; 