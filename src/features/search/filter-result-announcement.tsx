import { useEffect, useRef, useState } from 'react';

const ANNOUNCEMENT_DEBOUNCE_MS = 500;

interface FilterResultAnnouncementProps {
  /** Current number of filtered results */
  resultCount: number;
  /** Translation function */
  t: (key: string) => string;
}

/**
 * Visually hidden aria-live region that announces the filtered result count
 * to screen readers. Debounces announcements to avoid excessive interruptions
 * during rapid filter changes or typing.
 */
export function FilterResultAnnouncement({ resultCount, t }: FilterResultAnnouncementProps) {
  const [announcement, setAnnouncement] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the initial render to avoid announcing on page load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const text = t('search.stats')
        .replace('{count}', String(resultCount));
      setAnnouncement(text);
    }, ANNOUNCEMENT_DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resultCount, t]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {announcement}
    </div>
  );
}
