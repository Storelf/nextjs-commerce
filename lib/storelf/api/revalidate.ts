import { TAGS } from 'lib/storelf/constants';
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function revalidateAll(req: NextRequest): Promise<NextResponse> {
  revalidateTag(TAGS.collections);
  revalidateTag(TAGS.products);

  return NextResponse.json({ status: 200 });
}

export async function revalidateProducts(req: NextRequest): Promise<NextResponse> {
  revalidateTag(TAGS.products);

  return NextResponse.json({ status: 200 });
}

export async function revalidateCollections(req: NextRequest): Promise<NextResponse> {
  revalidateTag(TAGS.collections);

  return NextResponse.json({ status: 200 });
}
