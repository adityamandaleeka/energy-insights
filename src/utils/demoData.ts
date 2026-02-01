import type { UsageRecord } from '../types';

export type DemoPersona = 'ev-wfh' | 'family';

export const DEMO_PERSONAS = [
  { 
    id: 'ev-wfh' as const, 
    name: 'EV Owner, Works from Home',
    description: 'Charges EV overnight, home during day'
  },
  { 
    id: 'family' as const, 
    name: 'Family with School-Age Kids',
    description: 'Morning rush, evening family time'
  },
];

// EV owner who works from home - benefits from TOU
function generateEvWfhData(): UsageRecord[] {
  const records: UsageRecord[] = [];
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-06-30');
  
  // Pattern: EV charging overnight, WFH with midday usage, low peak usage
  const hourlyPattern = [
    0.20, 0.25, 0.25, 0.20, 0.15, 0.10, // 0-5am: EV charging overnight
    0.04, 0.03, 0.03, 0.03,             // 6-9am: light morning (peak hours)
    0.08, 0.10, 0.12, 0.10, 0.08, 0.06, // 10am-3pm: WFH computer/lights
    0.04, 0.03, 0.03, 0.03,             // 4-7pm: low evening (peak hours)
    0.08, 0.12, 0.15, 0.10,             // 8-11pm: evening activity (off-peak)
  ];

  const getSeasonalMultiplier = (month: number): number => {
    const multipliers = [1.4, 1.3, 1.1, 0.9, 0.8, 0.85];
    return multipliers[month] || 1;
  };

  const getWeekendMultiplier = (dayOfWeek: number, hour: number): number => {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (hour >= 10 && hour <= 16) return 1.3;
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
      
      for (let interval = 0; interval < 4; interval++) {
        const minute = interval * 15;
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 14;
        const endTime = `${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
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

// Family with school-age kids - typical pattern, may not benefit from TOU
function generateFamilyData(): UsageRecord[] {
  const records: UsageRecord[] = [];
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-06-30');
  
  // Pattern: morning rush getting kids ready, empty during day, heavy evening
  const hourlyPattern = [
    0.02, 0.02, 0.02, 0.02, 0.02, 0.03, // 0-5am: sleeping
    0.12, 0.18, 0.15, 0.08,             // 6-9am: morning rush (peak!) - showers, breakfast, hairdryers
    0.03, 0.02, 0.02, 0.02, 0.03, 0.04, // 10am-3pm: empty house
    0.10, 0.15, 0.20, 0.18,             // 4-7pm: everyone home (peak!) - cooking, homework, TV
    0.15, 0.12, 0.08, 0.04,             // 8-11pm: winding down
  ];

  const getSeasonalMultiplier = (month: number): number => {
    const multipliers = [1.5, 1.4, 1.2, 0.9, 0.8, 0.9]; // higher winter for heating
    return multipliers[month] || 1;
  };

  const getWeekendMultiplier = (dayOfWeek: number, hour: number): number => {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekends: sleep in, busy all day with activities
      if (hour >= 6 && hour <= 8) return 0.5; // sleep in
      if (hour >= 9 && hour <= 16) return 1.4; // everyone home
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
      
      for (let interval = 0; interval < 4; interval++) {
        const minute = interval * 15;
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 14;
        const endTime = `${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
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

export function generateDemoData(persona: DemoPersona = 'ev-wfh'): UsageRecord[] {
  switch (persona) {
    case 'family':
      return generateFamilyData();
    case 'ev-wfh':
    default:
      return generateEvWfhData();
  }
}
