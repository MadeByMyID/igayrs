/**
 * Pure extraction functions for deriving typed ID arrays from game objects.
 * Lives in core/ to avoid bidirectional dependencies between core/ and shared/.
 */
import type { IgrsGame, IgrsMeta } from '@/shared/types';

export function ratingIdsFromGame(game: IgrsGame): number[] {
  if (!Array.isArray(game.ratings)) return [];
  return game.ratings.map(id => Number(id)).filter(Number.isFinite);
}

export function descriptorIdsFromGame(game: IgrsGame): number[] {
  if (!Array.isArray(game.descriptors)) return [];
  return game.descriptors.map(id => Number(id)).filter(Number.isFinite);
}

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

function platformIdFromName(meta: IgrsMeta, name: unknown): number | null {
  if (!name) return null;
  const map = getPlatformNameToIdMap(meta);
  return map.get(String(name)) ?? null;
}

export { platformIdFromName };


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
