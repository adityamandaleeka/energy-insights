import type { UsageRecord } from '../types';

// Generate synthetic demo data for 6 months
// Pattern: typical residential usage with morning/evening peaks
export function generateDemoData(): UsageRecord[] {
  const records: UsageRecord[] = [];
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-06-30');
  
  // Base load varies by hour (kWh per 15-min interval)
  const hourlyPattern = [
    0.03, 0.02, 0.02, 0.02, 0.02, 0.03, // 0-5am: low overnight
    0.08, 0.15, 0.12, 0.08,             // 6-9am: morning peak
    0.04, 0.03, 0.03, 0.03, 0.03, 0.04, // 10am-3pm: daytime low
    0.06, 0.10, 0.18, 0.15,             // 4-7pm: evening peak
    0.12, 0.10, 0.08, 0.05,             // 8-11pm: evening decline
  ];

  // Seasonal multiplier (higher in winter)
  const getSeasonalMultiplier = (month: number): number => {
    const multipliers = [1.4, 1.3, 1.1, 0.9, 0.8, 0.85]; // Jan-Jun
    return multipliers[month] || 1;
  };

  // Weekend multiplier (slightly different pattern)
  const getWeekendMultiplier = (dayOfWeek: number, hour: number): number => {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekends: sleep in, more midday usage
      if (hour >= 6 && hour <= 9) return 0.6; // less morning rush
      if (hour >= 10 && hour <= 16) return 1.3; // more home during day
    }
    return 1;
  };

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const month = currentDate.getMonth();
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split('T')[0];
    const seasonalMult = getSeasonalMultiplier(month);

    for (let hour = 0; hour < 24; hour++) {
      const baseUsage = hourlyPattern[hour];
      const weekendMult = getWeekendMultiplier(dayOfWeek, hour);
      
      // 4 intervals per hour (15 min each)
      for (let interval = 0; interval < 4; interval++) {
        const minute = interval * 15;
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 14;
        const endTime = `${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        // Add some randomness (±30%)
        const randomFactor = 0.7 + Math.random() * 0.6;
        const usage = Math.round(baseUsage * seasonalMult * weekendMult * randomFactor * 100) / 100;
        
        records.push({
          type: 'Electric usage',
          date: dateStr,
          startTime,
          endTime,
          usage: Math.max(0.01, usage),
        });
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return records;
}
