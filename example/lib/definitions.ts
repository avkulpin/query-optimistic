/**
 * Query and Mutation Definitions
 */

import { defineCollection, defineEntity, defineMutation } from 'query-optimistic';
import {
  type Todo,
  type User,
  type Post,
  type CartItem,
  type CartSummary,
  todoApi,
  userApi,
  postsApi,
  cartApi,
} from './api';

// Collections
export const todosCollection = defineCollection<Todo>({
  name: 'todos',
  id: (todo) => todo.id,
  fetch: () => todoApi.getAll(),
});

export const postsCollection = defineCollection<Post, { page: number }>({
  name: 'posts',
  id: (post) => post.id,
  fetch: (params) => postsApi.getPage(params),
});

export const cartItemsCollection = defineCollection<CartItem>({
  name: 'cart-items',
  id: (item) => item.id,
  fetch: () => cartApi.getItems(),
});

// Entities
export const userEntity = defineEntity<User, { id: string }>({
  name: 'user',
  fetch: (params) => userApi.get(params),
});

export const cartSummaryEntity = defineEntity<CartSummary>({
  name: 'cart-summary',
  fetch: () => cartApi.getSummary(),
});

// Mutations
export const createTodoMutation = defineMutation<{ title: string }, Todo>({
  name: 'create-todo',
  mutate: (params) => todoApi.create(params),
});

export const updateTodoMutation = defineMutation<
  { id: string; title?: string; completed?: boolean },
  Todo
>({
  name: 'update-todo',
  mutate: (params) => todoApi.update(params),
});

export const deleteTodoMutation = defineMutation<{ id: string }, void>({
  name: 'delete-todo',
  mutate: (params) => todoApi.delete(params),
});

export const updateUserMutation = defineMutation<
  { id: string; name?: string; email?: string; bio?: string },
  User
>({
  name: 'update-user',
  mutate: (params) => userApi.update(params),
});

export const likePostMutation = defineMutation<{ id: string }, Post>({
  name: 'like-post',
  mutate: (params) => postsApi.like(params),
});

export const addToCartMutation = defineMutation<
  { productId: string; name: string; price: number },
  CartItem
>({
  name: 'add-to-cart',
  mutate: (params) => cartApi.addItem(params),
});

export const updateCartQuantityMutation = defineMutation<{ id: string; quantity: number }, CartItem>({
  name: 'update-cart-quantity',
  mutate: (params) => cartApi.updateQuantity(params),
});

export const removeFromCartMutation = defineMutation<{ id: string }, void>({
  name: 'remove-from-cart',
  mutate: (params) => cartApi.removeItem(params),
});
