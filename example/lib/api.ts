/**
 * Mock API functions for the examples
 */

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  likes: number;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartSummary {
  totalItems: number;
  totalPrice: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let todos: Todo[] = [
  { id: '1', title: 'Learn query-optimistic', completed: false, createdAt: '2024-01-01T10:00:00Z' },
  { id: '2', title: 'Build an awesome app', completed: false, createdAt: '2024-01-01T11:00:00Z' },
  { id: '3', title: 'Deploy to production', completed: false, createdAt: '2024-01-01T12:00:00Z' },
];

let user: User = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  bio: 'Software developer passionate about building great user experiences.',
};

let posts: Post[] = Array.from({ length: 50 }, (_, i) => ({
  id: `post-${i + 1}`,
  authorId: `author-${(i % 5) + 1}`,
  authorName: `Author ${(i % 5) + 1}`,
  content: `This is post #${i + 1}. Lorem ipsum dolor sit amet.`,
  likes: Math.floor(Math.random() * 100),
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

let cartItems: CartItem[] = [
  { id: 'cart-1', productId: 'prod-1', name: 'Wireless Headphones', price: 99.99, quantity: 1 },
  { id: 'cart-2', productId: 'prod-2', name: 'USB-C Cable', price: 19.99, quantity: 2 },
];

export const todoApi = {
  async getAll(): Promise<Todo[]> {
    await delay(500);
    return [...todos];
  },
  async create(params: { title: string }): Promise<Todo> {
    await delay(800);
    const newTodo: Todo = {
      id: `todo-${Date.now()}`,
      title: params.title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    todos = [newTodo, ...todos];
    return newTodo;
  },
  async update(params: { id: string; title?: string; completed?: boolean }): Promise<Todo> {
    await delay(500);
    const index = todos.findIndex((t) => t.id === params.id);
    if (index === -1) throw new Error('Todo not found');
    todos[index] = { ...todos[index], ...params };
    return todos[index];
  },
  async delete(params: { id: string }): Promise<void> {
    await delay(500);
    todos = todos.filter((t) => t.id !== params.id);
  },
};

export const userApi = {
  async get(params: { id: string }): Promise<User> {
    await delay(500);
    if (params.id !== user.id) throw new Error('User not found');
    return { ...user };
  },
  async update(params: { id: string; name?: string; email?: string; bio?: string }): Promise<User> {
    await delay(800);
    if (params.id !== user.id) throw new Error('User not found');
    user = { ...user, ...params };
    return { ...user };
  },
};

export const postsApi = {
  async getPage(params: { page: number; limit?: number }): Promise<Post[]> {
    await delay(600);
    const limit = params.limit || 10;
    const start = (params.page - 1) * limit;
    return posts.slice(start, start + limit);
  },
  async like(params: { id: string }): Promise<Post> {
    await delay(300);
    const index = posts.findIndex((p) => p.id === params.id);
    if (index === -1) throw new Error('Post not found');
    posts[index] = { ...posts[index], likes: posts[index].likes + 1 };
    return posts[index];
  },
};

export const cartApi = {
  async getItems(): Promise<CartItem[]> {
    await delay(500);
    return [...cartItems];
  },
  async getSummary(): Promise<CartSummary> {
    await delay(300);
    return {
      totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    };
  },
  async addItem(params: { productId: string; name: string; price: number }): Promise<CartItem> {
    await delay(600);
    const existing = cartItems.find((item) => item.productId === params.productId);
    if (existing) {
      existing.quantity += 1;
      return { ...existing };
    }
    const newItem: CartItem = {
      id: `cart-${Date.now()}`,
      productId: params.productId,
      name: params.name,
      price: params.price,
      quantity: 1,
    };
    cartItems = [...cartItems, newItem];
    return newItem;
  },
  async updateQuantity(params: { id: string; quantity: number }): Promise<CartItem> {
    await delay(400);
    const index = cartItems.findIndex((item) => item.id === params.id);
    if (index === -1) throw new Error('Item not found');
    cartItems[index] = { ...cartItems[index], quantity: params.quantity };
    return cartItems[index];
  },
  async removeItem(params: { id: string }): Promise<void> {
    await delay(400);
    cartItems = cartItems.filter((item) => item.id !== params.id);
  },
};
