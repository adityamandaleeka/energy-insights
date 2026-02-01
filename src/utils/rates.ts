// PSE Rate Structures (Effective 1/29/2026)
// From Electric Summary Sheet summ_elec_prices_2026_01_29.pdf

export const BASIC_CHARGE = 7.49; // $/month

export const FLAT_RATE = {
  tier1Limit: 600, // kWh per month
  tier1Rate: 0.145171, // $/kWh for first 600 kWh
  tier2Rate: 0.164588, // $/kWh above 600 kWh
  // Additional charges bundled into effective rate
  conservationCharge: 0.007862,
  powerCostAdjustment: 0.038719,
  energyExchangeCredit: -0.006648,
};

// Effective flat rate per kWh (including all adjustments)
export const FLAT_EFFECTIVE_TIER1 = FLAT_RATE.tier1Rate + FLAT_RATE.conservationCharge + FLAT_RATE.powerCostAdjustment + FLAT_RATE.energyExchangeCredit;
export const FLAT_EFFECTIVE_TIER2 = FLAT_RATE.tier2Rate + FLAT_RATE.conservationCharge + FLAT_RATE.powerCostAdjustment + FLAT_RATE.energyExchangeCredit;

export const TOU_RATE = {
  peakHours: {
    morning: { start: 7, end: 10 }, // 7am-10am
    evening: { start: 17, end: 20 }, // 5pm-8pm
  },
  // Schedule 307 rates (from S-2)
  peakRateWinter: 0.538434, // Oct-Mar
  peakRateSummer: 0.341175, // Apr-Sep
  offPeakRate: 0.114186,
};

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
  
  if (!isPeakHour(hour, dayOfWeek)) {
    return TOU_RATE.offPeakRate;
  }
  
  return isWinterMonth(month) ? TOU_RATE.peakRateWinter : TOU_RATE.peakRateSummer;
}

export function calculateTouBasicCharge(): number {
  return BASIC_CHARGE;
}
