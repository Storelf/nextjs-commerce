import { TAGS } from '../constants';
import { makeCheckoutUrl, storelfFetch } from '../core';
import { Cart, CartItem } from '../types';
import { JSONObject } from '../utils/json-api';
import { reshapeFeaturedImage, reshapeMoney } from './reshapers';

function reshapeLineItem(lineItem: JSONObject): CartItem {
  const options = Array.isArray(lineItem.options) ? (lineItem.options as JSONObject[]) : [];

  return {
    id: lineItem.id,
    quantity: lineItem.quantity,
    cost: {
      totalAmount: reshapeMoney(lineItem.total as string)
    },
    merchandise: {
      id: lineItem.variantId,
      title: options.map((option) => option.value as string).join(' | '),
      selectedOptions: options,
      product: {
        id: lineItem.productId,
        handle: lineItem.productId,
        title: lineItem.name,
        featuredImage: reshapeFeaturedImage(lineItem.imageUrl)!
      }
    }
  } as CartItem;
}

function reshapeCart(cart: JSONObject): Cart | undefined {
  if (!cart) {
    return undefined;
  }
  const lineItems = cart.lineItems as JSONObject[];

  return {
    id: cart.token,
    checkoutUrl: makeCheckoutUrl(cart.id as string, cart.token as string),
    cost: {
      totalAmount: reshapeMoney(cart.total as string),
      // Subtotal and tax are not exposed by API at storefront
      subtotalAmount: reshapeMoney('0.0'),
      totalTaxAmount: reshapeMoney('0.0')
    },
    lines: lineItems?.map(reshapeLineItem) || [],
    totalQuantity: lineItems?.reduce((acc, lineItem) => acc + Number(lineItem.quantity), 0) || 0
  } as Cart;
}

export async function getCart(cartToken?: string): Promise<Cart | undefined> {
  if (!cartToken) {
    return undefined;
  }

  const response = await storelfFetch({
    endpoint: `/api/v1/plugin/orders/${cartToken}`,
    method: 'GET',
    tags: [TAGS.cart],
    params: {
      include: 'line-items'
    },
    cache: 'no-store'
  });

  return reshapeCart(response.data as JSONObject);
}

export async function createCart(): Promise<Cart> {
  const response = await storelfFetch({
    endpoint: '/api/v1/plugin/cart',
    method: 'PATCH',
    params: {
      include: 'line-items'
    },
    cache: 'no-store'
  });

  const cart = reshapeCart(response.data as JSONObject);
  if (!cart) {
    throw new Error('Failed to create cart');
  }
  return cart;
}

export async function addToCart(
  lines: { merchandiseId: string; quantity: number }[]
): Promise<Cart | undefined> {
  const cart = await getCart();
  const cartToken = cart?.id;

  const response = await storelfFetch({
    endpoint: '/api/v1/plugin/cart',
    method: 'PATCH',
    params: {
      order_token: cartToken,
      line_items: lines.map((line) => ({ variant_id: line.merchandiseId, quantity: line.quantity })),
      include: 'line-items'
    },
    cache: 'no-store'
  });

  return reshapeCart(response.data as JSONObject);
}

export async function removeFromCart(lineIds: string[]): Promise<void> {
  const cart = await getCart();
  const cartToken = cart?.id;

  if (!cartToken) {
    throw new Error('No cart found');
  }

  for (const lineId of lineIds) {
    await storelfFetch({
      endpoint: `/api/v1/plugin/cart/line_items/${lineId}`,
      method: 'DELETE',
      params: {
        order_token: cartToken
      },
      cache: 'no-store'
    });
  }
}

export async function updateCart(
  lines: { id: string; merchandiseId: string; quantity: number }[]
): Promise<Cart | undefined> {
  const cart = await getCart();
  const cartToken = cart?.id;

  if (!cartToken) {
    throw new Error('No cart found');
  }

  for (const line of lines) {
    await storelfFetch({
      endpoint: `/api/v1/plugin/cart/line_items/${line.id}`,
      method: 'PATCH',
      params: {
        order_token: cartToken,
        line_item: { variant_id: line.merchandiseId, quantity: line.quantity },
        include: 'line-items'
      },
      cache: 'no-store'
    });
  }

  return getCart(cartToken);
}

export async function deleteCart(cartToken: string): Promise<void> {
  const response = await storelfFetch({
    endpoint: `/api/v1/plugin/orders/${cartToken}`,
    method: 'DELETE',
    tags: [TAGS.cart],
    params: {
      include: 'line-items'
    },
    cache: 'no-store'
  });
}
