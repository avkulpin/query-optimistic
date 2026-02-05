'use client';

/**
 * ShoppingCart Example
 *
 * Demonstrates:
 * - Multiple collections/entities in one view
 * - Multi-query optimistic updates
 * - channel.append(), channel.update(), channel.delete()
 * - channel.deleteWhere(), channel.replace()
 */

import { useQuery, useMutation } from 'query-optimistic';
import {
  cartItemsCollection,
  cartSummaryEntity,
  addToCartMutation,
  updateCartQuantityMutation,
  removeFromCartMutation,
} from '@/lib/definitions';

const PRODUCTS = [
  { productId: 'prod-3', name: 'Mechanical Keyboard', price: 149.99 },
  { productId: 'prod-4', name: 'Monitor Stand', price: 79.99 },
  { productId: 'prod-5', name: 'Desk Lamp', price: 39.99 },
];

export function ShoppingCart() {
  const [cartItems, { isLoading: isLoadingItems, isSuccess: itemsSuccess }] =
    useQuery(cartItemsCollection);
  const [summary, { isLoading: isLoadingSummary, isSuccess: summarySuccess }] =
    useQuery(cartSummaryEntity);

  const { mutate: addToCart, isPending: isAdding } = useMutation(addToCartMutation, {
    optimistic: (channel, params) => {
      channel(cartItemsCollection).append(
        {
          id: `temp-${Date.now()}`,
          productId: params.productId,
          name: params.name,
          price: params.price,
          quantity: 1,
        },
        { reconcile: true }
      );
      channel(cartSummaryEntity).update((current) => ({
        totalItems: current.totalItems + 1,
        totalPrice: current.totalPrice + params.price,
      }));
    },
  });

  const { mutate: updateQuantity } = useMutation(updateCartQuantityMutation, {
    optimistic: (channel, params) => {
      const item = cartItems?.find((i) => i.id === params.id);
      if (!item) return;
      const quantityDiff = params.quantity - item.quantity;
      channel(cartItemsCollection).update(params.id, (current) => ({
        ...current,
        quantity: params.quantity,
      }));
      channel(cartSummaryEntity).update((current) => ({
        totalItems: current.totalItems + quantityDiff,
        totalPrice: current.totalPrice + item.price * quantityDiff,
      }));
    },
  });

  const { mutate: removeFromCart } = useMutation(removeFromCartMutation, {
    optimistic: (channel, params) => {
      const item = cartItems?.find((i) => i.id === params.id);
      if (!item) return;
      channel(cartItemsCollection).delete(params.id);
      channel(cartSummaryEntity).update((current) => ({
        totalItems: current.totalItems - item.quantity,
        totalPrice: current.totalPrice - item.price * item.quantity,
      }));
    },
  });

  const { mutate: removeSmallQuantities } = useMutation(removeFromCartMutation, {
    optimistic: (channel) => {
      channel(cartItemsCollection).deleteWhere((item) => item.quantity === 1);
      const remaining = cartItems?.filter((item) => item.quantity > 1) ?? [];
      channel(cartSummaryEntity).replace({
        totalItems: remaining.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: remaining.reduce((sum, item) => sum + item.price * item.quantity, 0),
      });
    },
  });

  if (isLoadingItems || isLoadingSummary) {
    return <div className="loading">Loading cart...</div>;
  }

  return (
    <div className="shopping-cart">
      <h2>Shopping Cart</h2>

      <div className="query-state-info">
        {itemsSuccess && <span className="status-badge success">Items loaded</span>}
        {summarySuccess && <span className="status-badge success">Summary loaded</span>}
      </div>

      <div
        className="cart-summary"
        style={{ opacity: summary?._optimistic?.status === 'pending' ? 0.7 : 1 }}
      >
        <div className="summary-row">
          <span>Items in cart:</span>
          <strong>{summary?.totalItems ?? 0}</strong>
        </div>
        <div className="summary-row total">
          <span>Total:</span>
          <strong>${(summary?.totalPrice ?? 0).toFixed(2)}</strong>
        </div>
      </div>

      <div className="cart-items">
        {cartItems?.length === 0 ? (
          <p className="empty-cart">Your cart is empty</p>
        ) : (
          <ul>
            {cartItems?.map((item) => (
              <li
                key={item.id}
                className="cart-item"
                style={{ opacity: item._optimistic?.status === 'pending' ? 0.6 : 1 }}
              >
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-price">${item.price.toFixed(2)}</span>
                </div>
                <div className="item-actions">
                  <button
                    onClick={() =>
                      updateQuantity({ id: item.id, quantity: Math.max(1, item.quantity - 1) })
                    }
                    disabled={item.quantity <= 1 || item._optimistic?.status === 'pending'}
                  >
                    -
                  </button>
                  <span className="quantity">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity({ id: item.id, quantity: item.quantity + 1 })}
                    disabled={item._optimistic?.status === 'pending'}
                  >
                    +
                  </button>
                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart({ id: item.id })}
                    disabled={item._optimistic?.status === 'pending'}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cartItems && cartItems.length > 0 && (
        <div className="bulk-actions">
          <button
            onClick={() => removeSmallQuantities({ id: '' })}
            disabled={!cartItems.some((item) => item.quantity === 1)}
          >
            Remove items with quantity 1
          </button>
        </div>
      )}

      <div className="add-products">
        <h3>Add to Cart</h3>
        <div className="product-grid">
          {PRODUCTS.map((product) => (
            <div key={product.productId} className="product-card">
              <span className="product-name">{product.name}</span>
              <span className="product-price">${product.price.toFixed(2)}</span>
              <button onClick={() => addToCart(product)} disabled={isAdding}>
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
