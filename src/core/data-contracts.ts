import * as v from 'valibot';
import type { ExtraPayload, IgrsGame, IgrsMeta, SteamMeta } from '@/shared/types';

const USER_SAFE_DATA_MESSAGE = 'Unable to load the game database. Please refresh or try again later.';

const NullableStringSchema = v.nullish(v.string());
const NumberArraySchema = v.array(v.number());
const PlatformSchema = v.union([
  v.string(),
  v.looseObject({
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    nameId: v.optional(v.string())
  })
]);

const GameSchema = v.looseObject({
  id: v.number(),
  name: v.string(),
  publisherName: v.string(),
  releaseYear: v.number(),
  description: v.optional(v.string()),
  ratings: v.optional(NumberArraySchema),
  descriptors: v.optional(NumberArraySchema),
  platforms: v.optional(NumberArraySchema),
  platformsName: v.optional(v.array(v.string())),
  videoUrl: v.optional(NullableStringSchema),
  inGameUrl: v.optional(NullableStringSchema)
});

const MetaSchema = v.looseObject({
  meta: v.optional(v.looseObject({
    generatedAt: v.optional(v.string()),
    totalGames: v.optional(v.number())
  })),
  ratings: v.record(v.string(), v.looseObject({
    name: v.string(),
    weight: v.optional(v.number()),
    titleEn: v.optional(v.string()),
    titleId: v.optional(v.string()),
    contentEn: v.optional(v.string()),
    contentId: v.optional(v.string())
  })),
  descriptors: v.record(v.string(), v.looseObject({
    nameEn: v.optional(v.string()),
    nameId: v.optional(v.string()),
    description: v.optional(v.string())
  })),
  platforms: v.record(v.string(), PlatformSchema)
});

const SteamMetaSchema = v.looseObject({
  contentDescriptors: v.record(v.string(), v.looseObject({
    igrsDescriptorIds: v.optional(v.array(v.number())),
    ratingId: v.optional(v.number()),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    nameId: v.optional(v.string())
  }))
});

export interface DataContractError extends Error {
  code: string;
  userMessage: string;
}

function hasObjectShape(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function createDataError(code: string, message: string): DataContractError {
  const error = new Error(message) as DataContractError;
  error.name = 'DataContractError';
  error.code = code;
  error.userMessage = USER_SAFE_DATA_MESSAGE;
  return error;
}

function assertSafeParse<T>(result: v.SafeParseResult<v.BaseSchema<unknown, T, v.BaseIssue<unknown>>>, code: string, message: string): T {
  if (!result.success) throw createDataError(code, message);
  return result.output;
}

export function assertMetaPayload(payload: unknown): IgrsMeta {
  return assertSafeParse(v.safeParse(MetaSchema, payload), 'DATA_INVALID_META', 'Invalid metadata payload') as IgrsMeta;
}

export function assertGamesPayload(payload: unknown): IgrsGame[] {
  if (!Array.isArray(payload)) throw createDataError('DATA_INVALID_GAMES', 'Games payload must be an array');
  const games: IgrsGame[] = [];

  for (const [index, game] of payload.entries()) {
    const parsed = v.safeParse(GameSchema, game);
    if (!parsed.success) throw createDataError('DATA_INVALID_GAMES', `Game at index ${index} has an invalid shape`);
    if (!parsed.output.name.trim()) throw createDataError('DATA_INVALID_GAMES', `Game ${parsed.output.id} has an invalid name`);
    if (!parsed.output.publisherName.trim()) throw createDataError('DATA_INVALID_GAMES', `Game ${parsed.output.id} has an invalid publisher`);
    if (!Number.isFinite(parsed.output.releaseYear)) throw createDataError('DATA_INVALID_GAMES', `Game ${parsed.output.id} has an invalid release year`);
    games.push(parsed.output as IgrsGame);
  }

  return games;
}

export function normalizeSteamMetaPayload(payload: unknown): SteamMeta {
  const parsed = v.safeParse(SteamMetaSchema, payload);
  if (!parsed.success) return { contentDescriptors: {} };
  return parsed.output as SteamMeta;
}

export function normalizeExtraPayload(payload: unknown): ExtraPayload | null {
  if (payload === null || payload === undefined) return null;
  const entries = Array.isArray(payload)
    ? payload
    : hasObjectShape(payload) && Array.isArray(payload.games)
      ? payload.games
      : null;
  if (!Array.isArray(entries)) return null;

  const games = [];
  for (const entry of entries) {
    if (!hasObjectShape(entry)) continue;
    const id = toFiniteNumber(entry.id);
    if (id === null) continue;
    const normalized: ExtraPayload['games'][number] = { id };
    if (entry.videoUrl !== undefined) normalized.videoUrl = typeof entry.videoUrl === 'string' ? entry.videoUrl : null;
    if (entry.inGameUrl !== undefined) normalized.inGameUrl = typeof entry.inGameUrl === 'string' ? entry.inGameUrl : null;
    games.push(normalized);
  }

  return { games };
}
