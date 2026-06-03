/**
 * Web Worker for building the search index off the main thread.
 * Receives game data + meta, runs createGameSearchIndex, and posts back
 * the serialized result (Sets converted to arrays for structured clone).
 */
import { createGameSearchIndex } from '@/core/search-index';
import { descriptorIdsFromGame, ratingIdsFromGame } from '@/shared/lib/ratings';
import { platformIdsFromGame } from '@/shared/lib/platforms';
import type { IgrsGame, IgrsMeta, SearchFacets } from '@/shared/types';

export interface WorkerMessage {
  type: 'build-index';
  games: IgrsGame[];
  meta: IgrsMeta;
}

export interface SerializedSearchIndexItem {
  game: IgrsGame;
  nameNorm: string;
  publisherNorm: string;
  ratingIds: number[];
  descriptorIds: number[];
  platformIds: number[];
  ratingIdArr: number[];
  descriptorIdArr: number[];
  platformIdArr: number[];
  year: string;
}

export interface WorkerResponse {
  type: 'index-ready';
  items: SerializedSearchIndexItem[];
  facets: SearchFacets;
}

export interface WorkerError {
  type: 'error';
  message: string;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, games, meta } = event.data;

  if (type !== 'build-index') return;

  try {
    const index = createGameSearchIndex(games, {
      getDescriptorIds: descriptorIdsFromGame,
      getPlatformIds: (game: IgrsGame) => platformIdsFromGame(meta, game),
      getRatingIds: ratingIdsFromGame,
    });

    // Serialize Set objects as arrays for structured clone transfer
    const serializedItems: SerializedSearchIndexItem[] = index.items.map(item => ({
      game: item.game,
      nameNorm: item.nameNorm,
      publisherNorm: item.publisherNorm,
      ratingIds: item.ratingIds,
      descriptorIds: item.descriptorIds,
      platformIds: item.platformIds,
      ratingIdArr: [...item.ratingIdSet],
      descriptorIdArr: [...item.descriptorIdSet],
      platformIdArr: [...item.platformIdSet],
      year: item.year,
    }));

    const response: WorkerResponse = {
      type: 'index-ready',
      items: serializedItems,
      facets: index.facets,
    };

    self.postMessage(response);
  } catch (error) {
    const errorResponse: WorkerError = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error during index creation',
    };
    self.postMessage(errorResponse);
  }
};
