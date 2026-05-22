import { IMG_RATING, ratingName } from '@/shared/lib/domain';
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
    <img
      className={className}
      src={IMG_RATING(ratingId)}
      alt={ratingName(meta, ratingId)}
      loading="lazy"
    />
  );
}
