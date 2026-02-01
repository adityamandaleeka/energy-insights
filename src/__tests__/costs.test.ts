import { describe, it, expect } from 'vitest';
import { 
  calculateFlatRateCost, 
  BASIC_CHARGE, 
  FLAT_RATE,
  FLAT_EFFECTIVE_TIER1,
  FLAT_EFFECTIVE_TIER2,
  TOU_RATE,
  TOU_SUPER_RATE,
} from '../utils/rates';

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

  it('TOU off-peak rate is around $0.10-0.15/kWh', () => {
    expect(TOU_RATE.offPeakRate).toBeGreaterThan(0.08);
    expect(TOU_RATE.offPeakRate).toBeLessThan(0.18);
  });

  it('TOU Super off-peak rate is the lowest at $0.07-0.10/kWh', () => {
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
