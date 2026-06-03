import { IMG_RATING, IMG_RATING_WEBP, ratingName } from '@/shared/lib/ratings';
import type { IgrsMeta } from '@/shared/types';

interface RatingBadgeProps {
  className?: string;
  meta: IgrsMeta;
  ratingId: number | null | undefined;
}

export function RatingBadge({ className = 'steam-rating-img', meta, ratingId }: RatingBadgeProps) {
  if (!ratingId || !meta.ratings[String(ratingId)]) {
    return <span className="steam-rating-badge steam-rating-badge-muted">?</span>;
  }

  return (
    <picture>
      <source srcSet={IMG_RATING_WEBP(ratingId)} type="image/webp" />
      <img
        className={className}
        src={IMG_RATING(ratingId)}
        alt={ratingName(meta, ratingId)}
        width={60}
        height={60}
        loading="lazy"
      />
    </picture>
  );
}
