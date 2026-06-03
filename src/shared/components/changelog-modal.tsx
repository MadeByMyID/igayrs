import { X } from 'lucide-react';
import { useEffect } from 'react';

const GITHUB_REPO = 'https://github.com/NatsumeAoii/IGRS2nd';

interface ChangelogEntry {
  version: string;
  date?: string;
  sections: { title: string; items: string[] }[];
}

/**
 * Static changelog data for the latest 2 versions.
 * Update this when releasing a new version.
 */
const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.0.2',
    date: 'Unreleased',
    sections: [
      {
        title: 'Added',
        items: [
          'Dark/light theme toggle with system preference detection',
          '/game/:id route for deep-linkable game detail pages',
          'Recently Viewed section on the home page',
          'Steam Checker: genres, categories, platforms, Metacritic, pricing, header image',
          'SteamDB link in Steam Checker results',
          'Keyboard shortcut "/" to focus search input',
          'Data preload on nav link hover',
          'Footer links: GitHub, Report Issue, Changelog'
        ]
      },
      {
        title: 'Changed',
        items: [
          'Worker redirects to /game/:id instead of /search/#id',
          'Steam Checker always attempts local game match',
          'Search uses pre-normalized scoring for faster filtering',
          'Domain logic split into focused modules (ratings, platforms, steam-domain, html)',
          'Steam Checker sidebar extracted to its own file'
        ]
      },
      {
        title: 'Fixed',
        items: [
          'Data provider race condition when unlocked state changes mid-request',
          'Recently viewed infinite render loop',
          'Descriptor icon sizing inconsistency',
          'Tooltip not styled in dark mode',
          'Back button exits app on direct /game/:id navigation'
        ]
      },
      {
        title: 'Security',
        items: [
          'Steam header image URLs validated before rendering',
          'Steam app ID extraction restricted to known Steam domains',
          'Content-Type validation on JSON fetches'
        ]
      }
    ]
  },
  {
    version: '0.0.1',
    date: '2026-05-05',
    sections: [
      {
        title: 'Added',
        items: [
          'Static app pages: home, search, ratings guide, Steam game checker',
          'Search index with fuzzy matching, filters, and URL-backed state',
          'Rating guide with summaries, criteria, and official source links',
          'Content descriptor guide with review cues',
          'Cloudflare Worker for /game/* preview and redirect',
          'GitHub Actions CI and data refresh workflows',
          'Responsive visual compatibility runner'
        ]
      },
      {
        title: 'Changed',
        items: [
          'Restructured from monolithic script to native ES modules',
          'Standardized layout tokens, card radius, and focus states'
        ]
      },
      {
        title: 'Fixed',
        items: [
          'Mobile layout overflow in header, search, pagination, footer',
          'Search result cards support keyboard activation',
          'Data load failures render stable error states'
        ]
      }
    ]
  }
];

interface ChangelogModalProps {
  onClose: () => void;
}

export function ChangelogModal({ onClose }: ChangelogModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="changelog-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Changelog">
      <div className="changelog-modal" onClick={event => event.stopPropagation()}>
        <div className="changelog-header">
          <h2 className="changelog-title">Changelog</h2>
          <button className="changelog-close" type="button" onClick={onClose} aria-label="Close">
            <X className="ui-icon" aria-hidden="true" />
          </button>
        </div>
        <div className="changelog-body">
          {CHANGELOG.map(entry => (
            <ChangelogVersion key={entry.version} entry={entry} />
          ))}
          <div className="changelog-footer-link">
            <a href={`${GITHUB_REPO}/blob/main/CHANGELOG.md`} target="_blank" rel="noopener noreferrer">
              View full changelog on GitHub →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangelogVersion({ entry }: { entry: ChangelogEntry }) {
  return (
    <article className="changelog-version">
      <div className="changelog-version-header">
        <span className="changelog-version-tag">v{entry.version}</span>
        {entry.date ? <span className="changelog-version-date">{entry.date}</span> : null}
      </div>
      {entry.sections.map(section => (
        <ChangelogSection key={section.title} title={section.title} items={section.items} />
      ))}
    </article>
  );
}

function ChangelogSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="changelog-section">
      <h3 className="changelog-section-title">{title}</h3>
      <ul className="changelog-list">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default ChangelogModal;
