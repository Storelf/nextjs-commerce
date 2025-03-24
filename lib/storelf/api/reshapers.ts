import { makeApiFullUrl } from 'lib/storelf/core';
import { Image } from '../types';

const imageStub = { url: '/product-icon.png', altText: '' };

export function reshapeMoney(amount: string, currencyCode = 'USD') {
  return { amount, currencyCode };
}

export function reshapeFeaturedImage(imagePath: unknown, altText: string = ''): Image {
  if (!(typeof imagePath === 'string') || !imagePath) {
    return imageStub;
  }
  try {
    const url = makeApiFullUrl(imagePath);
    return { url, altText };
  } catch (error) {
    console.warn('Invalid image URL:', imagePath);
    return imageStub;
  }
}
