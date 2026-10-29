// @vitest-environment jsdom

import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { CostComparison } from '../components/CostComparison';
import { WhatIfCalculator } from '../components/WhatIfCalculator';
import { SeasonalComparison } from '../components/SeasonalComparison';
import { RATE_SOURCE_URL } from '../utils/rates';
import * as demoData from '../utils/demoData';
import type { UsageRecord } from '../types';

vi.mock('recharts', async importOriginal => {
  const charts = await importOriginal<typeof import('recharts')>();
  return { ...charts, ResponsiveContainer: () => null };
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
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

describe('Calculation entry points', () => {
  const records: UsageRecord[] = ['2026-03-02', '2026-09-01', '2026-11-27'].map(date => ({
    type: 'Electric usage', date, startTime: '08:00', endTime: '08:15', usage: 100,
  }));

  it.each(['cache', 'upload', 'demo'])('uses correct seasonal and holiday buckets for %s data', async entryPoint => {
    if (entryPoint === 'cache') {
      localStorage.setItem('energy-insights-data', JSON.stringify({
        records,
        peakUsage: 300,
        offPeakUsage: 0,
        winterPeakUsage: 200,
        summerPeakUsage: 100,
      }));
    }
    if (entryPoint === 'demo') {
      vi.spyOn(demoData, 'generateDemoData').mockReturnValue({ records, metadata: {}, weather: [] });
    }
    const { container } = render(createElement(App));
    if (entryPoint === 'upload') {
      const csv = [
        'TYPE,DATE,START TIME,END TIME,USAGE (kWh)',
        ...records.map(record => [record.type, record.date, record.startTime, record.endTime, record.usage].join(',')),
      ].join('\n');
      const input = container.querySelector('input[type="file"]');
      if (!input) throw new Error('CSV upload input not found');
      fireEvent.change(input, { target: { files: [new File([csv], 'usage.csv', { type: 'text/csv' })] } });
    } else if (entryPoint === 'demo') {
      fireEvent.click(screen.getByRole('button', { name: /EV Owner, Works from Home/ }));
    }

    await screen.findByRole('heading', { name: 'Rate Plan Comparison' });
    const whatIf = screen.getByRole('heading', { name: 'What If' }).parentElement;
    if (!whatIf) throw new Error('What If panel not found');
    fireEvent.click(screen.getByRole('button', { name: 'Time-of-Use' }));
    expect(within(whatIf).getByText('$34')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'TOU + Super Off-Peak' }));
    expect(within(whatIf).getByText(/\$42.*\$50/)).toBeTruthy();
    fireEvent.change(within(whatIf).getByRole('slider'), { target: { value: '0' } });
    expect(within(whatIf).getByText(/\$0.*\$0/)).toBeTruthy();

    if (entryPoint !== 'demo') {
      const stored = localStorage.getItem('energy-insights-data');
      if (!stored) throw new Error('Rebuilt analysis was not saved');
      expect(JSON.parse(stored)).toMatchObject({
        records,
        totalUsage: 300,
        peakUsage: 200,
        offPeakUsage: 100,
        peakUsageByPlan: {
          tou: { winter: 100, summer: 0 },
          touSuper: { winter: 100, summer: 100 },
        },
      });
    }
  });
});

describe('What If estimates', () => {
  it('shows no shift savings for Schedule 307 summer mornings, but does for Schedule 327', () => {
    const props = {
      peakUsageByPlan: {
        tou: { winter: 0, summer: 0 },
        touSuper: { winter: 0, summer: 100 },
      },
      flatCost: 100,
      touCost: 100,
      touSuperCost: 100,
      monthCount: 12,
    };
    const { rerender } = render(createElement(WhatIfCalculator, { ...props, currentPlan: 'tou' }));
    expect(screen.getAllByText('$0').length).toBeGreaterThan(0);
    rerender(createElement(WhatIfCalculator, { ...props, currentPlan: 'touSuper' }));
    expect(screen.getByText(/\$3.*\$4/)).toBeTruthy();
  });

  it('retains plan-switch savings at zero shift when comparing against the flat plan', () => {
    render(createElement(WhatIfCalculator, {
      peakUsageByPlan: {
        tou: { winter: 100, summer: 100 },
        touSuper: { winter: 100, summer: 100 },
      },
      flatCost: 200,
      touCost: 150,
      touSuperCost: 100,
      monthCount: 1,
      currentPlan: 'flat',
    }));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0' } });
    expect(screen.getByText('$600')).toBeTruthy();
    expect(screen.getByText(/\$1200.*\$1200/)).toBeTruthy();
  });
});

describe('Seasonal peak percentages', () => {
  it('uses the shared Schedule 327 holiday classification', () => {
    const records = Array.from({ length: 7 }, (_, index) => [
      { date: `2026-03-${String(index + 2).padStart(2, '0')}`, startTime: '08:00', usage: 100 },
      { date: `2026-09-${String(index + 1).padStart(2, '0')}`, startTime: '08:00', usage: 100 },
    ]).flat();
    render(createElement(SeasonalComparison, { records }));
    expect(screen.getByText('71%')).toBeTruthy();
    expect(screen.getByText('57%')).toBeTruthy();
    expect(screen.getByText(/Peak usage uses Schedule 327 periods, excluding PSE holidays/)).toBeTruthy();
  });
});
