// PSE Rate Structures (2025-2026)

export const FLAT_RATE = {
  tier1Limit: 600, // kWh
  tier1Rate: 0.122, // $/kWh for first 600 kWh
  tier2Rate: 0.142, // $/kWh above 600 kWh
};

export const TOU_RATE = {
  peakHours: {
    morning: { start: 7, end: 10 }, // 7am-10am
    evening: { start: 17, end: 20 }, // 5pm-8pm
  },
  peakRateWinter: 0.345, // Oct-Mar
  peakRateSummer: 0.23, // Apr-Sep
  offPeakRate: 0.096,
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
    return totalKwh * FLAT_RATE.tier1Rate;
  }
  return (FLAT_RATE.tier1Limit * FLAT_RATE.tier1Rate) + 
         ((totalKwh - FLAT_RATE.tier1Limit) * FLAT_RATE.tier2Rate);
}

export function getTouRate(date: Date, hour: number): number {
  const dayOfWeek = date.getDay();
  const month = date.getMonth();
  
  if (!isPeakHour(hour, dayOfWeek)) {
    return TOU_RATE.offPeakRate;
  }
  
  return isWinterMonth(month) ? TOU_RATE.peakRateWinter : TOU_RATE.peakRateSummer;
}
