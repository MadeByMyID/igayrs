/**
 * Platform helpers for IGRS metadata lookups.
 */
import type { IgrsGame, IgrsMeta, Language } from '@/shared/types';

/** Cached reverse lookup: platform label → numeric ID */
let cachedMeta: IgrsMeta | null = null;
let platformNameToId: Map<string, number> | null = null;

function getPlatformNameToIdMap(meta: IgrsMeta): Map<string, number> {
  if (cachedMeta === meta && platformNameToId) return platformNameToId;
  const map = new Map<string, number>();
  for (const [id, value] of Object.entries(meta.platforms || {})) {
    const label = typeof value === 'string' ? value : value.nameEn || value.nameId || value.name;
    if (label) map.set(label, Number.parseInt(id, 10));
  }
  cachedMeta = meta;
  platformNameToId = map;
  return map;
}

export function platformName(meta: IgrsMeta, id: number, lang: Language): string {
  const platform = meta.platforms[String(id)];
  if (!platform) return String(id);
  if (typeof platform === 'string') return platform;
  return lang === 'id'
    ? platform.nameId || platform.nameEn || platform.name || String(id)
    : platform.nameEn || platform.nameId || platform.name || String(id);
}

export function platformIdFromName(meta: IgrsMeta, name: unknown): number | null {
  if (!name) return null;
  const map = getPlatformNameToIdMap(meta);
  return map.get(String(name)) ?? null;
}

export function platformIdsFromGame(meta: IgrsMeta, game: IgrsGame): number[] {
  if (Array.isArray(game.platforms)) {
    return game.platforms.map(id => Number(id)).filter(Number.isFinite);
  }
  if (Array.isArray(game.platformsName)) {
    const ids: number[] = [];
    const seen = new Set<number>();
    for (const name of game.platformsName) {
      const id = platformIdFromName(meta, name);
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return ids;
  }
  return [];
}
