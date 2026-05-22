import { OFFICIAL_RATING_INFO_URL, RATING_ORDER } from '@/core/constants';
import { getDescriptorGuideCopy } from '@/core/descriptor-guide';
import { getRatingGuideCopy } from '@/core/rating-guide';
import { useLanguage } from '@/app/providers/language-provider';
import { useRequiredIgrsData } from '@/app/providers/data-provider';
import { ErrorState, LoadingState } from '@/shared/components/data-state';
import { ReviewTokens } from '@/shared/components/review-tokens';
import { IMG_DESCRIPTOR, IMG_RATING, ratingContent } from '@/shared/lib/domain';

export function RatingsPage() {
  const { lang, t } = useLanguage();
  const { data, error, loading } = useRequiredIgrsData();

  if (error) {
    return (
      <main className="page-container ratings-page" data-route-ready="ratings">
        <ErrorState title={t('data.error.title')} description={t('data.error.desc')} />
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="page-container ratings-page" data-route-ready="ratings">
        <LoadingState label={t('loading')} />
      </main>
    );
  }

  const descriptors = Object.entries(data.meta.descriptors)
    .sort((a, b) => {
      const left = lang === 'id' ? a[1].nameId || a[1].nameEn || '' : a[1].nameEn || a[1].nameId || '';
      const right = lang === 'id' ? b[1].nameId || b[1].nameEn || '' : b[1].nameEn || b[1].nameId || '';
      return left.localeCompare(right);
    });

  return (
    <main className="page-container ratings-page" data-route-ready="ratings">
      <h1 className="page-title">{t('ratings.title')}</h1>
      <p className="page-subtitle">{t('ratings.subtitle')}</p>

      <section id="ratings-list">
        {RATING_ORDER.map(id => {
          const rating = data.meta.ratings[String(id)];
          if (!rating) return null;
          const title = lang === 'id' ? rating.titleId || rating.titleEn || rating.name : rating.titleEn || rating.titleId || rating.name;
          const subtitle = lang === 'id' ? rating.titleEn || rating.name : rating.titleId || rating.name;
          const content = ratingContent(data.meta, id, lang);
          const guide = getRatingGuideCopy(id, lang);

          return (
            <article className="rating-card rating-guide-card fade-in" aria-labelledby={`rating-guide-title-${id}`} key={id}>
              <div className="rating-card-header">
                <img src={IMG_RATING(id)} alt={rating.name} loading="lazy" />
                <div>
                  <div className="rating-card-title" id={`rating-guide-title-${id}`}>{title}</div>
                  <div className="rating-card-subtitle">{subtitle}</div>
                </div>
              </div>
              <p className="rating-summary">{guide.summary || content}</p>
              <dl className="rating-guide-list">
                {guide.sections.map(section => (
                  <div className="rating-guide-item" key={section.label}>
                    <dt>{section.label}</dt>
                    <dd>{section.text}</dd>
                  </div>
                ))}
              </dl>
              {guide.watchFor.length ? (
                <div className="rating-watch-row" aria-label={t('ratings.watchFor')}>
                  <span>{t('ratings.watchFor')}</span>
                  <div className="rating-watch-tags">
                    {guide.watchFor.map(item => <span key={item}>{item}</span>)}
                  </div>
                </div>
              ) : null}
              <details className="rating-official">
                <summary>{t('ratings.officialCriteria')}</summary>
                <div className="rating-content">{content}</div>
                <div className="rating-source">
                  <span>{t('ratings.source')}:</span>
                  <a href={OFFICIAL_RATING_INFO_URL} target="_blank" rel="noopener noreferrer">igrs.id/rating-info</a>
                </div>
              </details>
            </article>
          );
        })}
      </section>

      <section className="descriptors-section">
        <h2 className="page-title section-title">{t('descriptors.title')}</h2>
        <p className="page-subtitle">{t('descriptors.subtitle')}</p>
        <div className="descriptor-grid" id="descriptor-grid">
          {descriptors.map(([id, descriptor]) => {
            const numericId = Number(id);
            const name = lang === 'id' ? descriptor.nameId || descriptor.nameEn || id : descriptor.nameEn || descriptor.nameId || id;
            const alternate = lang === 'id' ? descriptor.nameEn || descriptor.nameId || '' : descriptor.nameId || descriptor.nameEn || '';
            const guide = getDescriptorGuideCopy(numericId, lang);

            return (
              <article className="descriptor-card descriptor-guide-card fade-in" aria-labelledby={`descriptor-guide-title-${id}`} key={id}>
                <img src={IMG_DESCRIPTOR(numericId)} alt={name} loading="lazy" />
                <div className="descriptor-card-text">
                  <div className="descriptor-name" id={`descriptor-guide-title-${id}`}>{name}</div>
                  <div className="descriptor-alt">{alternate}</div>
                  <p className="descriptor-summary">{guide.summary || descriptor.description || t('descriptors.noGuide')}</p>
                  {guide.watchFor.length ? (
                    <div className="descriptor-review-line" aria-label={t('descriptors.watchFor')}>
                      <span className="descriptor-review-label">{t('descriptors.watchFor')}:</span>
                      <span className="descriptor-review-items">
                        <ReviewTokens items={guide.watchFor} />
                      </span>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
