export type Language = 'en' | 'id';

export interface RatingMeta {
  name: string;
  weight?: number;
  color?: string;
  titleEn?: string;
  titleId?: string;
  contentEn?: string;
  contentId?: string;
}

export interface DescriptorMeta {
  nameEn?: string;
  nameId?: string;
  description?: string;
}

export interface PlatformMeta {
  name?: string;
  nameEn?: string;
  nameId?: string;
}

export interface IgrsMeta {
  meta?: {
    generatedAt?: string;
    totalGames?: number;
  };
  ratings: Record<string, RatingMeta>;
  descriptors: Record<string, DescriptorMeta>;
  platforms: Record<string, string | PlatformMeta>;
}

export interface IgrsGame {
  id: number;
  name: string;
  publisherName: string;
  releaseYear: number;
  description?: string;
  ratings?: number[];
  descriptors?: number[];
  platforms?: number[];
  platformsName?: string[];
  videoUrl?: string | null;
  inGameUrl?: string | null;
}

export interface ExtraGame {
  id: number;
  videoUrl?: string | null;
  inGameUrl?: string | null;
}

export interface ExtraPayload {
  games: ExtraGame[];
}

export interface SteamDescriptorMeta {
  igrsDescriptorIds?: number[];
  ratingId?: number;
  name?: string;
  nameEn?: string;
  nameId?: string;
}

export interface SteamMeta {
  contentDescriptors: Record<string, SteamDescriptorMeta>;
}

export interface IgrsData {
  games: IgrsGame[];
  gamesById: Map<number, IgrsGame>;
  /** Normalized game name → game for O(1) exact-match lookups */
  gamesByNormalizedName: Map<string, IgrsGame>;
  meta: IgrsMeta;
  steamMeta: SteamMeta;
  /** Pre-computed stats to avoid recalculating on every render */
  stats: {
    publisherCount: number;
    platformCount: number;
  };
}

export interface SearchIndexItem {
  game: IgrsGame;
  nameNorm: string;
  publisherNorm: string;
  ratingIds: number[];
  descriptorIds: number[];
  platformIds: number[];
  /** Pre-built Sets for O(1) filter lookups */
  ratingIdSet: Set<number>;
  descriptorIdSet: Set<number>;
  platformIdSet: Set<number>;
  year: string;
}

export interface SearchFacets {
  ratingCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  descriptorCounts: Record<string, number>;
  yearCounts: Record<string, number>;
}

export interface SearchIndex {
  items: SearchIndexItem[];
  facets: SearchFacets;
}

export type SearchSort = 'relevance' | 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc' | 'rating-desc' | 'rating-asc';

export interface SearchState {
  query: string;
  publisher: string;
  ratings: Set<number>;
  platforms: Set<number>;
  descriptors: Set<number>;
  years: Set<string>;
  page: number;
  sort: SearchSort;
}

export interface SteamSearchCandidate {
  appId: string;
  name: string;
  type: 'app';
}

export interface ScoredSteamSearchCandidate extends SteamSearchCandidate {
  score: number;
}

export type SteamSearchResult =
  | { status: 'none'; match: null; candidates: [] }
  | { status: 'ambiguous'; match: null; candidates: ScoredSteamSearchCandidate[] }
  | { status: 'match'; match: ScoredSteamSearchCandidate; candidates: ScoredSteamSearchCandidate[] };

export interface SteamReviewSummary {
  numReviews: number;
  positivePercent: number | null;
  reviewScore: number;
  reviewScoreDesc: string;
  totalNegative: number;
  totalPositive: number;
  totalReviews: number;
}

export interface SteamRatingPayload {
  rating?: string;
  required_age?: number | string;
  banned?: boolean | string | number;
  rating_generated?: boolean | string | number;
  descriptors?: string;
}

export interface SteamGameDetails {
  name?: string;
  developers?: string[];
  publishers?: string[];
  detailed_description?: string;
  about_the_game?: string;
  short_description?: string;
  header_image?: string;
  type?: string;
  is_free?: boolean;
  support_info?: {
    url?: string;
  };
  release_date?: {
    date?: string;
  };
  ratings?: {
    igrs?: SteamRatingPayload;
  };
  content_descriptors?: {
    ids?: number[];
  };
  genres?: Array<{ id?: string | number; description?: string }>;
  categories?: Array<{ id?: string | number; description?: string }>;
  platforms?: {
    windows?: boolean;
    mac?: boolean;
    linux?: boolean;
  };
  price_overview?: {
    currency?: string;
    initial?: number;
    final?: number;
    discount_percent?: number;
    final_formatted?: string;
    initial_formatted?: string;
  };
  metacritic?: {
    score?: number;
    url?: string;
  };
  required_age?: number | string;
}

export interface SteamAppDetailsResponse {
  success?: boolean;
  data?: SteamGameDetails;
}

export type SteamAppDetailsPayload = Record<string, SteamAppDetailsResponse>;
