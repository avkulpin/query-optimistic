import { useEffect, useMemo, useCallback } from 'react';
import {
  useQuery as useTanstackQuery,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import type {
  CollectionDef,
  EntityDef,
  Optimistic,
  QueryOptions,
  PaginatedOptions,
} from '../core/types';
import { registry } from '../core/registry';

/** Options for useQuery hook */
export interface UseQueryHookOptions<TParams> extends QueryOptions {
  /** Parameters to pass to the fetch function */
  params?: TParams;
  /** Enable pagination mode (infinite query) */
  paginated?: boolean;
  /** For paginated: get params for each page */
  getPageParams?: (context: { pageParam: number }) => TParams;
  /** Custom query key (defaults to [def.name, params]) */
  queryKey?: readonly unknown[];
}

/** Query state object (second element of tuple) */
export interface QueryState {
  /** True when fetching for the first time (no data yet) */
  isLoading: boolean;
  /** True when any fetch is in progress (including background refetches) */
  isFetching: boolean;
  /** True when the query has successfully fetched data */
  isSuccess: boolean;
  /** True when the query has encountered an error */
  isError: boolean;
  /** Alias for isLoading (TanStack Query v5 naming) */
  isPending: boolean;
  /** The current status: 'pending' | 'error' | 'success' */
  status: 'pending' | 'error' | 'success';
  /** The error object if isError is true */
  error: Error | null;
  /** Timestamp of when the data was last updated */
  dataUpdatedAt: number;
  /** Timestamp of when the error was last updated */
  errorUpdatedAt: number;
  /** Number of times the query has failed */
  failureCount: number;
  /** True if data is considered stale */
  isStale: boolean;
  /** True if data is from the cache (placeholder while fetching) */
  isPlaceholderData: boolean;
  /** Manually refetch the query */
  refetch: () => void;
}

/** Pagination state object (third element of paginated tuple) */
export interface PaginationState {
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}

/** Return type for collection queries: [data, queryState] */
export type QueryResult<T> = [
  Optimistic<T>[] | undefined,
  QueryState
];

/** Return type for paginated queries: [data, queryState, paginationState] */
export type PaginatedQueryResult<T> = [
  Optimistic<T>[] | undefined,
  QueryState,
  PaginationState
];

/** Return type for entity queries: [data, queryState] */
export type EntityResult<T> = [
  Optimistic<T> | undefined,
  QueryState
];

/**
 * Unified query hook for fetching data
 *
 * @example
 * // Simple collection query
 * const [data, query] = useQuery(postsQuery, { params: { limit: 10 } })
 *
 * @example
 * // Paginated query
 * const [data, query, pagination] = useQuery(postsQuery, {
 *   paginated: true,
 *   getPageParams: ({ pageParam }) => ({ page: pageParam, limit: 10 })
 * })
 * // pagination.fetchNextPage(), pagination.hasNextPage
 *
 * @example
 * // Entity query
 * const [user, query] = useQuery(userEntity, { params: userId })
 */
export function useQuery<TData, TParams>(
  def: CollectionDef<TData, TParams>,
  options?: UseQueryHookOptions<TParams> & { paginated: true }
): PaginatedQueryResult<TData>;

export function useQuery<TData, TParams>(
  def: CollectionDef<TData, TParams>,
  options?: UseQueryHookOptions<TParams>
): QueryResult<TData>;

export function useQuery<TData, TParams>(
  def: EntityDef<TData, TParams>,
  options?: UseQueryHookOptions<TParams>
): EntityResult<TData>;

export function useQuery<TData, TParams>(
  def: CollectionDef<TData, TParams> | EntityDef<TData, TParams>,
  options?: UseQueryHookOptions<TParams>
): QueryResult<TData> | PaginatedQueryResult<TData> | EntityResult<TData> {
  const queryClient = useQueryClient();
  const { params, paginated, getPageParams, queryKey: customQueryKey, ...queryOptions } = options ?? {};

  // Build query key
  const queryKey = useMemo(
    () => customQueryKey ?? [def.name, params].filter(Boolean),
    [customQueryKey, def.name, params]
  );

  // Entity query
  if (def._type === 'entity') {
    const entityDef = def as EntityDef<TData, TParams>;
    const query = useTanstackQuery({
      queryKey,
      queryFn: () => entityDef.fetch(params as TParams),
      enabled: queryOptions.enabled,
      staleTime: queryOptions.staleTime,
      gcTime: queryOptions.cacheTime,
      refetchOnMount: queryOptions.refetchOnMount,
      refetchOnWindowFocus: queryOptions.refetchOnWindowFocus,
      refetchInterval: queryOptions.refetchInterval,
    });

    // Register for optimistic updates
    useEffect(() => {
      if (query.status !== 'success' || !query.data) return;

      const entry = {
        kind: 'entity' as const,
        name: def.name,
        queryKey,
        def: entityDef,
        getData: () => queryClient.getQueryData<TData>(queryKey),
        setData: (updater: (prev: TData | undefined) => TData | undefined) =>
          queryClient.setQueryData<TData>(queryKey, updater),
      };

      registry.register(entry);
      return () => registry.unregister(entry);
    }, [def.name, queryKey, query.status, query.data, queryClient]);

    return [
      query.data as Optimistic<TData> | undefined,
      {
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isSuccess: query.isSuccess,
        isError: query.isError,
        isPending: query.isPending,
        status: query.status,
        error: query.error,
        dataUpdatedAt: query.dataUpdatedAt,
        errorUpdatedAt: query.errorUpdatedAt,
        failureCount: query.failureCount,
        isStale: query.isStale,
        isPlaceholderData: query.isPlaceholderData,
        refetch: query.refetch,
      },
    ];
  }

  const collectionDef = def as CollectionDef<TData, TParams>;

  // Paginated collection
  if (paginated) {
    const infiniteQuery = useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) => {
        const pageParams = getPageParams
          ? getPageParams({ pageParam: pageParam as number })
          : ({ pageParam } as TParams);
        return collectionDef.fetch(pageParams);
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length > 0 ? allPages.length + 1 : undefined,
      enabled: queryOptions.enabled,
      staleTime: queryOptions.staleTime,
      gcTime: queryOptions.cacheTime,
      refetchOnMount: queryOptions.refetchOnMount,
      refetchOnWindowFocus: queryOptions.refetchOnWindowFocus,
      refetchInterval: queryOptions.refetchInterval,
    });

    const flatData = useMemo(
      () => infiniteQuery.data?.pages.flat() as Optimistic<TData>[] | undefined,
      [infiniteQuery.data]
    );

    // Register for optimistic updates
    useEffect(() => {
      if (infiniteQuery.status !== 'success' || !infiniteQuery.data) return;

      const entry = {
        kind: 'paginated' as const,
        name: def.name,
        queryKey,
        def: collectionDef,
        getData: () =>
          queryClient.getQueryData<{ pages: TData[][]; pageParams: unknown[] }>(
            queryKey
          ),
        setData: (
          updater: (
            prev: { pages: TData[][]; pageParams: unknown[] } | undefined
          ) => { pages: TData[][]; pageParams: unknown[] } | undefined
        ) =>
          queryClient.setQueryData<{
            pages: TData[][];
            pageParams: unknown[];
          }>(queryKey, updater),
      };

      registry.register(entry);
      return () => registry.unregister(entry);
    }, [def.name, queryKey, infiniteQuery.status, infiniteQuery.data, queryClient]);

    return [
      flatData,
      {
        isLoading: infiniteQuery.isLoading,
        isFetching: infiniteQuery.isFetching,
        isSuccess: infiniteQuery.isSuccess,
        isError: infiniteQuery.isError,
        isPending: infiniteQuery.isPending,
        status: infiniteQuery.status,
        error: infiniteQuery.error,
        dataUpdatedAt: infiniteQuery.dataUpdatedAt,
        errorUpdatedAt: infiniteQuery.errorUpdatedAt,
        failureCount: infiniteQuery.failureCount,
        isStale: infiniteQuery.isStale,
        isPlaceholderData: infiniteQuery.isPlaceholderData,
        refetch: infiniteQuery.refetch,
      },
      {
        hasNextPage: infiniteQuery.hasNextPage ?? false,
        fetchNextPage: infiniteQuery.fetchNextPage,
        isFetchingNextPage: infiniteQuery.isFetchingNextPage,
      },
    ];
  }

  // Simple collection query
  const query = useTanstackQuery({
    queryKey,
    queryFn: () => collectionDef.fetch(params as TParams),
    enabled: queryOptions.enabled,
    staleTime: queryOptions.staleTime,
    gcTime: queryOptions.cacheTime,
    refetchOnMount: queryOptions.refetchOnMount,
    refetchOnWindowFocus: queryOptions.refetchOnWindowFocus,
    refetchInterval: queryOptions.refetchInterval,
  });

  // Register for optimistic updates
  useEffect(() => {
    if (query.status !== 'success' || !query.data) return;

    const entry = {
      kind: 'collection' as const,
      name: def.name,
      queryKey,
      def: collectionDef,
      getData: () => queryClient.getQueryData<TData[]>(queryKey),
      setData: (updater: (prev: TData[] | undefined) => TData[] | undefined) =>
        queryClient.setQueryData<TData[]>(queryKey, updater),
    };

    registry.register(entry);
    return () => registry.unregister(entry);
  }, [def.name, queryKey, query.status, query.data, queryClient]);

  return [
    query.data as Optimistic<TData>[] | undefined,
    {
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isSuccess: query.isSuccess,
      isError: query.isError,
      isPending: query.isPending,
      status: query.status,
      error: query.error,
      dataUpdatedAt: query.dataUpdatedAt,
      errorUpdatedAt: query.errorUpdatedAt,
      failureCount: query.failureCount,
      isStale: query.isStale,
      isPlaceholderData: query.isPlaceholderData,
      refetch: query.refetch,
    },
  ];
}
