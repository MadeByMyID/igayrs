import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider, useLanguage } from '@/app/providers/language-provider';
import { ThemeProvider, useTheme } from '@/app/providers/theme-provider';

const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
const originalMatchMedia = window.matchMedia;

function blockLocalStorage() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Storage blocked', 'SecurityError');
    },
  });
}

function restoreBrowserGlobals() {
  if (originalLocalStorageDescriptor) {
    Object.defineProperty(window, 'localStorage', originalLocalStorageDescriptor);
  }
  window.matchMedia = originalMatchMedia;
}

function LanguageProbe() {
  const { lang, toggleLanguage } = useLanguage();
  return <button type="button" onClick={toggleLanguage}>{lang}</button>;
}

function ThemeProbe() {
  const { resolvedTheme, toggleTheme } = useTheme();
  return <button type="button" onClick={toggleTheme}>{resolvedTheme}</button>;
}

afterEach(() => {
  restoreBrowserGlobals();
});

describe('provider storage resilience', () => {
  it('keeps language toggles usable when localStorage is blocked', () => {
    blockLocalStorage();

    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>
    );

    const toggle = screen.getByRole('button', { name: 'en' });
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'id' })).toBeInTheDocument();
  });

  it('keeps theme toggles usable when localStorage and matchMedia are unavailable', () => {
    blockLocalStorage();
    window.matchMedia = undefined as unknown as typeof window.matchMedia;

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    const toggle = screen.getByRole('button', { name: 'light' });
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'dark' })).toBeInTheDocument();
  });
});
