import { useMutation as useTanstackMutation } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import type {
  MutationDef,
  CollectionDef,
  EntityDef,
  OptimisticAction,
  Optimistic,
} from '../core/types';
import { registry } from '../core/registry';

/** Extract entity type from a collection or entity definition */
type InferEntity<T> = T extends CollectionDef<infer TData, any>
  ? TData & {}
  : T extends EntityDef<infer TData, any>
    ? TData & {}
    : never;

/** Base optimistic config with shared properties */
interface OptimisticConfigBase<
  TTarget extends CollectionDef<any, any> | EntityDef<any, any>,
  TParams
> {
  /** Target collection/entity to update */
  target: TTarget;
  /** Whether to sync with server response (replace optimistic with real data) */
  sync?: boolean;
}

/** Config for prepend/append actions - requires full entity */
interface OptimisticPrependAppendConfig<
  TTarget extends CollectionDef<any, any> | EntityDef<any, any>,
  TParams
> extends OptimisticConfigBase<TTarget, TParams> {
  action: 'prepend' | 'append';
  /** Data to prepend/append - must be a full entity */
  data: (params: TParams) => NoInfer<InferEntity<TTarget>>;
}

/** Config for replace action */
interface OptimisticReplaceConfig<
  TTarget extends CollectionDef<any, any> | EntityDef<any, any>,
  TParams
> extends OptimisticConfigBase<TTarget, TParams> {
  action: 'replace';
  /** Data for replacement */
  data: (params: TParams) => NoInfer<InferEntity<TTarget>>;
  /** ID of item to replace */
  id?: string | ((params: TParams) => string);
  /** Filter function to find items to replace */
  where?: (item: NoInfer<InferEntity<TTarget>>) => boolean;
}

/** Config for update action */
interface OptimisticUpdateConfig<
  TTarget extends CollectionDef<any, any> | EntityDef<any, any>,
  TParams
> extends OptimisticConfigBase<TTarget, TParams> {
  action: 'update';
  /** Partial data for update */
  data?: (params: TParams) => Partial<NoInfer<InferEntity<TTarget>>>;
  /** ID of item to update */
  id?: string | ((params: TParams) => string);
  /** Filter function to find items to update */
  where?: (item: NoInfer<InferEntity<TTarget>>) => boolean;
  /** Update function */
  update?: (item: NoInfer<InferEntity<TTarget>>, params: TParams) => NoInfer<InferEntity<TTarget>>;
}

/** Config for delete action */
interface OptimisticDeleteConfig<
  TTarget extends CollectionDef<any, any> | EntityDef<any, any>,
  TParams
> extends OptimisticConfigBase<TTarget, TParams> {
  action: 'delete';
  /** ID of item to delete */
  id?: string | ((params: TParams) => string);
  /** Filter function to find items to delete */
  where?: (item: NoInfer<InferEntity<TTarget>>) => boolean;
}

/** Optimistic update configuration - type inferred from target */
export type OptimisticConfig<
  TTarget extends CollectionDef<any, any> | EntityDef<any, any>,
  TParams
> =
  | OptimisticPrependAppendConfig<TTarget, TParams>
  | OptimisticReplaceConfig<TTarget, TParams>
  | OptimisticUpdateConfig<TTarget, TParams>
  | OptimisticDeleteConfig<TTarget, TParams>;

/** Builder for prepend/append optimistic config with proper type inference */
export function prepend<TTarget extends CollectionDef<any, any>>(
  target: TTarget
) {
  return <TParams>(config: {
    data: (params: TParams) => InferEntity<TTarget>;
    sync?: boolean;
  }): OptimisticPrependAppendConfig<TTarget, TParams> => ({
    target,
    action: 'prepend',
    ...config,
  });
}

/** Builder for append optimistic config with proper type inference */
export function append<TTarget extends CollectionDef<any, any>>(
  target: TTarget
) {
  return <TParams>(config: {
    data: (params: TParams) => InferEntity<TTarget>;
    sync?: boolean;
  }): OptimisticPrependAppendConfig<TTarget, TParams> => ({
    target,
    action: 'append',
    ...config,
  });
}


/** Options for useMutation hook */
export interface UseMutationOptions<TParams, TResponse> {
  /** Called when mutation starts */
  onMutate?: (params: TParams) => void;
  /** Called on success */
  onSuccess?: (data: TResponse, params: TParams) => void;
  /** Called on error */
  onError?: (error: Error, params: TParams) => void;
}

/** Return type for useMutation */
export interface MutationResult<TParams, TResponse> {
  mutate: (params: TParams) => void;
  mutateAsync: (params: TParams) => Promise<TResponse>;
  isLoading: boolean;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: TResponse | undefined;
  reset: () => void;
}

/**
 * Mutation hook with simplified optimistic updates
 *
 * @example
 * // Simple mutation
 * const { mutate } = useMutation(createPost)
 *
 * @example
 * // With optimistic update
 * const { mutate } = useMutation(createPost, {
 *   optimistic: {
 *     target: postsQuery,
 *     action: 'prepend',
 *     data: (params) => ({ ...params, _id: 'temp-id' })
 *   }
 * })
 *
 * @example
 * // Multiple optimistic updates
 * const { mutate } = useMutation(deletePost, {
 *   optimistic: [
 *     { target: postsQuery, action: 'delete', id: (p) => p.postId },
 *     { target: userStatsEntity, action: 'update', update: (stats) => ({ ...stats, postCount: stats.postCount - 1 }) }
 *   ]
 * })
 */
export function useMutation<
  TParams,
  TResponse,
  TTarget extends CollectionDef<any, any> | EntityDef<any, any> = CollectionDef<any, any>,
>(
  def: MutationDef<TParams, TResponse>,
  options?: UseMutationOptions<TParams, TResponse> & {
    /** Optimistic update configuration */
    optimistic?: {
      target: TTarget;
      action: 'prepend' | 'append' | 'update' | 'delete' | 'replace';
      data?: (params: TParams) => InferEntity<TTarget>;
      sync?: boolean;
      id?: string | ((params: TParams) => string);
      where?: (item: InferEntity<TTarget>) => boolean;
      update?: (item: InferEntity<TTarget>, params: TParams) => InferEntity<TTarget>;
    } | {
      target: TTarget;
      action: 'prepend' | 'append' | 'update' | 'delete' | 'replace';
      data?: (params: TParams) => InferEntity<TTarget>;
      sync?: boolean;
      id?: string | ((params: TParams) => string);
      where?: (item: InferEntity<TTarget>) => boolean;
      update?: (item: InferEntity<TTarget>, params: TParams) => InferEntity<TTarget>;
    }[];
  }
): MutationResult<TParams, TResponse> {
  const mutation = useTanstackMutation<
    TResponse,
    Error,
    TParams,
    { rollbacks: (() => void)[]; optimisticId: string }
  >({
    mutationKey: def.name ? [def.name] : undefined,
    mutationFn: def.mutate,

    onMutate: async (params) => {
      const rollbacks: (() => void)[] = [];
      const optimisticId = nanoid();

      // Apply optimistic updates
      if (options?.optimistic) {
        const configs = Array.isArray(options.optimistic)
          ? options.optimistic
          : [options.optimistic];

        for (const config of configs) {
          const { target, action } = config;

          // Extract optional properties based on action type
          const data = 'data' in config ? config.data : undefined;
          const id = 'id' in config ? config.id : undefined;
          const where = 'where' in config ? config.where : undefined;
          const update = 'update' in config ? config.update : undefined;

          // Resolve dynamic values
          const resolvedData =
            typeof data === 'function' ? data(params) : data;
          const resolvedId = typeof id === 'function' ? id(params) : id;

          // Add optimistic metadata
          const optimisticData = resolvedData
            ? {
                ...resolvedData,
                _optimistic: { id: optimisticId, status: 'pending' as const },
              }
            : undefined;

          const updateRollbacks = registry.applyUpdate(target.name, action, {
            data: optimisticData,
            id: resolvedId,
            where,
            update: update
              ? (item: any) => update(item, params)
              : resolvedData
                ? (item: any) => ({ ...item, ...resolvedData })
                : undefined,
          });

          rollbacks.push(...updateRollbacks);
        }
      }

      options?.onMutate?.(params);
      return { rollbacks, optimisticId };
    },

    onSuccess: (data, params, context) => {
      // If sync is enabled, replace optimistic data with server response
      if (options?.optimistic) {
        const configs = Array.isArray(options.optimistic)
          ? options.optimistic
          : [options.optimistic];

        for (const config of configs) {
          if (config.sync && data) {
            // Replace optimistic item with real server data
            registry.applyUpdate(config.target.name, 'update', {
              where: (item: any) =>
                item._optimistic?.id === context?.optimisticId,
              update: () => data as any,
            });
          }
        }
      }

      options?.onSuccess?.(data, params);
    },

    onError: (error, params, context) => {
      // Rollback all optimistic updates
      context?.rollbacks.forEach((rollback) => rollback());
      options?.onError?.(error, params);
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
