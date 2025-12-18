import type {
  CollectionDef,
  EntityDef,
  MutationDef,
  IdGetter,
} from './types';

/**
 * Define a collection query for fetching arrays of items
 *
 * @example
 * const postsQuery = defineCollection({
 *   name: 'posts',
 *   id: (post) => post._id,
 *   fetch: ({ page }) => api.get(`/posts?page=${page}`).json()
 * })
 */
export function defineCollection<TData, TParams = void>(config: {
  name: string;
  id: IdGetter<TData>;
  fetch: (params: TParams) => Promise<TData[]>;
}): CollectionDef<TData, TParams> {
  return {
    _type: 'collection',
    name: config.name,
    id: config.id,
    fetch: config.fetch,
  };
}

/**
 * Define an entity for fetching single items
 *
 * @example
 * const userEntity = defineEntity({
 *   name: 'user',
 *   fetch: (userId) => api.get(`/users/${userId}`).json()
 * })
 */
export function defineEntity<TData, TParams = void>(config: {
  name: string;
  fetch: (params: TParams) => Promise<TData>;
}): EntityDef<TData, TParams> {
  return {
    _type: 'entity',
    name: config.name,
    fetch: config.fetch,
  };
}

/**
 * Define a mutation for writing data
 *
 * @example
 * const createPost = defineMutation({
 *   name: 'createPost',
 *   mutate: (data) => api.post('/posts', { json: data }).json()
 * })
 */
export function defineMutation<TParams, TResponse = void>(config: {
  name?: string;
  mutate: (params: TParams) => Promise<TResponse>;
}): MutationDef<TParams, TResponse> {
  return {
    _type: 'mutation',
    name: config.name,
    mutate: config.mutate,
  };
}
