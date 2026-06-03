import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RatingBadge } from '@/shared/components/rating-badge';
import type { IgrsMeta } from '@/shared/types';

/**
 * Visual regression snapshot tests for RatingBadge component.
 * Validates: Requirements 43.1, 43.2, 43.3
 *
 * Renders RatingBadge for each known rating ID and captures the HTML
 * structure and applied CSS classes as snapshots. Tests fail on
 * unexpected changes with a diff.
 */

const KNOWN_RATING_IDS = [4, 5, 6, 7, 28, 35] as const;

const mockMeta: IgrsMeta = {
  ratings: {
    '4': { name: '3+', weight: 1, color: '#4caf50' },
    '5': { name: '7+', weight: 2, color: '#8bc34a' },
    '6': { name: '13+', weight: 3, color: '#ffeb3b' },
    '7': { name: '18+', weight: 4, color: '#f44336' },
    '28': { name: 'SU', weight: 0, color: '#9e9e9e' },
    '35': { name: 'D', weight: 5, color: '#212121' },
  },
  descriptors: {},
  platforms: {},
};

describe('RatingBadge visual regression', () => {
  for (const ratingId of KNOWN_RATING_IDS) {
    it(`renders correctly for rating ID ${ratingId}`, () => {
      const { container } = render(
        <RatingBadge meta={mockMeta} ratingId={ratingId} />
      );

      expect(container.innerHTML).toMatchSnapshot();
    });
  }

  it('renders fallback for null rating ID', () => {
    const { container } = render(
      <RatingBadge meta={mockMeta} ratingId={null} />
    );

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('renders fallback for undefined rating ID', () => {
    const { container } = render(
      <RatingBadge meta={mockMeta} ratingId={undefined} />
    );

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('renders fallback for unknown rating ID', () => {
    const { container } = render(
      <RatingBadge meta={mockMeta} ratingId={999} />
    );

    expect(container.innerHTML).toMatchSnapshot();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <RatingBadge meta={mockMeta} ratingId={4} className="custom-badge" />
    );

    expect(container.innerHTML).toMatchSnapshot();
  });
});
