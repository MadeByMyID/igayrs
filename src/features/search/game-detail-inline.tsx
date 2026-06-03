import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { createSteamApi } from '@/shared/api/steam-api';
import { GameDetailView } from '@/shared/components/game-detail-view';
import { recordRecentlyViewed } from '@/shared/hooks/use-recently-viewed';
import { useSteamMatch } from '@/shared/hooks/use-steam-match';
import type { IgrsGame, IgrsMeta } from '@/shared/types';
import pageStyles from './search-page.module.css';

interface GameDetailInlineProps {
  allGames?: IgrsGame[];
  game: IgrsGame;
  lang: 'en' | 'id';
  meta: IgrsMeta;
  onBack: () => void;
  steamApi: ReturnType<typeof createSteamApi>;
  t: (key: string) => string;
}

export function GameDetailInline({ allGames, game, lang, meta, onBack, steamApi, t }: GameDetailInlineProps) {
  const steamMatch = useSteamMatch(game, steamApi.findSteamMatchForGame);

  useEffect(() => {
    recordRecentlyViewed(game.id);
  }, [game.id]);

  return (
    <>
      <button className={pageStyles.detailBack} type="button" onClick={onBack}>
        <ChevronLeft className="ui-icon" aria-hidden="true" />
        {t('detail.back')}
      </button>
      <GameDetailView allGames={allGames} game={game} lang={lang} meta={meta} steamMatch={steamMatch} t={t} />
    </>
  );
}
