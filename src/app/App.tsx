import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DataProvider } from '@/app/providers/data-provider';
import { LanguageProvider } from '@/app/providers/language-provider';
import { ThemeProvider } from '@/app/providers/theme-provider';
import { APP_BASE_PATH } from '@/core/constants';
import { NotFoundPage } from '@/features/fallback/not-found-page';
import { HomePage } from '@/features/home/home-page';
import { SearchPage } from '@/features/search/search-page';
import { AppShell } from '@/shared/components/app-shell';
import { LoadingState } from '@/shared/components/data-state';
import { RouteErrorBoundary } from '@/shared/components/route-error-boundary';

const RatingsPage = lazy(() =>
  import('@/features/ratings/ratings-page').then((m) => ({ default: m.RatingsPage }))
);
const SteamCheckerPage = lazy(() =>
  import('@/features/steam-checker/steam-checker-page').then((m) => ({ default: m.SteamCheckerPage }))
);
const GamePage = lazy(() =>
  import('@/features/game/game-page').then((m) => ({ default: m.GamePage }))
);

export function App() {
  const routerBasename = APP_BASE_PATH === '/' ? undefined : APP_BASE_PATH;

  return (
    <BrowserRouter basename={routerBasename}>
      <ThemeProvider>
        <LanguageProvider>
          <DataProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/search/" element={<SearchPage />} />
                <Route
                  path="/game/:id"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={<LoadingState label="Loading page…" />}>
                        <GamePage />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/ratings/"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={<LoadingState label="Loading page…" />}>
                        <RatingsPage />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route
                  path="/steamchecker/"
                  element={
                    <RouteErrorBoundary>
                      <Suspense fallback={<LoadingState label="Loading page…" />}>
                        <SteamCheckerPage />
                      </Suspense>
                    </RouteErrorBoundary>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppShell>
          </DataProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
