// Core exports (framework-agnostic)
export {
  defineCollection,
  defineEntity,
  defineMutation,
  registry,
  channel,
  CollectionChannel,
  EntityChannel,
} from './core';

export type {
  IdGetter,
  OptimisticStatus,
  Optimistic,
  CollectionDef,
  EntityDef,
  MutationDef,
  AnyDef,
  OptimisticAction,
  OptimisticInstruction,
  QueryOptions,
  PaginatedOptions,
  RegisteredCollection,
  RegisteredEntity,
  RegisteredPaginatedCollection,
  RegisteredEntry,
  Channel,
  ChannelOptions,
  OptimisticTransaction,
} from './core';

// React exports
export {
  useQuery,
  useMutation,
} from './react';

export type {
  UseQueryHookOptions,
  QueryResult,
  PaginatedQueryResult,
  EntityResult,
  OptimisticConfig,
  UseMutationOptions,
} from './react';
