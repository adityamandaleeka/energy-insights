import { describe, it, expect } from 'vitest';
import { 
  isPeakHour, 
  isPseHoliday,
  isWinterMonth, 
  TOU_RATE, 
  TOU_SUPER_RATE,
  FLAT_RATE,
  BASIC_CHARGE,
  ADDITIONAL_PER_KWH,
  ADDITIONAL_PER_KWH_CHARGES,
  FLAT_EFFECTIVE_TIER1,
  FLAT_EFFECTIVE_TIER2,
  RATE_EFFECTIVE_DATE,
  getTouRate,
  getTouSuperRate,
} from '../utils/rates';

describe('isPeakHour', () => {
  it.each([5, 6, 7, 8, 9])('uses morning and evening peaks on January %i, 2026', day => {
    const date = new Date(2026, 0, day);
    for (let hour = 0; hour < 24; hour++) {
      const expected = (hour >= 7 && hour < 10) || (hour >= 17 && hour < 20);
      expect(isPeakHour(date, hour, 'tou')).toBe(expected);
      expect(isPeakHour(date, hour, 'touSuper')).toBe(expected);
    }
  });

  it('returns false for all weekend hours', () => {
    for (const day of [10, 11]) {
      for (let hour = 0; hour < 24; hour++) {
        expect(isPeakHour(new Date(2026, 0, day), hour, 'tou')).toBe(false);
        expect(isPeakHour(new Date(2026, 0, day), hour, 'touSuper')).toBe(false);
      }
    }
  });

  it('excludes summer mornings only for Schedule 307', () => {
    const date = new Date(2026, 6, 6);
    expect(isPeakHour(date, 8, 'tou')).toBe(false);
    expect(isPeakHour(date, 8, 'touSuper')).toBe(true);
    expect(isPeakHour(date, 18, 'tou')).toBe(true);
    expect(isPeakHour(date, 18, 'touSuper')).toBe(true);
  });
});

describe('PSE legal holidays', () => {
  it.each([
    { date: '2026-01-01', offPeak: 0.174609 },
    { date: '2026-01-19', offPeak: 0.174609 },
    { date: '2026-02-16', offPeak: 0.174609 },
    { date: '2026-05-25', offPeak: 0.169576 },
    { date: '2026-06-19', offPeak: 0.169576 },
    { date: '2026-07-04', offPeak: 0.169576 },
    { date: '2026-09-07', offPeak: 0.169576 },
    { date: '2026-11-11', offPeak: 0.174609 },
    { date: '2026-11-26', offPeak: 0.174609 },
    { date: '2026-11-27', offPeak: 0.174609 },
    { date: '2026-12-25', offPeak: 0.174609 },
  ])('uses off-peak prices on $date and preserves overnight prices', ({ date, offPeak }) => {
    const holiday = new Date(`${date}T00:00:00`);
    expect(isPseHoliday(holiday)).toBe(true);
    for (let hour = 0; hour < 24; hour++) {
      expect(isPeakHour(holiday, hour, 'tou')).toBe(false);
      expect(isPeakHour(holiday, hour, 'touSuper')).toBe(false);
      expect(getTouRate(holiday, hour)).toBeCloseTo(0.155718, 6);
      expect(getTouSuperRate(holiday, hour)).toBeCloseTo(hour < 7 || hour >= 23 ? 0.123063 : offPeak, 6);
    }
  });

  it.each(['2024-01-15', '2025-02-17', '2021-05-31', '2020-09-07', '2024-11-28', '2024-11-29'])(
    'computes movable holidays for other years: %s', date => {
      expect(isPseHoliday(new Date(`${date}T00:00:00`))).toBe(true);
    }
  );

  it.each(['2026-07-03', '2026-07-06', '2026-10-12', '2026-11-25', '2026-11-30', '2027-12-24'])(
    'does not add non-tariff holidays or observed substitute dates: %s', date => {
      const weekday = new Date(`${date}T00:00:00`);
      expect(isPseHoliday(weekday)).toBe(false);
      expect(isPeakHour(weekday, 18, 'tou')).toBe(true);
      expect(isPeakHour(weekday, 18, 'touSuper')).toBe(true);
    }
  );
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
    expect(TOU_SUPER_RATE.superOffPeakRate).toBeLessThan(TOU_SUPER_RATE.offPeakRateWinter);
    expect(TOU_SUPER_RATE.superOffPeakRate).toBeLessThan(TOU_SUPER_RATE.offPeakRateSummer);
    expect(TOU_SUPER_RATE.offPeakRateWinter).toBeLessThan(TOU_SUPER_RATE.peakRateSummer);
    expect(TOU_SUPER_RATE.offPeakRateSummer).toBeLessThan(TOU_SUPER_RATE.peakRateSummer);
    expect(TOU_SUPER_RATE.peakRateSummer).toBeLessThan(TOU_SUPER_RATE.peakRateWinter);
  });
});

describe('October 1, 2026 published prices', () => {
  it('includes the published charges and credits exactly once', () => {
    expect(RATE_EFFECTIVE_DATE).toBe('2026-10-01');
    expect(BASIC_CHARGE).toBe(7.49);
    expect(ADDITIONAL_PER_KWH_CHARGES).toEqual({
      conservationCharge: 0.009409,
      powerCostAdjustment: 0.038719,
      energyExchangeCredit: -0.006648,
      federalWindPowerCredit: -0.002378,
    });
    expect(ADDITIONAL_PER_KWH).toBeCloseTo(0.039102, 6);
  });

  it('matches both published Schedule 7 totals', () => {
    expect(FLAT_EFFECTIVE_TIER1).toBeCloseTo(0.189119, 6);
    expect(FLAT_EFFECTIVE_TIER2).toBeCloseTo(0.208536, 6);
  });

  it.each([
    { month: 0, hour: 6, tou: 0.155718, touSuper: 0.123063 },
    { month: 0, hour: 7, tou: 0.579966, touSuper: 0.551096 },
    { month: 0, hour: 10, tou: 0.155718, touSuper: 0.174609 },
    { month: 0, hour: 17, tou: 0.579966, touSuper: 0.551096 },
    { month: 0, hour: 20, tou: 0.155718, touSuper: 0.174609 },
    { month: 0, hour: 23, tou: 0.155718, touSuper: 0.123063 },
    { month: 6, hour: 6, tou: 0.155718, touSuper: 0.123063 },
    { month: 6, hour: 7, tou: 0.155718, touSuper: 0.319360 },
    { month: 6, hour: 10, tou: 0.155718, touSuper: 0.169576 },
    { month: 6, hour: 17, tou: 0.382707, touSuper: 0.319360 },
    { month: 6, hour: 20, tou: 0.155718, touSuper: 0.169576 },
    { month: 6, hour: 23, tou: 0.155718, touSuper: 0.123063 },
  ])('matches weekday prices for month $month at $hour:00', ({ month, hour, tou, touSuper }) => {
    const date = new Date(2026, month, 6);
    expect(getTouRate(date, hour)).toBeCloseTo(tou, 6);
    expect(getTouSuperRate(date, hour)).toBeCloseTo(touSuper, 6);
  });

  it.each([
    { date: new Date(2026, 0, 10), offPeak: 0.174609 },
    { date: new Date(2026, 6, 11), offPeak: 0.169576 },
  ])('matches weekend prices on $date', ({ date, offPeak }) => {
    expect(getTouRate(date, 8)).toBeCloseTo(0.155718, 6);
    expect(getTouSuperRate(date, 8)).toBeCloseTo(offPeak, 6);
    expect(getTouSuperRate(date, 0)).toBeCloseTo(0.123063, 6);
  });
});
