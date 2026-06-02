/**
 * useAPI Hook
 * Custom hook for making API calls with loading and error state management
 */

import { useCallback, useRef, useState } from 'react';
import {
    APIRequestOptions,
    APIResponse,
    makeRequest,
} from '../services/api/client';

/**
 * useAPI hook state
 */
export interface UseAPIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * useAPI hook return type
 */
export interface UseAPIReturn<T> extends UseAPIState<T> {
  execute: (endpoint: string, options?: APIRequestOptions) => Promise<APIResponse<T>>;
  reset: () => void;
  setData: (data: T | null) => void;
}

/**
 * Custom hook for API calls with state management
 * @param initialData - Initial data value
 * @returns Object with data, loading, error, and execute function
 *
 * @example
 * const { data, loading, error, execute } = useAPI<User>(null);
 *
 * const fetchUser = async () => {
 *   await execute('/users/profile');
 * };
 */
export const useAPI = <T = any>(initialData: T | null = null): UseAPIReturn<T> => {
  const [state, setState] = useState<UseAPIState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (endpoint: string, options?: APIRequestOptions): Promise<APIResponse<T>> => {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setState({ data: state.data, loading: true, error: null });

      try {
        const response = await makeRequest<T>(endpoint, options);

        if (response.success && response.data) {
          setState({ data: response.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: response.error || 'Unknown error' });
        }

        return response;
      } catch (error: any) {
        const errorMessage = error.message || 'An error occurred';
        setState({ data: null, loading: false, error: errorMessage });

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [state.data]
  );

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
};

/**
 * usePaginatedAPI Hook
 * Hook for paginated API calls
 */
export interface UsePaginatedAPIState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  total: number;
}

export interface UsePaginatedAPIReturn<T> extends UsePaginatedAPIState<T> {
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export const usePaginatedAPI = <T = any>(
  endpoint: (page: number, limit: number) => string,
  limit: number = 20
): UsePaginatedAPIReturn<T> => {
  const [state, setState] = useState<UsePaginatedAPIState<T>>({
    items: [],
    loading: false,
    error: null,
    page: 0,
    hasMore: true,
    total: 0,
  });

  const fetchMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await makeRequest<{ items: T[]; total: number }>(
        endpoint(state.page + 1, limit)
      );

      if (response.success && response.data) {
        const newItems = response.data.items || [];
        setState((prev) => ({
          ...prev,
          items: [...prev.items, ...newItems],
          page: prev.page + 1,
          total: response.data?.total || prev.total,
          hasMore: (prev.page + 1) * limit < (response.data?.total || 0),
          loading: false,
          error: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to fetch',
        }));
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'An error occurred',
      }));
    }
  }, [state.page, state.loading, state.hasMore, endpoint, limit]);

  const refresh = useCallback(async () => {
    setState({
      items: [],
      loading: false,
      error: null,
      page: 0,
      hasMore: true,
      total: 0,
    });

    try {
      const response = await makeRequest<{ items: T[]; total: number }>(
        endpoint(0, limit)
      );

      if (response.success && response.data) {
        const newItems = response.data.items || [];
        setState({
          items: newItems,
          page: 0,
          total: response.data.total || 0,
          hasMore: limit < (response.data.total || 0),
          loading: false,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to fetch',
        }));
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'An error occurred',
      }));
    }
  }, [endpoint, limit]);

  const reset = useCallback(() => {
    setState({
      items: [],
      loading: false,
      error: null,
      page: 0,
      hasMore: true,
      total: 0,
    });
  }, []);

  return {
    ...state,
    fetchMore,
    refresh,
    reset,
  };
};
