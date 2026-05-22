interface ReviewTokensProps {
  items: string[];
}

export function ReviewTokens({ items }: ReviewTokensProps) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const visible = items.slice(0, 3);

  return (
    <>
      {visible.map(item => <span key={item}>{item}</span>)}
      {items.length > visible.length ? <span className="descriptor-review-more">etc.</span> : null}
    </>
  );
}
