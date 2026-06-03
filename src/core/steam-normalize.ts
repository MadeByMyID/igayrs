/**
 * Normalizes raw Steam appdetails response into a structured, safe format.
 * Extracts additional fields (genres, categories, platforms, pricing, metacritic)
 * that the raw SteamGameDetails type doesn't cover.
 */

import type { SteamGameDetails } from '@/shared/types';

export interface SteamGenre {
  id: string;
  description: string;
}

export interface SteamCategory {
  id: string;
  description: string;
}

export interface SteamPlatforms {
  windows: boolean;
  mac: boolean;
  linux: boolean;
}

export interface SteamPriceOverview {
  currency: string;
  initial: number;
  final: number;
  discountPercent: number;
  formattedFinal: string;
  formattedInitial: string;
}

export interface SteamMetacritic {
  score: number;
  url: string;
}

export interface NormalizedSteamDetails {
  /** Game type: "game", "dlc", "demo", "mod", etc. */
  type: string;
  /** Whether the game is free to play */
  isFree: boolean;
  /** Short description (plain text, max ~300 chars) */
  shortDescription: string;
  /** Header/banner image URL */
  headerImage: string | null;
  /** Game genres (Action, RPG, etc.) */
  genres: SteamGenre[];
  /** Game categories (Single-player, Multi-player, Controller support, etc.) */
  categories: SteamCategory[];
  /** Platform availability */
  platforms: SteamPlatforms;
  /** Price info (null if free or unavailable) */
  price: SteamPriceOverview | null;
  /** Metacritic score (null if unavailable) */
  metacritic: SteamMetacritic | null;
  /** Required age from Steam (0 = no restriction) */
  requiredAge: number;
  /** Whether the game is banned in IGRS context */
  isBanned: boolean;
}

function toSafeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toSafeBool(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function normalizeGenres(raw: unknown): SteamGenre[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map(item => ({
      id: String(item.id || ''),
      description: toSafeString(item.description)
    }))
    .filter(g => g.id && g.description);
}

function normalizeCategories(raw: unknown): SteamCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map(item => ({
      id: String(item.id || ''),
      description: toSafeString(item.description)
    }))
    .filter(c => c.id && c.description);
}

function normalizePlatforms(raw: unknown): SteamPlatforms {
  if (!raw || typeof raw !== 'object') return { windows: false, mac: false, linux: false };
  const obj = raw as Record<string, unknown>;
  return {
    windows: toSafeBool(obj.windows),
    mac: toSafeBool(obj.mac),
    linux: toSafeBool(obj.linux)
  };
}

function normalizePrice(raw: unknown): SteamPriceOverview | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const final = toSafeNumber(obj.final);
  if (!final && !toSafeNumber(obj.initial)) return null;
  return {
    currency: toSafeString(obj.currency) || 'USD',
    initial: toSafeNumber(obj.initial),
    final,
    discountPercent: toSafeNumber(obj.discount_percent),
    formattedFinal: toSafeString(obj.final_formatted),
    formattedInitial: toSafeString(obj.initial_formatted)
  };
}

function normalizeMetacritic(raw: unknown): SteamMetacritic | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const score = toSafeNumber(obj.score);
  if (!score) return null;
  return {
    score,
    url: toSafeString(obj.url)
  };
}

/**
 * Extracts and normalizes additional Steam data from the raw appdetails response.
 */
export function normalizeSteamExtras(rawData: SteamGameDetails | null | undefined): NormalizedSteamDetails {
  const data = rawData || {};

  return {
    type: toSafeString(data.type) || 'game',
    isFree: toSafeBool(data.is_free),
    shortDescription: toSafeString(data.short_description),
    headerImage: toSafeString(data.header_image) || null,
    genres: normalizeGenres(data.genres),
    categories: normalizeCategories(data.categories),
    platforms: normalizePlatforms(data.platforms),
    price: normalizePrice(data.price_overview),
    metacritic: normalizeMetacritic(data.metacritic),
    requiredAge: toSafeNumber(data.required_age),
    isBanned: toSafeBool(data.ratings?.igrs?.banned)
  };
}
