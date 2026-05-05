const ICON_IDS = new Set([
  'alert-triangle',
  'arrow-left',
  'arrow-up',
  'check',
  'chevron-left',
  'chevron-right',
  'copy',
  'copyright',
  'external-link',
  'gamepad',
  'globe',
  'search',
  'user'
]);

export function icon(name, className = 'ui-icon') {
  const id = ICON_IDS.has(name) ? name : 'chevron-right';
  return `<svg class="${className}" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${id}"></use></svg>`;
}
