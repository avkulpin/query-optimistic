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
export interface UseQueryHookOptions<TParams, TData = unknown> extends QueryOptions {
  /** Parameters to pass to the fetch function */
  params?: TParams;
  /** Enable pagination mode (infinite query) */
  paginated?: boolean;
  /** For paginated: get params for each page */
  getPageParams?: (context: { pageParam: number }) => TParams;
  /** For paginated: custom logic to determine the next page param. Return undefined to stop. */
  getNextPageParam?: (lastPage: TData[], allPages: TData[][]) => number | undefined;
  /** Custom query key (defaults to [def.name, params]) */
  queryKey?: readonly unknown[];
  /** Transform the query data. Useful for deriving different views from the same cache. */
  select?: (data: Optimistic<TData>[] | Optimistic<TData>) => unknown;
  /**
   * Keep this query registered for optimistic updates even when unmounted.
   * Useful when you want updates from other pages to sync to this query's cache.
   */
  syncInBackground?: boolean;
  /**
   * Disable optimistic update registration for this query.
   * Useful for queries that don't need optimistic updates (e.g. analytics, logs).
   */
  disableOptimistic?: boolean;
}

/** Adds ensureQueryData capability to a query result */
export type WithEnsureData<TData> = {
  ensureQueryData: (options?: { staleTime?: number }) => Promise<TData>;
};

/** Return type for collection queries: [data, queryResult] */
export type QueryResult<T> = [
  Optimistic<T>[] | undefined,
  UseQueryResult<T[], Error> & WithEnsureData<T[]>
];

/** Return type for paginated queries: [data, infiniteQueryResult] */
export type PaginatedQueryResult<T> = [
  Optimistic<T>[] | undefined,
  UseInfiniteQueryResult<{ pages: T[][]; pageParams: unknown[] }, Error>
];

/** Return type for entity queries: [data, queryResult] */
export type EntityResult<T> = [
  Optimistic<T> | undefined,
  UseQueryResult<T, Error> & WithEnsureData<T>
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
export function useQuery<TData, TParams, TSelected>(
  def: CollectionDef<TData, TParams>,
  options: Omit<UseQueryHookOptions<TParams, TData>, 'select'> & { paginated: true; select: (data: Optimistic<TData>[]) => TSelected }
): [TSelected | undefined, UseInfiniteQueryResult<{ pages: TData[][]; pageParams: unknown[] }, Error>];

export function useQuery<TData, TParams>(
  def: CollectionDef<TData, TParams>,
  options: UseQueryHookOptions<TParams, TData> & { paginated: true }
): PaginatedQueryResult<TData>;

export function useQuery<TData, TParams, TSelected>(
  def: CollectionDef<TData, TParams>,
  options: Omit<UseQueryHookOptions<TParams, TData>, 'select'> & { select: (data: Optimistic<TData>[]) => TSelected }
): [TSelected | undefined, UseQueryResult<TData[], Error> & WithEnsureData<TData[]>];

export function useQuery<TData, TParams>(
  def: CollectionDef<TData, TParams>,
  options?: UseQueryHookOptions<TParams, TData>
): QueryResult<TData>;

export function useQuery<TData, TParams, TSelected>(
  def: EntityDef<TData, TParams>,
  options: Omit<UseQueryHookOptions<TParams, TData>, 'select'> & { select: (data: Optimistic<TData>) => TSelected }
): [TSelected | undefined, UseQueryResult<TData, Error> & WithEnsureData<TData>];

export function useQuery<TData, TParams>(
  def: EntityDef<TData, TParams>,
  options?: UseQueryHookOptions<TParams, TData>
): EntityResult<TData>;

export function useQuery<TData, TParams>(
  def: CollectionDef<TData, TParams> | EntityDef<TData, TParams>,
  options?: UseQueryHookOptions<TParams, TData>
): QueryResult<TData> | PaginatedQueryResult<TData> | EntityResult<TData> {
  const queryClient = useQueryClient();
  const { params, paginated, getPageParams, getNextPageParam, select, queryKey: customQueryKey, syncInBackground, disableOptimistic, ...queryOptions } = options ?? {};

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
      if (disableOptimistic || query.status !== 'success' || !query.data) {
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
    }, [def.name, queryKey, query.status, query.data, queryClient, syncInBackground, disableOptimistic]);

    const ensuredQuery = Object.assign(query, {
      ensureQueryData: (opts?: { staleTime?: number }) =>
        queryClient.ensureQueryData<TData>({
          queryKey,
          queryFn: () => entityDef.fetch(params as TParams),
          staleTime: opts?.staleTime ?? queryOptions.staleTime,
        }),
    });

    const data = ensuredQuery.data as Optimistic<TData> | undefined;
    return [
      (data !== undefined && select ? select(data) : data) as any,
      ensuredQuery,
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

    const flatData = useMemo(() => {
      const flat = infiniteQuery.data?.pages.flat() as Optimistic<TData>[] | undefined;
      return flat !== undefined && select ? select(flat) : flat;
    }, [infiniteQuery.data]);

    // Register for optimistic updates
    useEffect(() => {
      if (disableOptimistic || infiniteQuery.status !== 'success' || !infiniteQuery.data) return;

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
    }, [def.name, queryKey, infiniteQuery.status, infiniteQuery.data, queryClient, syncInBackground, disableOptimistic]);

    return [
      flatData as any,
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
    if (disableOptimistic || query.status !== 'success' || !query.data) return;

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
  }, [def.name, queryKey, query.status, query.data, queryClient, syncInBackground, disableOptimistic]);

  const ensuredQuery = Object.assign(query, {
    ensureQueryData: (opts?: { staleTime?: number }) =>
      queryClient.ensureQueryData<TData[]>({
        queryKey,
        queryFn: () => collectionDef.fetch(params as TParams),
        staleTime: opts?.staleTime ?? queryOptions.staleTime,
      }),
  });

  const data = ensuredQuery.data as Optimistic<TData>[] | undefined;
  return [
    (data !== undefined && select ? select(data) : data) as any,
    ensuredQuery,
  ];
}
