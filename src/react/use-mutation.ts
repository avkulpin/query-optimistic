import { useMutation as useTanstackMutation } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import type {
  MutationDef,
  CollectionDef,
  EntityDef,
} from '../core/types';
import { registry } from '../core/registry';
import {
  channel as coreChannel,
  type Channel,
  type CollectionChannel,
  type EntityChannel,
} from '../core/channel';

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

/** Internal transaction type for batched mutations */
interface MutationTransaction {
  target: CollectionDef<any, any> | EntityDef<any, any>;
  action: 'prepend' | 'append' | 'update' | 'delete' | 'replace';
  data?: any;
  id?: string;
  where?: (item: any) => boolean;
  update?: (item: any) => any;
  sync?: boolean;
}

/** Internal collection channel for batched mutations */
class BatchedCollectionChannel<TEntity> {
  constructor(
    private readonly target: CollectionDef<TEntity, any>,
    private readonly transactions: MutationTransaction[]
  ) {}

  prepend(data: TEntity, options?: { sync?: boolean }): this {
    this.transactions.push({
      target: this.target,
      action: 'prepend',
      data,
      sync: options?.sync,
    });
    return this;
  }

  append(data: TEntity, options?: { sync?: boolean }): this {
    this.transactions.push({
      target: this.target,
      action: 'append',
      data,
      sync: options?.sync,
    });
    return this;
  }

  update(id: string, updateFn: (item: TEntity) => TEntity, options?: { sync?: boolean }): this {
    this.transactions.push({
      target: this.target,
      action: 'update',
      id,
      update: updateFn,
      sync: options?.sync,
    });
    return this;
  }

  delete(id: string): this {
    this.transactions.push({
      target: this.target,
      action: 'delete',
      id,
    });
    return this;
  }
}

/** Internal entity channel for batched mutations */
class BatchedEntityChannel<TEntity> {
  constructor(
    private readonly target: EntityDef<TEntity, any>,
    private readonly transactions: MutationTransaction[]
  ) {}

  update(updateFn: (item: TEntity) => TEntity, options?: { sync?: boolean }): this {
    this.transactions.push({
      target: this.target,
      action: 'update',
      update: updateFn,
      sync: options?.sync,
    });
    return this;
  }

  replace(data: TEntity, options?: { sync?: boolean }): this {
    this.transactions.push({
      target: this.target,
      action: 'replace',
      data,
      sync: options?.sync,
    });
    return this;
  }
}

/** Internal batched channel type */
interface BatchedChannel {
  <TEntity>(target: CollectionDef<TEntity, any>): BatchedCollectionChannel<TEntity>;
  <TEntity>(target: EntityDef<TEntity, any>): BatchedEntityChannel<TEntity>;
}

/** Creates a batched channel for collecting mutations */
function createBatchedChannel(transactions: MutationTransaction[]): BatchedChannel {
  function channel<TEntity>(target: CollectionDef<TEntity, any>): BatchedCollectionChannel<TEntity>;
  function channel<TEntity>(target: EntityDef<TEntity, any>): BatchedEntityChannel<TEntity>;
  function channel<TEntity>(
    target: CollectionDef<TEntity, any> | EntityDef<TEntity, any>
  ): BatchedCollectionChannel<TEntity> | BatchedEntityChannel<TEntity> {
    if (target._type === 'collection') {
      return new BatchedCollectionChannel(target, transactions);
    } else {
      return new BatchedEntityChannel(target, transactions);
    }
  }
  return channel;
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
>(
  def: MutationDef<TParams, TResponse>,
  options?: UseMutationOptions<TParams, TResponse> & {
    /** Optimistic update configuration - receives channel and params */
    optimistic?: (channel: BatchedChannel, params: TParams) => void;
  }
): MutationResult<TParams, TResponse> {
  const mutation = useTanstackMutation<
    TResponse,
    Error,
    TParams,
    { rollbacks: (() => void)[]; optimisticId: string; transactions: MutationTransaction[] }
  >({
    mutationKey: def.name ? [def.name] : undefined,
    mutationFn: def.mutate,

    onMutate: async (params) => {
      const rollbacks: (() => void)[] = [];
      const optimisticId = nanoid();
      const transactions: MutationTransaction[] = [];

      // Apply optimistic updates via channel
      if (options?.optimistic) {
        const channel = createBatchedChannel(transactions);
        options.optimistic(channel, params);

        for (const tx of transactions) {
          const { target, action, data, id, where, update } = tx;

          // Add optimistic metadata to data
          const optimisticData = data
            ? {
                ...data,
                _optimistic: { id: optimisticId, status: 'pending' as const },
              }
            : undefined;

          const updateRollbacks = registry.applyUpdate(target.name, action, {
            data: optimisticData,
            id,
            where,
            update: update
              ? (item: any) => update(item)
              : optimisticData
                ? (item: any) => ({ ...item, ...optimisticData })
                : undefined,
          });

          rollbacks.push(...updateRollbacks);
        }
      }

      options?.onMutate?.(params);
      return { rollbacks, optimisticId, transactions };
    },

    onSuccess: (data, params, context) => {
      // If sync is enabled, replace optimistic data with server response
      if (context?.transactions) {
        for (const tx of context.transactions) {
          if (tx.sync && data) {
            // Replace optimistic item with real server data
            registry.applyUpdate(tx.target.name, 'update', {
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
