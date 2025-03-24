import { TAGS } from '../constants';
import { storelfFetch } from '../core';
import { Collection } from '../types';
import { JSONObject, ParsedJSONApiData } from '../utils/json-api';

function reshapeCollection(collection: JSONObject): Collection {
  return {
    handle: collection.id,
    title: collection.name,
    description: collection.metaDescription,
    seo: {
      title: collection.metaTitle,
      description: collection.metaDescription
    },
    updatedAt: collection.createdAt,
    path: `/search/${collection.id}`
  } as unknown as Collection;
}

function reshapeCollections(collectionsResponse: ParsedJSONApiData): Collection[] {
  if (!Array.isArray(collectionsResponse.data)) {
    return [];
  }

  return collectionsResponse.data.map(reshapeCollection);
}

export async function getCollections(): Promise<Collection[]> {
  const response = await storelfFetch({
    endpoint: '/api/v1/plugin/categories',
    method: 'GET',
    tags: [TAGS.collections]
  });

  return reshapeCollections(response);
}

export async function getCollection(handle: string): Promise<Collection> {
  const response = await storelfFetch({
    endpoint: `/api/v1/plugin/categories/${handle}`,
    method: 'GET',
    tags: [TAGS.collections]
  });

  return reshapeCollection(response.data as JSONObject);
}
