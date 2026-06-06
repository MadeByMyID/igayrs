/**
 * Rating and descriptor helpers for IGRS metadata lookups.
 */
import { IMAGE_BASE } from '@/core/constants';
import type { IgrsMeta, Language } from '@/shared/types';

export { descriptorIdsFromGame, ratingIdsFromGame } from '@/core/game-extractors';

export const IMG_RATING = (id: number): string => `${IMAGE_BASE}/ratings/${id}.png`;
export const IMG_RATING_WEBP = (id: number): string => `${IMAGE_BASE}/ratings/${id}.webp`;
export const IMG_DESCRIPTOR = (id: number): string => `${IMAGE_BASE}/descriptors/cc-${id}.png`;
export const IMG_DESCRIPTOR_WEBP = (id: number): string => `${IMAGE_BASE}/descriptors/cc-${id}.webp`;

export function ratingName(meta: IgrsMeta, id: number): string {
  return meta.ratings[String(id)]?.name || '?';
}

export function ratingWeight(meta: IgrsMeta, id: number): number {
  return meta.ratings[String(id)]?.weight || 0;
}

export function ratingTitle(meta: IgrsMeta, id: number, lang: Language): string {
  const rating = meta.ratings[String(id)];
  if (!rating) return '';
  return lang === 'id'
    ? rating.titleId || rating.titleEn || rating.name
    : rating.titleEn || rating.titleId || rating.name;
}

export function ratingContent(meta: IgrsMeta, id: number, lang: Language): string {
  const rating = meta.ratings[String(id)];
  if (!rating) return '';
  return lang === 'id'
    ? rating.contentId || rating.contentEn || ''
    : rating.contentEn || rating.contentId || '';
}

export function descriptorName(meta: IgrsMeta, id: number, lang: Language): string {
  const descriptor = meta.descriptors[String(id)];
  if (!descriptor) return '?';
  return lang === 'id'
    ? descriptor.nameId || descriptor.nameEn || '?'
    : descriptor.nameEn || descriptor.nameId || '?';
}
