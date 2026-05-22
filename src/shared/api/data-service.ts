import { EXTRA_FIELD_PATCHED_TOKEN, JSON_BASE } from '@/core/constants';
import {
  assertGamesPayload,
  assertMetaPayload,
  createDataError,
  normalizeExtraPayload,
  normalizeSteamMetaPayload
} from '@/core/data-contracts';
import type { ExtraPayload, IgrsData, IgrsGame } from '@/shared/types';

const DATA_FETCH_TIMEOUT_MS = 10000;

interface FetchJsonOptions<T> {
  fallback?: T;
  required?: boolean;
  validate?: (value: unknown) => T;
}

export function getExtraGames(extraData: ExtraPayload | null): ExtraPayload['games'] | null {
  if (Array.isArray(extraData?.games)) return extraData.games;
  return null;
}

export function mergeExtraGameData(gameList: IgrsGame[], extraData: ExtraPayload | null): IgrsGame[] {
  const extraGames = getExtraGames(extraData);
  if (!Array.isArray(extraGames) || !Array.isArray(gameList)) return gameList;

  const extraById = new Map(
    extraGames
      .filter(entry => Number.isFinite(entry.id))
      .map(entry => [entry.id, entry])
  );

  return gameList.map(game => {
    const extra = extraById.get(game.id);
    if (!extra) return game;
    return {
      ...game,
      ...(extra.videoUrl !== undefined ? { videoUrl: extra.videoUrl } : {}),
      ...(extra.inGameUrl !== undefined ? { inGameUrl: extra.inGameUrl } : {})
    };
  });
}

export function patchEmptyExtraFields(gameList: IgrsGame[], extraData: ExtraPayload | null): IgrsGame[] {
  const extraGames = getExtraGames(extraData);
  if (!Array.isArray(gameList) || !Array.isArray(extraGames) || extraGames.length !== 0) {
    return gameList;
  }

  return gameList.map(game => ({
    ...game,
    videoUrl: game.videoUrl || EXTRA_FIELD_PATCHED_TOKEN,
    inGameUrl: game.inGameUrl || EXTRA_FIELD_PATCHED_TOKEN
  }));
}

export async function fetchJsonResource<T>(url: string, options: FetchJsonOptions<T> = {}): Promise<T> {
  const {
    fallback,
    required = true,
    validate = value => value as T
  } = options;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DATA_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      if (!required && fallback !== undefined) return fallback;
      throw createDataError('DATA_FETCH_FAILED', `Failed to load ${url}`);
    }
    return validate(await response.json());
  } catch (error) {
    if (!required && fallback !== undefined) return fallback;
    if (error && typeof error === 'object' && 'code' in error) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createDataError('DATA_FETCH_TIMEOUT', `Timed out loading ${url}`);
    }
    throw createDataError('DATA_FETCH_FAILED', `Failed to load ${url}`);
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function loadIgrsData(options: { unlocked?: boolean } = {}): Promise<IgrsData> {
  const unlocked = Boolean(options.unlocked);
  const extraPromise = unlocked
    ? fetchJsonResource(`${JSON_BASE}/igrs.extra.json`, {
      fallback: null,
      required: false,
      validate: normalizeExtraPayload
    })
    : Promise.resolve(null);

  const [meta, gamesPayload, steamMeta, extraData] = await Promise.all([
    fetchJsonResource(`${JSON_BASE}/igrs.meta.json`, { validate: assertMetaPayload }),
    fetchJsonResource(`${JSON_BASE}/igrs.games.json`, { validate: assertGamesPayload }),
    fetchJsonResource(`${JSON_BASE}/steam.meta.json`, {
      fallback: { contentDescriptors: {} },
      required: false,
      validate: normalizeSteamMetaPayload
    }),
    extraPromise
  ]);

  const games = mergeExtraGameData(patchEmptyExtraFields(gamesPayload, extraData), extraData);
  return { games, meta, steamMeta };
}
