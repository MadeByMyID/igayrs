import { memo } from 'react';
import { IMG_DESCRIPTOR, IMG_DESCRIPTOR_WEBP, descriptorName } from '@/shared/lib/ratings';
import { Tooltip } from '@/shared/components/tooltip';
import type { IgrsMeta, Language } from '@/shared/types';

interface DescriptorIconsProps {
  emptyLabel: string;
  ids: number[] | undefined;
  lang: Language;
  meta: IgrsMeta;
}

export const DescriptorIcons = memo(function DescriptorIcons({ emptyLabel, ids, lang, meta }: DescriptorIconsProps) {
  if (!ids || ids.length === 0) {
    return <div className="detail-no-descriptors">{emptyLabel}</div>;
  }

  // Deduplicate — game data may contain duplicate descriptor IDs
  const seen = new Set<number>();
  const cleanIds: number[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      cleanIds.push(id);
    }
  }

  return (
    <div className="descriptor-icons">
      {cleanIds.map(id => (
        <Tooltip content={descriptorName(meta, id, lang)} key={id}>
          <span className="descriptor-icon">
            <picture>
              <source srcSet={IMG_DESCRIPTOR_WEBP(id)} type="image/webp" />
              <img src={IMG_DESCRIPTOR(id)} alt={descriptorName(meta, id, lang)} width={52} height={52} loading="lazy" />
            </picture>
          </span>
        </Tooltip>
      ))}
    </div>
  );
});
