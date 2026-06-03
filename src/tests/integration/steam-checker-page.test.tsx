import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SteamCheckerPage } from '@/features/steam-checker/steam-checker-page';
import type { SteamAppDetailsPayload } from '@/shared/types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

const steamApiMock = vi.hoisted(() => ({
  fetchSteamAppDetails: vi.fn(),
  fetchSteamReviewSummary: vi.fn()
}));

vi.mock('@/app/providers/language-provider', () => ({
  useLanguage: () => ({
    lang: 'en',
    t: (key: string) => key,
    unlocked: false,
    dictionaryLoading: false
  })
}));

vi.mock('@/app/providers/data-provider', () => ({
  useRequiredIgrsData: () => ({
    data: {
      games: [],
      meta: {
        descriptors: {},
        platforms: {},
        ratings: {
          7: { name: 'SU', titleEn: 'Everyone', weight: 1 }
        }
      },
      steamMeta: { contentDescriptors: {} }
    },
    error: null,
    loading: false
  })
}));

vi.mock('@/shared/api/steam-api', () => ({
  createSteamApi: () => steamApiMock
}));

describe('SteamCheckerPage request ordering', () => {
  beforeEach(() => {
    steamApiMock.fetchSteamAppDetails.mockReset();
    steamApiMock.fetchSteamReviewSummary.mockReset();
    steamApiMock.fetchSteamReviewSummary.mockResolvedValue(null);
  });

  it('keeps the newest submitted app visible when an older request resolves later', async () => {
    const oldRequest = deferred<SteamAppDetailsPayload>();
    const newRequest = deferred<SteamAppDetailsPayload>();

    steamApiMock.fetchSteamAppDetails.mockImplementation((appId: string) => {
      if (appId === '111') return oldRequest.promise;
      if (appId === '222') return newRequest.promise;
      throw new Error(`Unexpected app ID ${appId}`);
    });

    render(
      <MemoryRouter initialEntries={['/steamchecker/']}>
        <SteamCheckerPage />
      </MemoryRouter>
    );

    const input = screen.getByLabelText('steamchecker.appid');
    const submit = screen.getByRole('button', { name: 'steamchecker.check' });

    fireEvent.change(input, { target: { value: '111' } });
    fireEvent.click(submit);
    fireEvent.change(input, { target: { value: '222' } });
    fireEvent.click(submit);

    await act(async () => {
      newRequest.resolve({ 222: { success: true, data: { name: 'Newest Steam Game' } } });
    });

    expect(await screen.findByText('Newest Steam Game')).toBeInTheDocument();

    await act(async () => {
      oldRequest.resolve({ 111: { success: true, data: { name: 'Stale Steam Game' } } });
    });

    await waitFor(() => {
      expect(screen.queryByText('Stale Steam Game')).not.toBeInTheDocument();
      expect(screen.getByText('Newest Steam Game')).toBeInTheDocument();
    });
  });

  it('aborts an older Steam details request when a newer app ID is submitted', async () => {
    const oldRequest = deferred<SteamAppDetailsPayload>();
    const newRequest = deferred<SteamAppDetailsPayload>();

    steamApiMock.fetchSteamAppDetails.mockImplementation((appId: string) => {
      if (appId === '111') return oldRequest.promise;
      if (appId === '222') return newRequest.promise;
      throw new Error(`Unexpected app ID ${appId}`);
    });

    render(
      <MemoryRouter initialEntries={['/steamchecker/']}>
        <SteamCheckerPage />
      </MemoryRouter>
    );

    const input = screen.getByLabelText('steamchecker.appid');
    const submit = screen.getByRole('button', { name: 'steamchecker.check' });

    fireEvent.change(input, { target: { value: '111' } });
    fireEvent.click(submit);
    const firstSignal = steamApiMock.fetchSteamAppDetails.mock.calls[0]?.[1]?.signal as AbortSignal;

    fireEvent.change(input, { target: { value: '222' } });
    fireEvent.click(submit);

    expect(firstSignal.aborted).toBe(true);

    await act(async () => {
      newRequest.resolve({ 222: { success: true, data: { name: 'Newest Steam Game' } } });
      oldRequest.resolve({ 111: { success: true, data: { name: 'Stale Steam Game' } } });
    });
  });

  it('offers a retry action after a Steam load failure', async () => {
    steamApiMock.fetchSteamAppDetails
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValueOnce({ 333: { success: true, data: { name: 'Recovered Steam Game' } } });

    render(
      <MemoryRouter initialEntries={['/steamchecker/']}>
        <SteamCheckerPage />
      </MemoryRouter>
    );

    const input = screen.getByLabelText('steamchecker.appid');
    const submit = screen.getByRole('button', { name: 'steamchecker.check' });

    fireEvent.change(input, { target: { value: '333' } });
    fireEvent.click(submit);

    const retry = await screen.findByRole('button', { name: 'steamchecker.retry' });
    fireEvent.click(retry);

    expect(await screen.findByText('Recovered Steam Game')).toBeInTheDocument();
  });

  it('recovers URL-driven lookup when StrictMode aborts the first effect replay request', async () => {
    const firstRequest = deferred<SteamAppDetailsPayload>();
    const secondRequest = deferred<SteamAppDetailsPayload>();
    const requests = [firstRequest, secondRequest];

    steamApiMock.fetchSteamAppDetails.mockImplementation((_appId: string, options?: { signal?: AbortSignal }) => {
      const request = requests.shift();
      if (!request) throw new Error('Unexpected extra Steam request');

      options?.signal?.addEventListener('abort', () => {
        request.reject(new DOMException('The operation was aborted.', 'AbortError'));
      }, { once: true });

      return request.promise;
    });

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/steamchecker/?appid=333']}>
          <SteamCheckerPage />
        </MemoryRouter>
      </StrictMode>
    );

    await waitFor(() => {
      expect(steamApiMock.fetchSteamAppDetails).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole('button', { name: 'steamchecker.retry' })).not.toBeInTheDocument();

    await act(async () => {
      secondRequest.resolve({ 333: { success: true, data: { name: 'StrictMode Steam Game' } } });
    });

    expect(await screen.findByText('StrictMode Steam Game')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'steamchecker.retry' })).not.toBeInTheDocument();
  });
});
