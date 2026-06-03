import { useEffect, useState } from 'react';
import type { IgrsGame, SteamSearchResult } from '@/shared/types';

type SteamMatchLookup = (game: IgrsGame) => Promise<SteamSearchResult>;

export function useSteamMatch(game: IgrsGame | null, lookup: SteamMatchLookup): SteamSearchResult | null {
  const [steamMatch, setSteamMatch] = useState<SteamSearchResult | null>(null);

  useEffect(() => {
    if (!game) {
      setSteamMatch(null);
      return;
    }

    setSteamMatch(null);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void lookup(game)
        .then(result => {
          if (!cancelled) setSteamMatch(result);
        })
        .catch(() => {
          if (!cancelled) setSteamMatch({ status: 'none', match: null, candidates: [] });
        });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [game, lookup]);

  return steamMatch;
}
