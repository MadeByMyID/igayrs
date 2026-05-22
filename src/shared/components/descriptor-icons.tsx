import { IMG_DESCRIPTOR, descriptorName } from '@/shared/lib/domain';
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
        <span className="descriptor-icon" key={id}>
          <img src={IMG_DESCRIPTOR(id)} alt={descriptorName(meta, id, lang)} loading="lazy" />
          <span className="tooltip">{descriptorName(meta, id, lang)}</span>
        </span>
      ))}
    </div>
  );
}
