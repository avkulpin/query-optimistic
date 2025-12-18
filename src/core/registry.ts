import type { CollectionDef, EntityDef, Optimistic } from './types';

/** Registered collection entry */
export interface RegisteredCollection<T = any> {
  kind: 'collection';
  name: string;
  queryKey: readonly unknown[];
  def: CollectionDef<T, any>;
  getData: () => T[] | undefined;
  setData: (updater: (prev: T[] | undefined) => T[] | undefined) => void;
}

/** Registered entity entry */
export interface RegisteredEntity<T = any> {
  kind: 'entity';
  name: string;
  queryKey: readonly unknown[];
  def: EntityDef<T, any>;
  getData: () => T | undefined;
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

/** Registered paginated collection entry */
export interface RegisteredPaginatedCollection<T = any> {
  kind: 'paginated';
  name: string;
  queryKey: readonly unknown[];
  def: CollectionDef<T, any>;
  getData: () => { pages: T[][]; pageParams: unknown[] } | undefined;
  setData: (
    updater: (
      prev: { pages: T[][]; pageParams: unknown[] } | undefined
    ) => { pages: T[][]; pageParams: unknown[] } | undefined
  ) => void;
}

export type RegisteredEntry =
  | RegisteredCollection
  | RegisteredEntity
  | RegisteredPaginatedCollection;

/**
 * Internal registry for tracking active queries
 * Used by optimistic updates to broadcast changes
 */
class QueryRegistry {
  private entries = new Map<string, Set<RegisteredEntry>>();

  /** Register an active query */
  register(entry: RegisteredEntry): void {
    if (!this.entries.has(entry.name)) {
      this.entries.set(entry.name, new Set());
    }
    this.entries.get(entry.name)!.add(entry);
  }

  /** Unregister a query when component unmounts */
  unregister(entry: RegisteredEntry): void {
    const set = this.entries.get(entry.name);
    if (set) {
      set.delete(entry);
      if (set.size === 0) {
        this.entries.delete(entry.name);
      }
    }
  }

  /** Get all registered entries for a query name */
  getByName(name: string): RegisteredEntry[] {
    return Array.from(this.entries.get(name) ?? []);
  }

  /** Apply an optimistic update to all queries with given name */
  applyUpdate<T>(
    name: string,
    action: 'prepend' | 'append' | 'update' | 'delete' | 'replace',
    payload: {
      data?: Partial<Optimistic<T>>;
      id?: string;
      where?: (item: T) => boolean;
      update?: (item: T) => T;
    }
  ): (() => void)[] {
    const entries = this.getByName(name);
    const rollbacks: (() => void)[] = [];

    for (const entry of entries) {
      if (entry.kind === 'collection') {
        const previous = entry.getData();
        const rollback = () => entry.setData(() => previous);
        rollbacks.push(rollback);

        entry.setData((prev) => {
          if (!prev) return prev;
          return this.applyCollectionUpdate(prev, action, payload, entry.def.id);
        });
      } else if (entry.kind === 'paginated') {
        const previous = entry.getData();
        const rollback = () => entry.setData(() => previous);
        rollbacks.push(rollback);

        entry.setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((page, i) =>
              i === 0
                ? this.applyCollectionUpdate(page, action, payload, entry.def.id)
                : page
            ),
          };
        });
      } else if (entry.kind === 'entity') {
        const previous = entry.getData();
        const rollback = () => entry.setData(() => previous);
        rollbacks.push(rollback);

        if (action === 'update' && payload.update) {
          entry.setData((prev) => (prev ? payload.update!(prev as T) : prev));
        } else if (action === 'replace' && payload.data) {
          entry.setData(() => payload.data as T);
        }
      }
    }

    return rollbacks;
  }

  private applyCollectionUpdate<T>(
    items: T[],
    action: string,
    payload: {
      data?: Partial<Optimistic<T>>;
      id?: string;
      where?: (item: T) => boolean;
      update?: (item: T) => T;
    },
    getId: (item: T) => string
  ): T[] {
    switch (action) {
      case 'prepend':
        return payload.data ? [payload.data as T, ...items] : items;

      case 'append':
        return payload.data ? [...items, payload.data as T] : items;

      case 'update':
        return items.map((item) => {
          const matches = payload.id
            ? getId(item) === payload.id
            : payload.where?.(item);
          if (matches && payload.update) {
            return payload.update(item);
          }
          if (matches && payload.data) {
            return { ...item, ...payload.data };
          }
          return item;
        });

      case 'delete':
        return items.filter((item) => {
          if (payload.id) return getId(item) !== payload.id;
          if (payload.where) return !payload.where(item);
          return true;
        });

      case 'replace':
        return items.map((item) => {
          const matches = payload.id
            ? getId(item) === payload.id
            : payload.where?.(item);
          return matches && payload.data ? (payload.data as T) : item;
        });

      default:
        return items;
    }
  }
}

/** Singleton registry instance */
export const registry = new QueryRegistry();
