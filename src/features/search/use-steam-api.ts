import { useState } from 'react';
import { useLanguage } from '@/app/providers/language-provider';
import { createSteamApi } from '@/shared/api/steam-api';

export function useSteamApi(): ReturnType<typeof createSteamApi> {
  const { t } = useLanguage();
  // Use useState with lazy initializer so the Steam API instance (and its
  // internal LRU cache) is created exactly once and persists across re-renders.
  // The `t` function is captured at creation for error messages only — acceptable
  // tradeoff to avoid destroying the cache on every language toggle.
  const [api] = useState(() => createSteamApi({ t }));
  return api;
}
