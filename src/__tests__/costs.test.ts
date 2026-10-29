import { describe, it, expect } from 'vitest';
import { 
  calculateFlatRateCost, 
  BASIC_CHARGE,
  FLAT_EFFECTIVE_TIER1,
  FLAT_EFFECTIVE_TIER2,
  TOU_RATE,
  TOU_SUPER_RATE,
  calculateShiftSavings,
} from '../utils/rates';
import { analyzeUsageRecords, calculatePeakUsageByPlan, calculateTotalCosts } from '../utils/parser';
import type { UsageRecord } from '../types';

describe('Flat rate cost calculation', () => {
  it('calculates tier 1 only (under 600 kWh)', () => {
    const cost = calculateFlatRateCost(500);
    const expected = BASIC_CHARGE + (500 * FLAT_EFFECTIVE_TIER1);
    expect(cost).toBeCloseTo(expected, 2);
  });

  it('calculates tier 1 + tier 2 (over 600 kWh)', () => {
    const cost = calculateFlatRateCost(800);
    const tier1Cost = 600 * FLAT_EFFECTIVE_TIER1;
    const tier2Cost = 200 * FLAT_EFFECTIVE_TIER2;
    const expected = BASIC_CHARGE + tier1Cost + tier2Cost;
    expect(cost).toBeCloseTo(expected, 2);
  });

  it('handles exactly 600 kWh', () => {
    const cost = calculateFlatRateCost(600);
    const expected = BASIC_CHARGE + (600 * FLAT_EFFECTIVE_TIER1);
    expect(cost).toBeCloseTo(expected, 2);
  });

  it('handles zero usage', () => {
    const cost = calculateFlatRateCost(0);
    expect(cost).toBe(BASIC_CHARGE);
  });
});

describe('Rate value sanity checks', () => {
  // These tests ensure rate values are in reasonable ranges
  // and will fail if rates are accidentally changed to wrong values
  
  it('flat rate tier 1 is around $0.15-0.20/kWh', () => {
    expect(FLAT_EFFECTIVE_TIER1).toBeGreaterThan(0.15);
    expect(FLAT_EFFECTIVE_TIER1).toBeLessThan(0.25);
  });

  it('flat rate tier 2 is around $0.18-0.25/kWh', () => {
    expect(FLAT_EFFECTIVE_TIER2).toBeGreaterThan(0.18);
    expect(FLAT_EFFECTIVE_TIER2).toBeLessThan(0.28);
  });

  it('TOU peak winter rate is around $0.50-0.60/kWh', () => {
    expect(TOU_RATE.peakRateWinter).toBeGreaterThan(0.45);
    expect(TOU_RATE.peakRateWinter).toBeLessThan(0.65);
  });

  it('TOU peak summer rate is around $0.30-0.40/kWh', () => {
    expect(TOU_RATE.peakRateSummer).toBeGreaterThan(0.25);
    expect(TOU_RATE.peakRateSummer).toBeLessThan(0.45);
  });

  it('TOU off-peak electricity charge is around $0.10-0.15/kWh', () => {
    expect(TOU_RATE.offPeakRate).toBeGreaterThan(0.08);
    expect(TOU_RATE.offPeakRate).toBeLessThan(0.18);
  });

  it('TOU Super off-peak electricity charge is the lowest at $0.07-0.10/kWh', () => {
    expect(TOU_SUPER_RATE.superOffPeakRate).toBeGreaterThan(0.05);
    expect(TOU_SUPER_RATE.superOffPeakRate).toBeLessThan(0.12);
  });

  it('basic charge is around $7-10/month', () => {
    expect(BASIC_CHARGE).toBeGreaterThan(5);
    expect(BASIC_CHARGE).toBeLessThan(12);
  });
});

describe('Cost calculation examples', () => {
  // Specific examples to track regressions
  
  it('500 kWh flat rate cost is approximately $100', () => {
    const cost = calculateFlatRateCost(500);
    expect(cost).toBeGreaterThan(90);
    expect(cost).toBeLessThan(120);
  });

  it('1000 kWh flat rate cost is approximately $190-210', () => {
    const cost = calculateFlatRateCost(1000);
    expect(cost).toBeGreaterThan(180);
    expect(cost).toBeLessThan(220);
  });
});

describe('October 2026 bill estimates', () => {
  it('uses the published Schedule 7 tier prices for 800 kWh', () => {
    // PSE's $162.68 example rounds each bill line; the app rounds only the final total.
    expect(calculateFlatRateCost(800)).toBeCloseTo(162.6686, 6);
    expect(calculateFlatRateCost(800).toFixed(2)).toBe('162.67');
  });

  it('applies current prices, monthly tiers and basic charges across seasons', () => {
    const records: UsageRecord[] = ['2026-01-06', '2026-07-06'].flatMap(date => [
      { type: 'Electric usage', date, startTime: '08:00', endTime: '08:15', usage: 100 },
      { type: 'Electric usage', date, startTime: '12:00', endTime: '12:15', usage: 200 },
      { type: 'Electric usage', date, startTime: '23:00', endTime: '23:15', usage: 500 },
    ]);

    const costs = calculateTotalCosts(records);
    expect(costs.flatCost).toBeCloseTo(325.3372, 6);
    expect(costs.touCost).toBeCloseTo(306.5536, 6);
    expect(costs.touSuperCost).toBeCloseTo(293.9256, 6);
  });
});

function usageRecord(date: string, hour: number, usage = 100): UsageRecord {
  const time = String(hour).padStart(2, '0');
  return { type: 'Electric usage', date, startTime: `${time}:00`, endTime: `${time}:15`, usage };
}

describe('Plan-specific seasonal peak usage', () => {
  it('classifies March and September correctly for each plan', () => {
    const records = [
      usageRecord('2026-03-02', 8, 100),
      usageRecord('2026-03-02', 18, 200),
      usageRecord('2026-09-01', 8, 300),
      usageRecord('2026-09-01', 18, 400),
    ];
    expect(calculatePeakUsageByPlan(records)).toEqual({
      tou: { winter: 300, summer: 400 },
      touSuper: { winter: 300, summer: 700 },
    });
  });

  it.each([
    { date: '2026-03-31', tou: { winter: 100, summer: 0 }, touSuper: { winter: 100, summer: 0 } },
    { date: '2026-04-01', tou: { winter: 0, summer: 0 }, touSuper: { winter: 0, summer: 100 } },
    { date: '2026-09-30', tou: { winter: 0, summer: 0 }, touSuper: { winter: 0, summer: 100 } },
    { date: '2026-10-01', tou: { winter: 100, summer: 0 }, touSuper: { winter: 100, summer: 0 } },
  ])('respects season boundaries on $date', ({ date, tou, touSuper }) => {
    expect(calculatePeakUsageByPlan([usageRecord(date, 8)])).toEqual({ tou, touSuper });
  });

  it('excludes holidays, weekends and already off-peak readings from shiftable usage', () => {
    const records = [
      usageRecord('2026-01-19', 8),
      usageRecord('2026-06-19', 18),
      usageRecord('2026-11-27', 18),
      usageRecord('2026-03-07', 8),
      usageRecord('2026-03-02', 12),
      usageRecord('2026-09-01', 23),
    ];
    expect(calculatePeakUsageByPlan(records)).toEqual({
      tou: { winter: 0, summer: 0 },
      touSuper: { winter: 0, summer: 0 },
    });
  });

  it('rebuilds consistent costs and peak totals for all analysis entry points', () => {
    const analysis = analyzeUsageRecords([
      usageRecord('2026-11-26', 8),
      usageRecord('2026-11-27', 18),
      usageRecord('2026-11-30', 8),
    ]);
    expect(analysis.totalUsage).toBe(300);
    expect(analysis.peakUsage).toBe(100);
    expect(analysis.offPeakUsage).toBe(200);
    expect(analysis.peakUsageByPlan).toEqual({
      tou: { winter: 100, summer: 0 },
      touSuper: { winter: 100, summer: 0 },
    });
    expect(analysis.flatCost).toBeCloseTo(64.2257, 6);
    expect(analysis.touCost).toBeCloseTo(96.6302, 6);
    expect(analysis.touSuperCost).toBeCloseTo(97.5214, 6);
  });
});

describe('Load-shifting savings', () => {
  it('does not claim Schedule 307 savings from summer morning usage', () => {
    const usage = calculatePeakUsageByPlan([usageRecord('2026-09-01', 8)]);
    const savings = calculateShiftSavings(usage, 20);
    expect(savings.tou).toBe(0);
    expect(savings.touSuperMin).toBeCloseTo(2.99568, 6);
    expect(savings.touSuperMax).toBeCloseTo(3.92594, 6);
  });

  it('shifts each season to its own off-peak rate, preserving the overnight range', () => {
    const usage = calculatePeakUsageByPlan([
      usageRecord('2026-03-02', 8),
      usageRecord('2026-09-01', 18),
    ]);
    const savings = calculateShiftSavings(usage, 20);
    expect(savings.tou).toBeCloseTo(13.02474, 6);
    expect(savings.touSuperMin).toBeCloseTo(10.52542, 6);
    expect(savings.touSuperMax).toBeCloseTo(12.4866, 6);
    expect(calculateShiftSavings(usage, 0)).toEqual({ tou: 0, touSuperMin: 0, touSuperMax: 0 });
  });

  it('matches the change in actual bills when half of peak usage moves within its season', () => {
    const original = [
      usageRecord('2026-03-02', 8),
      usageRecord('2026-09-01', 18),
      usageRecord('2026-09-01', 23, 1000),
    ];
    const shifted = [
      usageRecord('2026-03-02', 8, 50),
      usageRecord('2026-03-02', 12, 50),
      usageRecord('2026-09-01', 18, 50),
      usageRecord('2026-09-01', 12, 50),
      usageRecord('2026-09-01', 23, 1000),
    ];
    const overnight = shifted.map(record => record.startTime === '12:00'
      ? { ...record, startTime: '23:00', endTime: '23:15' }
      : record);
    const savings = calculateShiftSavings(calculatePeakUsageByPlan(original), 50);
    const before = calculateTotalCosts(original);
    const after = calculateTotalCosts(shifted);
    const afterOvernight = calculateTotalCosts(overnight);
    expect(before.flatCost).toBeCloseTo(after.flatCost, 6);
    expect(before.touCost - after.touCost).toBeCloseTo(savings.tou, 6);
    expect(before.touSuperCost - after.touSuperCost).toBeCloseTo(savings.touSuperMin, 6);
    expect(before.touSuperCost - afterOvernight.touSuperCost).toBeCloseTo(savings.touSuperMax, 6);
  });

  it('returns zero for no peak usage, including an empty dataset', () => {
    expect(calculateShiftSavings(calculatePeakUsageByPlan([]), 50)).toEqual({
      tou: 0, touSuperMin: 0, touSuperMax: 0,
    });
  });
});
