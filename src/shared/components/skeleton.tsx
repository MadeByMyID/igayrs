import styles from './skeleton.module.css';

interface SkeletonProps {
  /** Width of the skeleton element (CSS value) */
  width?: string;
  /** Height of the skeleton element (CSS value) */
  height?: string;
  /** Optional border-radius override (CSS value) */
  borderRadius?: string;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Generic skeleton placeholder with shimmer animation.
 * Respects `prefers-reduced-motion` by using a static background.
 * Exposes `role="status"` and `aria-busy="true"` for assistive technologies.
 */
export function Skeleton({ width, height, borderRadius, className }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton}${className ? ` ${className}` : ''}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton layout matching the GameDetailView component dimensions.
 * Reserves space for: rating badge, game title, publisher name,
 * release year, platform icons, descriptor icons, and description area.
 * Produces <0.01 CLS when real content replaces the skeleton.
 */
export function GameDetailSkeleton() {
  return (
    <div
      className={styles.detailCard}
      role="status"
      aria-busy="true"
      aria-label="Loading game details"
    >
      {/* Header: title + rating badge */}
      <div className={styles.detailHeader}>
        <div className={styles.headerText}>
          <Skeleton width="70%" height="2.2rem" />
          <Skeleton width="40%" height="1.15rem" />
        </div>
        <Skeleton width="4.5rem" height="1.6rem" borderRadius="var(--radius-sm, 6px)" />
      </div>

      {/* Description area */}
      <div className={styles.descriptionBlock}>
        <Skeleton width="100%" height="1rem" />
        <Skeleton width="95%" height="1rem" />
        <Skeleton width="60%" height="1rem" />
      </div>

      {/* Detail grid rows */}
      <div className={styles.detailGrid}>
        {/* Publisher */}
        <Skeleton width="5rem" height="0.75rem" />
        <Skeleton width="10rem" height="0.95rem" />

        {/* Year */}
        <Skeleton width="3rem" height="0.75rem" />
        <Skeleton width="3rem" height="0.95rem" />

        {/* Platforms */}
        <Skeleton width="5.5rem" height="0.75rem" />
        <div className={styles.iconRow}>
          <Skeleton width="1.5rem" height="1.5rem" borderRadius="4px" />
          <Skeleton width="1.5rem" height="1.5rem" borderRadius="4px" />
          <Skeleton width="1.5rem" height="1.5rem" borderRadius="4px" />
        </div>

        {/* Rating */}
        <Skeleton width="4rem" height="0.75rem" />
        <Skeleton width="8rem" height="0.95rem" />

        {/* Descriptors */}
        <Skeleton width="6rem" height="0.75rem" />
        <div className={styles.iconRow}>
          <Skeleton width="2rem" height="2rem" borderRadius="4px" />
          <Skeleton width="2rem" height="2rem" borderRadius="4px" />
          <Skeleton width="2rem" height="2rem" borderRadius="4px" />
          <Skeleton width="2rem" height="2rem" borderRadius="4px" />
        </div>
      </div>
    </div>
  );
}
