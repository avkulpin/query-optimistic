import { useEffect, useMemo } from 'react';
import {
  useQuery as useTanstackQuery,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryResult,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import type {
  CollectionDef,
  EntityDef,
  Optimistic,
  QueryOptions,
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
  /** For paginated: custom logic to determine the next page param. Return undefined to stop. */
  getNextPageParam?: (lastPage: unknown[], allPages: unknown[][]) => number | undefined;
  /** Custom query key (defaults to [def.name, params]) */
  queryKey?: readonly unknown[];
  /**
   * Keep this query registered for optimistic updates even when unmounted.
   * Useful when you want updates from other pages to sync to this query's cache.
   */
  syncInBackground?: boolean;
}

/** Return type for collection queries: [data, queryResult] */
export type QueryResult<T> = [
  Optimistic<T>[] | undefined,
  UseQueryResult<T[], Error>
];

/** Return type for paginated queries: [data, infiniteQueryResult] */
export type PaginatedQueryResult<T> = [
  Optimistic<T>[] | undefined,
  UseInfiniteQueryResult<{ pages: T[][]; pageParams: unknown[] }, Error>
];

/** Return type for entity queries: [data, queryResult] */
export type EntityResult<T> = [
  Optimistic<T> | undefined,
  UseQueryResult<T, Error>
];

/**
 * Unified query hook for fetching data
 *
 * Returns a tuple of [data, queryResult] where queryResult is the full
 * TanStack Query result object with all properties (isLoading, isError,
 * refetch, etc.)
 *
 * @example
 * // Simple collection query
 * const [data, query] = useQuery(postsQuery, { params: { limit: 10 } })
 * // query.isLoading, query.isError, query.refetch(), etc.
 *
 * @example
 * // Paginated query - returns full infinite query result
 * const [data, query] = useQuery(postsQuery, {
 *   paginated: true,
 *   getPageParams: ({ pageParam }) => ({ page: pageParam, limit: 10 })
 * })
 * // query.fetchNextPage(), query.hasNextPage, query.isFetchingNextPage
 *
 * @example
 * // Entity query
 * const [user, query] = useQuery(userEntity, { params: userId })
 */
export function useQuery<TData, TParams>(
  def: CollectionDef<TData, TParams>,
  options: UseQueryHookOptions<TParams> & { paginated: true }
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
  const { params, paginated, getPageParams, getNextPageParam, queryKey: customQueryKey, syncInBackground, ...queryOptions } = options ?? {};

  // Set queryClient on registry for direct cache access
  registry.setQueryClient(queryClient);

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
      if (query.status !== 'success' || !query.data) {
        return;
      }

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

      // If syncInBackground is enabled, don't unregister on unmount
      if (!syncInBackground) {
        return () => registry.unregister(entry);
      }
    }, [def.name, queryKey, query.status, query.data, queryClient, syncInBackground]);

    return [
      query.data as Optimistic<TData> | undefined,
      query as UseQueryResult<TData, Error>,
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
      getNextPageParam: getNextPageParam
        ?? ((lastPage, allPages) =>
          lastPage.length > 0 ? allPages.length + 1 : undefined),
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

      // If syncInBackground is enabled, don't unregister on unmount
      if (!syncInBackground) {
        return () => registry.unregister(entry);
      }
    }, [def.name, queryKey, infiniteQuery.status, infiniteQuery.data, queryClient, syncInBackground]);

    return [
      flatData,
      infiniteQuery as UseInfiniteQueryResult<{ pages: TData[][]; pageParams: unknown[] }, Error>,
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

    // If syncInBackground is enabled, don't unregister on unmount
    if (!syncInBackground) {
      return () => registry.unregister(entry);
    }
  }, [def.name, queryKey, query.status, query.data, queryClient, syncInBackground]);

  return [
    query.data as Optimistic<TData>[] | undefined,
    query as UseQueryResult<TData[], Error>,
  ];
}
