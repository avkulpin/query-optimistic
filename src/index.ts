// Core exports (framework-agnostic)
export {
  defineCollection,
  defineEntity,
  defineMutation,
  registry,
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
} from './core';

// React exports
export {
  useQuery,
  useMutation,
} from './react';

export type {
  UseQueryHookOptions,
  QueryState,
  PaginationState,
  QueryResult,
  PaginatedQueryResult,
  EntityResult,
  OptimisticConfig,
  UseMutationOptions,
  MutationResult,
} from './react';
