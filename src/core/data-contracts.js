const USER_SAFE_DATA_MESSAGE = 'Unable to load the game database. Please refresh or try again later.';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function createDataError(code, message) {
  const error = new Error(message);
  error.name = 'DataContractError';
  error.code = code;
  error.userMessage = USER_SAFE_DATA_MESSAGE;
  return error;
}

function assertObjectMap(value, code, label) {
  if (!isPlainObject(value)) throw createDataError(code, `Invalid ${label} payload`);
}

export function assertMetaPayload(payload) {
  assertObjectMap(payload, 'DATA_INVALID_META', 'metadata');
  assertObjectMap(payload.ratings, 'DATA_INVALID_META', 'ratings');
  assertObjectMap(payload.descriptors, 'DATA_INVALID_META', 'descriptors');
  assertObjectMap(payload.platforms, 'DATA_INVALID_META', 'platforms');
  return payload;
}

export function assertGamesPayload(payload) {
  if (!Array.isArray(payload)) throw createDataError('DATA_INVALID_GAMES', 'Games payload must be an array');

  for (const [index, game] of payload.entries()) {
    if (!isPlainObject(game)) throw createDataError('DATA_INVALID_GAMES', `Game at index ${index} must be an object`);
    if (!Number.isFinite(game.id)) throw createDataError('DATA_INVALID_GAMES', `Game at index ${index} has an invalid id`);
    if (typeof game.name !== 'string' || !game.name.trim()) throw createDataError('DATA_INVALID_GAMES', `Game ${game.id} has an invalid name`);
    if (typeof game.publisherName !== 'string' || !game.publisherName.trim()) throw createDataError('DATA_INVALID_GAMES', `Game ${game.id} has an invalid publisher`);
    if (!Number.isFinite(game.releaseYear)) throw createDataError('DATA_INVALID_GAMES', `Game ${game.id} has an invalid release year`);
    if (game.ratings !== undefined && !Array.isArray(game.ratings)) throw createDataError('DATA_INVALID_GAMES', `Game ${game.id} has invalid ratings`);
    if (game.descriptors !== undefined && !Array.isArray(game.descriptors)) throw createDataError('DATA_INVALID_GAMES', `Game ${game.id} has invalid descriptors`);
    if (game.platforms !== undefined && !Array.isArray(game.platforms)) throw createDataError('DATA_INVALID_GAMES', `Game ${game.id} has invalid platforms`);
    if (game.platformsName !== undefined && !Array.isArray(game.platformsName)) throw createDataError('DATA_INVALID_GAMES', `Game ${game.id} has invalid platform names`);
  }

  return payload;
}

export function normalizeSteamMetaPayload(payload) {
  if (!isPlainObject(payload) || !isPlainObject(payload.contentDescriptors)) {
    return { contentDescriptors: {} };
  }
  return payload;
}

export function normalizeExtraPayload(payload) {
  if (payload === null || payload === undefined) return null;
  const entries = Array.isArray(payload) ? payload : Array.isArray(payload?.games) ? payload.games : null;
  if (!Array.isArray(entries)) return null;

  const games = [];
  for (const entry of entries) {
    if (!isPlainObject(entry)) continue;
    const id = toFiniteNumber(entry.id);
    if (id === null) continue;
    const normalized = { id };
    if (entry.videoUrl !== undefined) normalized.videoUrl = entry.videoUrl;
    if (entry.inGameUrl !== undefined) normalized.inGameUrl = entry.inGameUrl;
    games.push(normalized);
  }

  return { games };
}
