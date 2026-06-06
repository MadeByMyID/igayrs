import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useDetailPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastScrollYRef = useRef(0);

  const detailId = useMemo(() => {
    const match = location.hash.match(/^#(\d+)$/);
    return match ? Number.parseInt(match[1] ?? '', 10) : null;
  }, [location.hash]);

  const showDetail = useCallback((id: number) => {
    lastScrollYRef.current = window.scrollY;
    navigate({ pathname: '/search/', search: location.search, hash: `#${id}` });
  }, [location.search, navigate]);

  const hideDetail = useCallback(() => {
    navigate({ pathname: '/search/', search: location.search }, { replace: true });
    window.requestAnimationFrame(() => window.scrollTo({ top: lastScrollYRef.current, behavior: 'auto' }));
  }, [location.search, navigate]);

  return { detailId, showDetail, hideDetail };
}
