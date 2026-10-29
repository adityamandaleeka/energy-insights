import type { PeakUsageByPlan, TouPlan } from '../types';

// PSE Rate Structures (Effective 10/1/2026)
// Source: Electric Summary Sheet summ_elec_prices_2026_10_01.pdf
//
// ============================================================
// UPDATE RATES HERE when PSE changes them
// ============================================================

export const RATE_EFFECTIVE_DATE = '2026-10-01';
export const RATE_SOURCE_URL = 'https://www.pse.com/-/media/Project/PSE/Portal/Rate-documents/summ_elec_prices_2026_10_01.pdf';

export const BASIC_CHARGE = 7.49; // $/month (same for all schedules)

// Additional per-kWh charges and credits applied to ALL schedules equally.
export const ADDITIONAL_PER_KWH_CHARGES = {
  conservationCharge: 0.009409,    // Electric Conservation Service Rider (Sch 120)
  powerCostAdjustment: 0.038719,   // Power Cost Adj Clause & Supp Rate (Sch 95)
  energyExchangeCredit: -0.006648, // Energy Exchange Credit (Sch 194)
  federalWindPowerCredit: -0.002378, // Federal Wind Power Credit (Sch 95A)
};
export const ADDITIONAL_PER_KWH =
  ADDITIONAL_PER_KWH_CHARGES.conservationCharge +
  ADDITIONAL_PER_KWH_CHARGES.powerCostAdjustment +
  ADDITIONAL_PER_KWH_CHARGES.energyExchangeCredit +
  ADDITIONAL_PER_KWH_CHARGES.federalWindPowerCredit;

// These electricity-charge totals include the summary sheet's bundled riders;
// only ADDITIONAL_PER_KWH is added separately.
// Schedule 7 - Standard Flat Rate
export const FLAT_RATE = {
  tier1Limit: 600, // kWh per month
  tier1Rate: 0.150017, // $/kWh for first 600 kWh
  tier2Rate: 0.169434, // $/kWh above 600 kWh
};

// Schedule 307 - Time-of-Use (2-tier: peak/off-peak)
// Note: Summer (Apr-Sep) peak is evening only (5-8pm); Winter has both morning + evening
export const TOU_RATE = {
  // Peak hours: Mon-Fri, excluding PSE legal holidays
  peakHours: {
    morning: { start: 7, end: 10 }, // 7am-10am (winter only for SCH 307)
    evening: { start: 17, end: 20 }, // 5pm-8pm
  },
  // Electricity charge only (additional per-kWh charges added in getter)
  peakRateWinter: 0.540864, // Oct-Mar
  peakRateSummer: 0.343605, // Apr-Sep
  offPeakRate: 0.116616,
};

// Schedule 327 - Time-of-Use with Super Off-Peak (3-tier)
// Peak hours are the same in both seasons for SCH 327
export const TOU_SUPER_RATE = {
  // Peak hours: Mon-Fri, excluding PSE legal holidays
  peakHours: {
    morning: { start: 7, end: 10 }, // 7am-10am
    evening: { start: 17, end: 20 }, // 5pm-8pm
  },
  // Mid-peak (off-peak during daytime): 10am-5pm, 8pm-11pm weekdays, 7am-11pm weekends
  // Super off-peak: 11pm-7am every day
  superOffPeakHours: { start: 23, end: 7 }, // 11pm-7am
  // Electricity charge only (additional per-kWh charges added in getter)
  peakRateWinter: 0.511994, // Oct-Mar
  peakRateSummer: 0.280258, // Apr-Sep
  offPeakRateWinter: 0.135507, // mid-peak / standard off-peak (Oct-Mar)
  offPeakRateSummer: 0.130474, // mid-peak / standard off-peak (Apr-Sep)
  superOffPeakRate: 0.083961, // 11pm-7am year-round
};

// ============================================================
// Rate calculation functions
// ============================================================

// Effective flat rate per kWh (including all adjustments)
export const FLAT_EFFECTIVE_TIER1 = FLAT_RATE.tier1Rate + ADDITIONAL_PER_KWH;
export const FLAT_EFFECTIVE_TIER2 = FLAT_RATE.tier2Rate + ADDITIONAL_PER_KWH;

// Schedules 307-B and 327-B list these dates, not a generic federal holiday calendar.
// https://www.pse.com/-/media/Project/PSE/Portal/Rate-documents/Electric/elec_sch_307.pdf
export function isPseHoliday(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = date.getDay();

  switch (month) {
    case 0:
      return day === 1 || (weekday === 1 && day >= 15 && day <= 21);
    case 1:
      return weekday === 1 && day >= 15 && day <= 21;
    case 4:
      return weekday === 1 && day >= 25;
    case 5:
      return day === 19;
    case 6:
      return day === 4;
    case 8:
      return weekday === 1 && day <= 7;
    case 10:
      return day === 11 ||
        (weekday === 4 && day >= 22 && day <= 28) ||
        (weekday === 5 && day >= 23 && day <= 29);
    case 11:
      return day === 25;
    default:
      return false;
  }
}

export function isPeakHour(date: Date, hour: number, plan: TouPlan): boolean {
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6 || isPseHoliday(date)) return false;

  const { morning, evening } = plan === 'tou' ? TOU_RATE.peakHours : TOU_SUPER_RATE.peakHours;
  const morningIsPeak = plan === 'touSuper' || isWinterMonth(date.getMonth());
  return (morningIsPeak && hour >= morning.start && hour < morning.end) ||
    (hour >= evening.start && hour < evening.end);
}

export function isWinterMonth(month: number): boolean {
  // Oct (9), Nov (10), Dec (11), Jan (0), Feb (1), Mar (2)
  return month >= 9 || month <= 2;
}

export function isSuperOffPeakHour(hour: number): boolean {
  // 11pm (23) to 7am - spans midnight
  return hour >= 23 || hour < 7;
}

export function calculateFlatRateCost(totalKwh: number): number {
  if (totalKwh <= FLAT_RATE.tier1Limit) {
    return totalKwh * FLAT_EFFECTIVE_TIER1 + BASIC_CHARGE;
  }
  return (FLAT_RATE.tier1Limit * FLAT_EFFECTIVE_TIER1) + 
         ((totalKwh - FLAT_RATE.tier1Limit) * FLAT_EFFECTIVE_TIER2) + BASIC_CHARGE;
}

export function getTouRate(date: Date, hour: number): number {
  if (isPeakHour(date, hour, 'tou')) {
    return (isWinterMonth(date.getMonth()) ? TOU_RATE.peakRateWinter : TOU_RATE.peakRateSummer) + ADDITIONAL_PER_KWH;
  }

  return TOU_RATE.offPeakRate + ADDITIONAL_PER_KWH;
}

export function getTouSuperRate(date: Date, hour: number): number {
  const winter = isWinterMonth(date.getMonth());

  // Super off-peak: 11pm-7am every day
  if (isSuperOffPeakHour(hour)) {
    return TOU_SUPER_RATE.superOffPeakRate + ADDITIONAL_PER_KWH;
  }

  if (isPeakHour(date, hour, 'touSuper')) {
    return (winter ? TOU_SUPER_RATE.peakRateWinter : TOU_SUPER_RATE.peakRateSummer) + ADDITIONAL_PER_KWH;
  }

  // Everything else is mid-peak/off-peak (seasonal rates)
  return (winter ? TOU_SUPER_RATE.offPeakRateWinter : TOU_SUPER_RATE.offPeakRateSummer) + ADDITIONAL_PER_KWH;
}

export function calculateShiftSavings(peakUsage: PeakUsageByPlan, shiftPercent: number) {
  const fraction = shiftPercent / 100;

  // Total kWh and basic charges stay unchanged, so shared per-kWh adjustments cancel.
  return {
    tou: fraction * (
      peakUsage.tou.winter * (TOU_RATE.peakRateWinter - TOU_RATE.offPeakRate) +
      peakUsage.tou.summer * (TOU_RATE.peakRateSummer - TOU_RATE.offPeakRate)
    ),
    touSuperMin: fraction * (
      peakUsage.touSuper.winter * (TOU_SUPER_RATE.peakRateWinter - TOU_SUPER_RATE.offPeakRateWinter) +
      peakUsage.touSuper.summer * (TOU_SUPER_RATE.peakRateSummer - TOU_SUPER_RATE.offPeakRateSummer)
    ),
    touSuperMax: fraction * (
      peakUsage.touSuper.winter * (TOU_SUPER_RATE.peakRateWinter - TOU_SUPER_RATE.superOffPeakRate) +
      peakUsage.touSuper.summer * (TOU_SUPER_RATE.peakRateSummer - TOU_SUPER_RATE.superOffPeakRate)
    ),
  };
}
