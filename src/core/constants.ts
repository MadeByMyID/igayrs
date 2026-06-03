import ratingMetadata from '@/core/rating-metadata.json';

const APP_BASE_URL = new URL(/* @vite-ignore */ '../', import.meta.url);

function normalizeBasePath(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '');
  return normalized || '/';
}

function publicAssetPath(pathname: string): string {
  const prefix = APP_BASE_PATH === '/' ? '' : APP_BASE_PATH;
  return `${prefix}/${pathname.replace(/^\/+/, '')}`;
}

export const APP_BASE_PATH = normalizeBasePath(APP_BASE_URL.pathname);
export const ASSET_BASE = publicAssetPath('assets/data');
export const I18N_BASE = publicAssetPath('assets/i18n');
export const IMAGE_BASE = `${ASSET_BASE}/images`;
export const JSON_BASE = `${ASSET_BASE}/json`;
export const FAVICON_URL = `${IMAGE_BASE}/favicon.svg`;
export const IGRS_LOGO_URL = `${IMAGE_BASE}/igrs.svg`;
export const OFFICIAL_RATING_INFO_URL = 'https://igrs.id/rating-info';
export const RATING_METADATA = ratingMetadata;
export const RATING_ORDER = ratingMetadata.map(item => item.id);
export const EXTRA_FIELD_PATCHED_TOKEN = '__IGRS_LINKS_PATCHED__';
export const EXTRA_FIELD_PATCHED_LEGACY_TEXT = 'The IGRS team has patched this Issue, their frontend is no longer leaking links containing the offending content';
