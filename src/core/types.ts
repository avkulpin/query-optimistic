/**
 * Core types for query-toolkit
 * Framework-agnostic definitions
 */

/** Extract the ID from an entity */
export type IdGetter<T> = (item: T) => string;

/** Optimistic status for pending mutations */
export type OptimisticStatus = 'pending' | 'success' | 'error';

/** Wraps an entity with optimistic metadata */
export type Optimistic<T> = T & {
  _optimistic?: {
    id: string;
    status: OptimisticStatus;
    error?: string;
  };
};

/** Collection definition for arrays of items */
export interface CollectionDef<TData, TParams = void> {
  readonly _type: 'collection';
  readonly name: string;
  readonly id: IdGetter<TData>;
  readonly fetch: (params: TParams) => Promise<TData[]>;
}

/** Entity definition for single items */
export interface EntityDef<TData, TParams = void> {
  readonly _type: 'entity';
  readonly name: string;
  readonly fetch: (params: TParams) => Promise<TData>;
}

/** Mutation definition */
export interface MutationDef<TParams, TResponse = void> {
  readonly _type: 'mutation';
  readonly name?: string;
  readonly mutate: (params: TParams) => Promise<TResponse>;
}

/** Unified definition type */
export type AnyDef = CollectionDef<any, any> | EntityDef<any, any>;

/** Optimistic action types */
export type OptimisticAction =
  | 'prepend'
  | 'append'
  | 'update'
  | 'delete'
  | 'replace';

/** Optimistic update instruction */
export interface OptimisticInstruction<T = any> {
  target: CollectionDef<T, any> | EntityDef<T, any>;
  action: OptimisticAction;
  data?: Partial<T>;
  id?: string;
  where?: (item: T) => boolean;
  update?: (item: T) => T;
}

/** Options for query execution */
export interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number | false;
}

/** Options for paginated queries */
export interface PaginatedOptions extends QueryOptions {
  getNextPageParam?: (lastPage: any[], allPages: any[][]) => unknown | undefined;
}