import { useEffect, useMemo, useRef } from 'react';
import {
  useQueries as useTanstackQueries,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  CollectionDef,
  EntityDef,
  Optimistic,
} from '../core/types';
import { registry } from '../core/registry';
import type { UseQueryHookOptions, QueryResult, EntityResult } from './use-query';

/**
 * Fetch multiple queries of the same entity/collection type in parallel.
 *
 * @example
 * const results = useQueries(tokenInfoEntity, positions.map(p => ({
 *   params: { address: p.tokenAddress, chainName },
 * })))
 * // results[i] = [data, queryResult]
 */
export function useQueries<TData, TParams>(
  def: EntityDef<TData, TParams>,
  optionsArray: UseQueryHookOptions<TParams, TData>[]
): EntityResult<TData>[];

export function useQueries<TData, TParams>(
  def: CollectionDef<TData, TParams>,
  optionsArray: UseQueryHookOptions<TParams, TData>[]
): QueryResult<TData>[];

export function useQueries<TData, TParams>(
  def: EntityDef<TData, TParams> | CollectionDef<TData, TParams>,
  optionsArray: UseQueryHookOptions<TParams, TData>[]
): (EntityResult<TData> | QueryResult<TData>)[] {
  const queryClient = useQueryClient();

  registry.setQueryClient(queryClient);

  const queries = useMemo(
    () =>
      optionsArray.map((opts) => {
        const { params, prefixQueryKey, queryKey: customQueryKey, ...queryOptions } = opts;
        const queryKey = customQueryKey ?? [...(prefixQueryKey ?? []), def.name, params].filter(Boolean);

        return {
          queryKey,
          queryFn: () => def.fetch(params as TParams),
          enabled: queryOptions.enabled,
          staleTime: queryOptions.staleTime,
          gcTime: queryOptions.cacheTime,
          refetchOnMount: queryOptions.refetchOnMount,
          refetchOnWindowFocus: queryOptions.refetchOnWindowFocus,
          refetchInterval: queryOptions.refetchInterval,
        };
      }),
    [def, optionsArray]
  );

  const results = useTanstackQueries({ queries });

  // Track registered entries for cleanup
  const registeredRef = useRef<Set<any>>(new Set());

  useEffect(() => {
    const currentEntries = new Set<any>();

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (optionsArray[i]?.disableOptimistic || result.status !== 'success' || !result.data) continue;

      const queryKey = queries[i].queryKey;

      if (def._type === 'entity') {
        const entry = {
          kind: 'entity' as const,
          name: def.name,
          queryKey,
          def: def as EntityDef<TData, TParams>,
          getData: () => queryClient.getQueryData<TData>(queryKey),
          setData: (updater: (prev: TData | undefined) => TData | undefined) =>
            queryClient.setQueryData<TData>(queryKey, updater),
        };
        registry.register(entry);
        currentEntries.add(entry);
      } else {
        const collDef = def as CollectionDef<TData, TParams>;
        const entry = {
          kind: 'collection' as const,
          name: def.name,
          queryKey,
          def: collDef,
          getData: () => queryClient.getQueryData<TData[]>(queryKey),
          setData: (updater: (prev: TData[] | undefined) => TData[] | undefined) =>
            queryClient.setQueryData<TData[]>(queryKey, updater),
        };
        registry.register(entry);
        currentEntries.add(entry);
      }
    }

    // Unregister previous entries that are no longer active
    for (const entry of registeredRef.current) {
      if (!currentEntries.has(entry)) {
        registry.unregister(entry);
      }
    }

    registeredRef.current = currentEntries;

    return () => {
      for (const entry of currentEntries) {
        registry.unregister(entry);
      }
      registeredRef.current = new Set();
    };
  }, [def, results, queries, queryClient, optionsArray]);

  // Map to tuples
  return results.map((result) => {
    if (def._type === 'entity') {
      return [
        result.data as Optimistic<TData> | undefined,
        result as UseQueryResult<TData, Error>,
      ] as EntityResult<TData>;
    }
    return [
      result.data as Optimistic<TData>[] | undefined,
      result as UseQueryResult<TData[], Error>,
    ] as QueryResult<TData>;
  });
}
