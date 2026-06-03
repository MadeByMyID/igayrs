import { useCallback, useEffect, useId, useRef, useState } from 'react';

interface TooltipProps {
  /** The content displayed inside the tooltip */
  content: string;
  /** The trigger element that the tooltip describes */
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  /** Optional CSS class for the tooltip container wrapper */
  className?: string;
}

/**
 * Accessible tooltip component that appears on hover AND keyboard focus.
 * Uses `role="tooltip"` with `aria-describedby` linking the trigger to the tooltip content.
 * Dismissible via Escape key.
 *
 * Replaces CSS-only tooltips that are inaccessible to keyboard users.
 */
export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 100);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    },
    [visible],
  );

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <span
      className={`tooltip-wrapper${className ? ` ${className}` : ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
      ref={triggerRef as React.Ref<HTMLSpanElement>}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <span aria-describedby={visible ? tooltipId : undefined} tabIndex={0} style={{ display: 'contents' }}>
        {children}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className="tooltip-content"
        aria-hidden={!visible}
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.3rem 0.6rem',
          background: 'var(--tooltip-bg, var(--text))',
          color: 'var(--tooltip-color, #fff)',
          fontSize: '0.68rem',
          fontWeight: 600,
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          opacity: visible ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.15s',
          zIndex: 10,
          visibility: visible ? 'visible' : 'hidden',
        }}
      >
        {content}
      </span>
    </span>
  );
}
