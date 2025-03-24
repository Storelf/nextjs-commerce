import { storelfFetch } from '../core';
import { Page, SEO} from '../types';
import {JSONObject} from "../utils/json-api";

function reshapePage(page: JSONObject): Page {
  return {
    ...page,
    seo: page.seo as SEO,
  } as unknown as Page;
}

export async function getPage(handle: string): Promise<Page> {
    const response = await storelfFetch({
        endpoint: `/api/v1/plugin/pages/${handle}`,
        method: 'GET',
    });
    return reshapePage(response as JSONObject);
}

export async function getPages(): Promise<Page[]> {
    const response = await storelfFetch({
        endpoint: '/api/v1/plugin/pages',
        method: 'GET',
    });
    if (!Array.isArray(response.data)) {
        return [];
    }
    return response.data.map(reshapePage) as Page[];
}