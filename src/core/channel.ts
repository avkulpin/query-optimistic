import { nanoid } from 'nanoid';
import type { CollectionDef, EntityDef, Optimistic } from './types';
import { registry } from './registry';

/** Transaction returned from channel methods */
export interface OptimisticTransaction {
  target: CollectionDef<any, any> | EntityDef<any, any>;
  action: 'prepend' | 'append' | 'update' | 'delete' | 'replace';
  data?: any;
  id?: string;
  where?: (item: any) => boolean;
  update?: (item: any) => any;
  sync?: boolean;
  rollback: () => void;
}

/** Channel for a collection - provides typed optimistic mutation methods */
export class CollectionChannel<TEntity> {
  private readonly optimisticId = nanoid();

  constructor(private readonly target: CollectionDef<TEntity, any>) {}

  /**
   * Prepend an item to the collection
   * @returns Rollback function to undo the change
   */
  prepend(data: TEntity, options?: { sync?: boolean }): () => void {
    const optimisticData = {
      ...data,
      _optimistic: { id: this.optimisticId, status: 'pending' as const },
    };

    const rollbacks = registry.applyUpdate(this.target.name, 'prepend', {
      data: optimisticData,
    });

    return () => rollbacks.forEach((rb) => rb());
  }

  /**
   * Append an item to the collection
   * @returns Rollback function to undo the change
   */
  append(data: TEntity, options?: { sync?: boolean }): () => void {
    const optimisticData = {
      ...data,
      _optimistic: { id: this.optimisticId, status: 'pending' as const },
    };

    const rollbacks = registry.applyUpdate(this.target.name, 'append', {
      data: optimisticData,
    });

    return () => rollbacks.forEach((rb) => rb());
  }

  /**
   * Update an item in the collection by ID
   * @returns Rollback function to undo the change
   */
  update(
    id: string,
    updateFn: (item: TEntity) => TEntity,
    options?: { sync?: boolean }
  ): () => void {
    const rollbacks = registry.applyUpdate(this.target.name, 'update', {
      id,
      update: updateFn,
    });

    return () => rollbacks.forEach((rb) => rb());
  }

  /**
   * Update items matching a predicate
   * @returns Rollback function to undo the change
   */
  updateWhere(
    where: (item: TEntity) => boolean,
    updateFn: (item: TEntity) => TEntity
  ): () => void {
    const rollbacks = registry.applyUpdate(this.target.name, 'update', {
      where,
      update: updateFn,
    });

    return () => rollbacks.forEach((rb) => rb());
  }

  /**
   * Delete an item from the collection by ID
   * @returns Rollback function to undo the change
   */
  delete(id: string): () => void {
    const rollbacks = registry.applyUpdate(this.target.name, 'delete', {
      id,
    });

    return () => rollbacks.forEach((rb) => rb());
  }

  /**
   * Delete items matching a predicate
   * @returns Rollback function to undo the change
   */
  deleteWhere(where: (item: TEntity) => boolean): () => void {
    const rollbacks = registry.applyUpdate(this.target.name, 'delete', {
      where,
    });

    return () => rollbacks.forEach((rb) => rb());
  }
}

/** Channel for an entity - provides typed optimistic mutation methods */
export class EntityChannel<TEntity> {
  constructor(private readonly target: EntityDef<TEntity, any>) {}

  /**
   * Update the entity
   * @returns Rollback function to undo the change
   */
  update(updateFn: (item: TEntity) => TEntity, options?: { sync?: boolean }): () => void {
    const rollbacks = registry.applyUpdate(this.target.name, 'update', {
      update: updateFn,
    });

    return () => rollbacks.forEach((rb) => rb());
  }

  /**
   * Replace the entity with new data
   * @returns Rollback function to undo the change
   */
  replace(data: TEntity, options?: { sync?: boolean }): () => void {
    const rollbacks = registry.applyUpdate(this.target.name, 'replace', {
      data: data as any,
    });

    return () => rollbacks.forEach((rb) => rb());
  }
}

/**
 * Channel function for optimistic mutations.
 * Call with a collection or entity to get typed mutation methods.
 *
 * @example
 * // Standalone usage
 * const rollback = channel(usersCollection).prepend({ id: '1', name: 'John' });
 * // Later, to undo:
 * rollback();
 *
 * @example
 * // Update an entity
 * channel(userEntity).update(user => ({ ...user, name: 'Jane' }));
 */
export interface Channel {
  <TEntity>(target: CollectionDef<TEntity, any>): CollectionChannel<TEntity>;
  <TEntity>(target: EntityDef<TEntity, any>): EntityChannel<TEntity>;
}

/**
 * Create a channel for optimistic mutations.
 * Use this to apply immediate UI updates that can be rolled back.
 *
 * @example
 * const rollback = channel(usersCollection).prepend(newUser);
 * try {
 *   await api.createUser(newUser);
 * } catch (error) {
 *   rollback(); // Undo the optimistic update
 * }
 */
export const channel: Channel = (<TEntity>(
  target: CollectionDef<TEntity, any> | EntityDef<TEntity, any>
): CollectionChannel<TEntity> | EntityChannel<TEntity> => {
  if (target._type === 'collection') {
    return new CollectionChannel(target);
  } else {
    return new EntityChannel(target);
  }
}) as Channel;
