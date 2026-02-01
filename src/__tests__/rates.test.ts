import { describe, it, expect } from 'vitest';
import { 
  isPeakHour, 
  isWinterMonth, 
  TOU_RATE, 
  TOU_SUPER_RATE,
  FLAT_RATE,
  BASIC_CHARGE,
} from '../utils/rates';

describe('isPeakHour', () => {
  // Peak hours are Mon-Fri 7-10am and 5-8pm
  
  it('returns true for weekday morning peak (7am)', () => {
    expect(isPeakHour(7, 1)).toBe(true); // Monday
    expect(isPeakHour(7, 3)).toBe(true); // Wednesday
    expect(isPeakHour(7, 5)).toBe(true); // Friday
  });

  it('returns true for weekday morning peak (8am, 9am)', () => {
    expect(isPeakHour(8, 2)).toBe(true);
    expect(isPeakHour(9, 4)).toBe(true);
  });

  it('returns false for 10am (end of morning peak)', () => {
    expect(isPeakHour(10, 1)).toBe(false);
  });

  it('returns true for weekday evening peak (5-8pm)', () => {
    expect(isPeakHour(17, 1)).toBe(true); // 5pm
    expect(isPeakHour(18, 2)).toBe(true); // 6pm
    expect(isPeakHour(19, 3)).toBe(true); // 7pm
  });

  it('returns false for 8pm (end of evening peak)', () => {
    expect(isPeakHour(20, 1)).toBe(false);
  });

  it('returns false for weekday off-peak hours', () => {
    expect(isPeakHour(0, 1)).toBe(false);  // midnight
    expect(isPeakHour(6, 2)).toBe(false);  // 6am
    expect(isPeakHour(12, 3)).toBe(false); // noon
    expect(isPeakHour(16, 4)).toBe(false); // 4pm
    expect(isPeakHour(21, 5)).toBe(false); // 9pm
  });

  it('returns false for all weekend hours', () => {
    // Saturday (6) and Sunday (0) are always off-peak
    for (let hour = 0; hour < 24; hour++) {
      expect(isPeakHour(hour, 0)).toBe(false); // Sunday
      expect(isPeakHour(hour, 6)).toBe(false); // Saturday
    }
  });
});

describe('isWinterMonth', () => {
  // Winter: Oct (9), Nov (10), Dec (11), Jan (0), Feb (1), Mar (2) - JS 0-indexed
  // Summer: Apr (3), May (4), Jun (5), Jul (6), Aug (7), Sep (8)
  
  it('returns true for winter months', () => {
    expect(isWinterMonth(0)).toBe(true);  // January
    expect(isWinterMonth(1)).toBe(true);  // February
    expect(isWinterMonth(2)).toBe(true);  // March
    expect(isWinterMonth(9)).toBe(true);  // October
    expect(isWinterMonth(10)).toBe(true); // November
    expect(isWinterMonth(11)).toBe(true); // December
  });

  it('returns false for summer months', () => {
    expect(isWinterMonth(3)).toBe(false); // April
    expect(isWinterMonth(4)).toBe(false); // May
    expect(isWinterMonth(5)).toBe(false); // June
    expect(isWinterMonth(6)).toBe(false); // July
    expect(isWinterMonth(7)).toBe(false); // August
    expect(isWinterMonth(8)).toBe(false); // September
  });
});

describe('Rate constants', () => {
  it('has valid basic charge', () => {
    expect(BASIC_CHARGE).toBeGreaterThan(0);
    expect(BASIC_CHARGE).toBeLessThan(20); // sanity check
  });

  it('has valid flat rate tiers', () => {
    expect(FLAT_RATE.tier1Rate).toBeGreaterThan(0);
    expect(FLAT_RATE.tier2Rate).toBeGreaterThan(FLAT_RATE.tier1Rate);
    expect(FLAT_RATE.tier1Limit).toBe(600);
  });

  it('has valid TOU rates with winter > summer', () => {
    expect(TOU_RATE.peakRateWinter).toBeGreaterThan(TOU_RATE.peakRateSummer);
    expect(TOU_RATE.offPeakRate).toBeLessThan(TOU_RATE.peakRateSummer);
  });

  it('has valid TOU Super rates with super off-peak lowest', () => {
    expect(TOU_SUPER_RATE.superOffPeakRate).toBeLessThan(TOU_SUPER_RATE.offPeakRate);
    expect(TOU_SUPER_RATE.offPeakRate).toBeLessThan(TOU_SUPER_RATE.peakRateSummer);
    expect(TOU_SUPER_RATE.peakRateSummer).toBeLessThan(TOU_SUPER_RATE.peakRateWinter);
  });
});
