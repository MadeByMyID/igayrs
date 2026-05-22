import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DataProvider } from '@/app/providers/data-provider';
import { LanguageProvider } from '@/app/providers/language-provider';
import { APP_BASE_PATH } from '@/core/constants';
import { NotFoundPage } from '@/features/fallback/not-found-page';
import { HomePage } from '@/features/home/home-page';
import { RatingsPage } from '@/features/ratings/ratings-page';
import { SearchPage } from '@/features/search/search-page';
import { SteamCheckerPage } from '@/features/steam-checker/steam-checker-page';
import { AppShell } from '@/shared/components/app-shell';

export function App() {
  const routerBasename = APP_BASE_PATH === '/' ? undefined : APP_BASE_PATH;

  return (
    <BrowserRouter basename={routerBasename}>
      <LanguageProvider>
        <DataProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search/" element={<SearchPage />} />
              <Route path="/ratings/" element={<RatingsPage />} />
              <Route path="/steamchecker/" element={<SteamCheckerPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppShell>
        </DataProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
