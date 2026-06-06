/**
 * Platform helpers for IGRS metadata lookups.
 */
import type { IgrsMeta, Language } from '@/shared/types';

export { platformIdsFromGame, platformIdFromName } from '@/core/game-extractors';

export function platformName(meta: IgrsMeta, id: number, lang: Language): string {
  const platform = meta.platforms[String(id)];
  if (!platform) return String(id);
  if (typeof platform === 'string') return platform;
  return lang === 'id'
    ? platform.nameId || platform.nameEn || platform.name || String(id)
    : platform.nameEn || platform.nameId || platform.name || String(id);
}
