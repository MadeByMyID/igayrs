import { OFFICIAL_RATING_INFO_URL, RATING_ORDER } from '@/core/constants';
import { getDescriptorGuideCopy } from '@/core/descriptor-guide';
import { getRatingGuideCopy } from '@/core/rating-guide';
import { useLanguage } from '@/app/providers/language-provider';
import { useRequiredIgrsData } from '@/app/providers/data-provider';
import { ErrorState, LoadingState } from '@/shared/components/data-state';
import { ReviewTokens } from '@/shared/components/review-tokens';
import { IMG_DESCRIPTOR, IMG_DESCRIPTOR_WEBP, IMG_RATING, IMG_RATING_WEBP, ratingContent } from '@/shared/lib/ratings';
import styles from './ratings-page.module.css';

export function RatingsPage() {
  const { lang, t } = useLanguage();
  const { data, error, loading } = useRequiredIgrsData();

  if (error) {
    return (
      <main className={`${styles.pageContainer} ${styles.ratingsPage}`} data-route-ready="ratings">
        <ErrorState title={t('data.error.title')} description={t('data.error.desc')} />
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className={`${styles.pageContainer} ${styles.ratingsPage}`} data-route-ready="ratings">
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
    <main className={`${styles.pageContainer} ${styles.ratingsPage}`} data-route-ready="ratings">
      <h1 className={styles.pageTitle}>{t('ratings.title')}</h1>
      <p className={styles.pageSubtitle}>{t('ratings.subtitle')}</p>

      <section className={styles.ratingsList}>
        {RATING_ORDER.map(id => {
          const rating = data.meta.ratings[String(id)];
          if (!rating) return null;
          const title = lang === 'id' ? rating.titleId || rating.titleEn || rating.name : rating.titleEn || rating.titleId || rating.name;
          const subtitle = lang === 'id' ? rating.titleEn || rating.name : rating.titleId || rating.name;
          const content = ratingContent(data.meta, id, lang);
          const guide = getRatingGuideCopy(id, lang);

          return (
            <article className={`${styles.ratingCard} ${styles.ratingGuideCard} ${styles.fadeIn}`} aria-labelledby={`rating-guide-title-${id}`} key={id}>
              <div className={styles.ratingCardHeader}>
                <picture>
                  <source srcSet={IMG_RATING_WEBP(id)} type="image/webp" />
                  <img src={IMG_RATING(id)} alt={rating.name} width={52} height={52} loading="lazy" />
                </picture>
                <div>
                  <div className={styles.ratingCardTitle} id={`rating-guide-title-${id}`}>{title}</div>
                  <div className={styles.ratingCardSubtitle}>{subtitle}</div>
                </div>
              </div>
              <p className={styles.ratingSummary}>{guide.summary || content}</p>
              <dl className={styles.ratingGuideList}>
                {guide.sections.map(section => (
                  <div className={styles.ratingGuideItem} key={section.label}>
                    <dt>{section.label}</dt>
                    <dd>{section.text}</dd>
                  </div>
                ))}
              </dl>
              {guide.watchFor.length ? (
                <div className={styles.ratingWatchRow} aria-label={t('ratings.watchFor')}>
                  <span>{t('ratings.watchFor')}</span>
                  <div className={styles.ratingWatchTags}>
                    {guide.watchFor.map(item => <span key={item}>{item}</span>)}
                  </div>
                </div>
              ) : null}
              <details className={styles.ratingOfficial}>
                <summary>{t('ratings.officialCriteria')}</summary>
                <div className={styles.ratingContent}>{content}</div>
                <div className={styles.ratingSource}>
                  <span>{t('ratings.source')}:</span>
                  <a href={OFFICIAL_RATING_INFO_URL} target="_blank" rel="noopener noreferrer">igrs.id/rating-info</a>
                </div>
              </details>
            </article>
          );
        })}
      </section>

      <section className={styles.descriptorsSection}>
        <h2 className={`${styles.pageTitle} ${styles.sectionTitle}`}>{t('descriptors.title')}</h2>
        <p className={styles.pageSubtitle}>{t('descriptors.subtitle')}</p>
        <div className={styles.descriptorGrid}>
          {descriptors.map(([id, descriptor]) => {
            const numericId = Number(id);
            const name = lang === 'id' ? descriptor.nameId || descriptor.nameEn || id : descriptor.nameEn || descriptor.nameId || id;
            const alternate = lang === 'id' ? descriptor.nameEn || descriptor.nameId || '' : descriptor.nameId || descriptor.nameEn || '';
            const guide = getDescriptorGuideCopy(numericId, lang);

            return (
              <article className={`${styles.descriptorCard} ${styles.descriptorGuideCard} ${styles.fadeIn}`} aria-labelledby={`descriptor-guide-title-${id}`} key={id}>
                <picture>
                  <source srcSet={IMG_DESCRIPTOR_WEBP(numericId)} type="image/webp" />
                  <img src={IMG_DESCRIPTOR(numericId)} alt={name} width={38} height={38} loading="lazy" />
                </picture>
                <div className={styles.descriptorCardText}>
                  <div className={styles.descriptorName} id={`descriptor-guide-title-${id}`}>{name}</div>
                  <div className={styles.descriptorAlt}>{alternate}</div>
                  <p className={styles.descriptorSummary}>{guide.summary || descriptor.description || t('descriptors.noGuide')}</p>
                  {guide.watchFor.length ? (
                    <div className={styles.descriptorReviewLine} aria-label={t('descriptors.watchFor')}>
                      <span className={styles.descriptorReviewLabel}>{t('descriptors.watchFor')}:</span>
                      <span className={styles.descriptorReviewItems}>
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
