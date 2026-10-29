// @vitest-environment jsdom

import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { CostComparison } from '../components/CostComparison';
import { RATE_SOURCE_URL } from '../utils/rates';

vi.mock('recharts', async importOriginal => {
  const charts = await importOriginal<typeof import('recharts')>();
  return { ...charts, ResponsiveContainer: () => null };
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('Current rate display', () => {
  it('displays the effective date and all ten adjusted prices', () => {
    render(createElement(CostComparison, {
      flatCost: 0,
      touCost: 0,
      touSuperCost: 0,
      monthCount: 1,
      currentPlan: 'flat',
      onCurrentPlanChange: vi.fn(),
    }));

    fireEvent.click(screen.getByText('Rate details (as of 2026-10-01)'));
    const table = within(screen.getByRole('table'));
    for (const price of [
      '$0.189', '$0.209', '$0.580', '$0.383', '$0.156',
      '$0.551', '$0.319', '$0.175', '$0.170', '$0.123',
    ]) {
      expect(table.getByText(price)).toBeTruthy();
    }
    expect(screen.getByText(/All plans: \$7\.49\/mo basic charge/)).toBeTruthy();
    expect(screen.getByText(/surcharges and credits/)).toBeTruthy();
  });

  it('links the effective-date disclosure to the official source', () => {
    render(createElement(App));
    expect(screen.getByText(/Estimates apply rates effective 2026-10-01 to all usage/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'PSE Electric Summary Sheet' }).getAttribute('href')).toBe(RATE_SOURCE_URL);
  });
});

describe('Cached analysis repricing', () => {
  it('refreshes January estimates without losing usage, metadata or weather', () => {
    const cachedData = {
      records: [
        { type: 'Electric usage', date: '2026-01-05', startTime: '00:00', endTime: '00:15', usage: 800 },
      ],
      monthlyStats: [
        { month: '2026-01', totalUsage: 800, flatCost: 159.4566, touCost: 123.2952, peakUsage: 0, offPeakUsage: 800 },
      ],
      hourlyAverages: [{ hour: 0, weekday: 1, average: 800 }],
      flatCost: 159.4566,
      touCost: 130.7852,
      touSuperCost: 104.6612,
      totalUsage: 800,
      peakUsage: 0,
      offPeakUsage: 800,
      winterPeakUsage: 0,
      summerPeakUsage: 0,
      metadata: { name: 'Sample household', service: 'Electric' },
      weather: [{ date: '2026-01-05', tempMax: 50, tempMin: 40, tempMean: 45 }],
    };
    localStorage.setItem('energy-insights-data', JSON.stringify(cachedData));

    render(createElement(App));
    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    expect(screen.getByText('$162.67')).toBeTruthy();
    expect(screen.getByText('$132.06')).toBeTruthy();
    expect(screen.getByText('$105.94')).toBeTruthy();

    const stored = localStorage.getItem('energy-insights-data');
    expect(stored).not.toBeNull();
    const refreshed: typeof cachedData = JSON.parse(stored!);
    expect(refreshed.flatCost).toBeCloseTo(162.6686, 6);
    expect(refreshed.touCost).toBeCloseTo(132.0644, 6);
    expect(refreshed.touSuperCost).toBeCloseTo(105.9404, 6);
    expect(refreshed.monthlyStats[0].flatCost).toBeCloseTo(162.6686, 6);
    expect(refreshed.monthlyStats[0].touCost).toBeCloseTo(124.5744, 6);
    expect(refreshed.records).toEqual(cachedData.records);
    expect(refreshed.metadata).toEqual(cachedData.metadata);
    expect(refreshed.weather).toEqual(cachedData.weather);
  });
});
