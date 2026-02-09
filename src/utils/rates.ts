// PSE Rate Structures (Effective 1/29/2026)
// Source: Electric Summary Sheet summ_elec_prices_2026_01_29.pdf
//
// ============================================================
// UPDATE RATES HERE when PSE changes them
// ============================================================

export const RATE_EFFECTIVE_DATE = '2026-01-29';

export const BASIC_CHARGE = 7.49; // $/month (same for all schedules)

// Additional per-kWh charges applied to ALL schedules equally (Sch 95, 120, 194)
export const ADDITIONAL_PER_KWH_CHARGES = {
  conservationCharge: 0.007862,    // Electric Conservation Service Rider (Sch 120)
  powerCostAdjustment: 0.038719,   // Power Cost Adj Clause & Supp Rate (Sch 95)
  energyExchangeCredit: -0.006648, // Energy Exchange Credit (Sch 194)
};
export const ADDITIONAL_PER_KWH =
  ADDITIONAL_PER_KWH_CHARGES.conservationCharge +
  ADDITIONAL_PER_KWH_CHARGES.powerCostAdjustment +
  ADDITIONAL_PER_KWH_CHARGES.energyExchangeCredit;

// Schedule 7 - Standard Flat Rate
export const FLAT_RATE = {
  tier1Limit: 600, // kWh per month
  tier1Rate: 0.145171, // $/kWh for first 600 kWh
  tier2Rate: 0.164588, // $/kWh above 600 kWh
};

// Schedule 307 - Time-of-Use (2-tier: peak/off-peak)
// Note: Summer (Apr-Sep) peak is evening only (5-8pm); Winter has both morning + evening
export const TOU_RATE = {
  // Peak hours: Mon-Fri only
  peakHours: {
    morning: { start: 7, end: 10 }, // 7am-10am (winter only for SCH 307)
    evening: { start: 17, end: 20 }, // 5pm-8pm
  },
  // Electricity charge only (additional per-kWh charges added in getter)
  peakRateWinter: 0.538434, // Oct-Mar
  peakRateSummer: 0.341175, // Apr-Sep
  offPeakRate: 0.114186,
};

// Schedule 327 - Time-of-Use with Super Off-Peak (3-tier)
// Peak hours are the same in both seasons for SCH 327
export const TOU_SUPER_RATE = {
  // Peak hours: Mon-Fri only
  peakHours: {
    morning: { start: 7, end: 10 }, // 7am-10am
    evening: { start: 17, end: 20 }, // 5pm-8pm
  },
  // Mid-peak (off-peak during daytime): 10am-5pm, 8pm-11pm weekdays, 7am-11pm weekends
  // Super off-peak: 11pm-7am every day
  superOffPeakHours: { start: 23, end: 7 }, // 11pm-7am
  // Electricity charge only (additional per-kWh charges added in getter)
  peakRateWinter: 0.509564, // Oct-Mar
  peakRateSummer: 0.277828, // Apr-Sep
  offPeakRateWinter: 0.133077, // mid-peak / standard off-peak (Oct-Mar)
  offPeakRateSummer: 0.128044, // mid-peak / standard off-peak (Apr-Sep)
  superOffPeakRate: 0.081531, // 11pm-7am year-round
};

// ============================================================
// Rate calculation functions
// ============================================================

// Effective flat rate per kWh (including all adjustments)
export const FLAT_EFFECTIVE_TIER1 = FLAT_RATE.tier1Rate + ADDITIONAL_PER_KWH;
export const FLAT_EFFECTIVE_TIER2 = FLAT_RATE.tier2Rate + ADDITIONAL_PER_KWH;

export function isPeakHour(hour: number, dayOfWeek: number): boolean {
  // Weekends are always off-peak
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  const { morning, evening } = TOU_RATE.peakHours;
  return (hour >= morning.start && hour < morning.end) || 
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
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  const winter = isWinterMonth(month);

  // SCH 307: Summer peak is evening only (5-8pm), winter has both morning + evening
  if (dayOfWeek !== 0 && dayOfWeek !== 6) { // weekdays only
    const { morning, evening } = TOU_RATE.peakHours;
    const isEveningPeak = hour >= evening.start && hour < evening.end;
    const isMorningPeak = hour >= morning.start && hour < morning.end;

    if (isEveningPeak || (winter && isMorningPeak)) {
      return (winter ? TOU_RATE.peakRateWinter : TOU_RATE.peakRateSummer) + ADDITIONAL_PER_KWH;
    }
  }

  return TOU_RATE.offPeakRate + ADDITIONAL_PER_KWH;
}

export function getTouSuperRate(date: Date, hour: number): number {
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  const winter = isWinterMonth(month);

  // Super off-peak: 11pm-7am every day
  if (isSuperOffPeakHour(hour)) {
    return TOU_SUPER_RATE.superOffPeakRate + ADDITIONAL_PER_KWH;
  }

  // Peak hours: weekdays only (both morning + evening year-round for SCH 327)
  if (isPeakHour(hour, dayOfWeek)) {
    return (winter ? TOU_SUPER_RATE.peakRateWinter : TOU_SUPER_RATE.peakRateSummer) + ADDITIONAL_PER_KWH;
  }

  // Everything else is mid-peak/off-peak (seasonal rates)
  return (winter ? TOU_SUPER_RATE.offPeakRateWinter : TOU_SUPER_RATE.offPeakRateSummer) + ADDITIONAL_PER_KWH;
}
