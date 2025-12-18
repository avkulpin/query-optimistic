// Core types
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
} from './types';

// Definition functions
export { defineCollection, defineEntity, defineMutation } from './define';

// Registry (internal, but exported for advanced use)
export { registry } from './registry';
export type {
  RegisteredCollection,
  RegisteredEntity,
  RegisteredPaginatedCollection,
  RegisteredEntry,
} from './registry';
