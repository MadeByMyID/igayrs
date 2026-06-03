import { IMG_DESCRIPTOR, IMG_DESCRIPTOR_WEBP, descriptorName } from '@/shared/lib/ratings';
import { Tooltip } from '@/shared/components/tooltip';
import type { IgrsMeta, Language } from '@/shared/types';

interface DescriptorIconsProps {
  emptyLabel: string;
  ids: number[] | undefined;
  lang: Language;
  meta: IgrsMeta;
}

export function DescriptorIcons({ emptyLabel, ids, lang, meta }: DescriptorIconsProps) {
  const cleanIds = [...new Set((ids || []).map(id => Number(id)).filter(Number.isFinite))];

  if (!cleanIds.length) {
    return <div className="detail-no-descriptors">{emptyLabel}</div>;
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
}
