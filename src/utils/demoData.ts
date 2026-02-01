import type { UsageRecord } from '../types';
import type { CSVMetadata } from './parser';
import type { DailyWeather } from './weather';

export type DemoPersona = 'ev-wfh' | 'family';

export interface DemoData {
  records: UsageRecord[];
  metadata: CSVMetadata;
  weather: DailyWeather[];
}

export const DEMO_PERSONAS = [
  { 
    id: 'ev-wfh' as const, 
    name: 'EV Owner, Works from Home',
    description: 'Charges EV overnight, home during day',
    location: 'Redmond, WA'
  },
  { 
    id: 'family' as const, 
    name: 'Family with School-Age Kids',
    description: 'Morning rush, evening family time, electric heat',
    location: 'Bothell, WA'
  },
];

// Generate synthetic weather data for Seattle area
function generateWeather(startDate: Date, endDate: Date): DailyWeather[] {
  const weather: DailyWeather[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfYear = Math.floor((current.getTime() - new Date(current.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    // Seattle-like temperatures: cold Jan (~40°F), warm Jul (~75°F)
    // Use sine wave for seasonal variation
    const seasonalBase = 55 + 20 * Math.sin((dayOfYear - 100) * 2 * Math.PI / 365);
    const dailyVariation = (Math.random() - 0.5) * 15; // +/- 7.5°F random
    const tempMean = Math.round((seasonalBase + dailyVariation) * 10) / 10;
    const tempMax = tempMean + 5 + Math.random() * 5;
    const tempMin = tempMean - 5 - Math.random() * 5;
    
    weather.push({
      date: current.toISOString().split('T')[0],
      tempMean,
      tempMax: Math.round(tempMax * 10) / 10,
      tempMin: Math.round(tempMin * 10) / 10,
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return weather;
}

// EV owner who works from home - benefits from TOU, has heat pump
function generateEvWfhData(weather: DailyWeather[]): UsageRecord[] {
  const records: UsageRecord[] = [];
  
  // Pattern: EV charging overnight, WFH with midday usage, low peak usage
  const hourlyPattern = [
    0.20, 0.25, 0.25, 0.20, 0.15, 0.10, // 0-5am: EV charging overnight
    0.04, 0.03, 0.03, 0.03,             // 6-9am: light morning (peak hours)
    0.08, 0.10, 0.12, 0.10, 0.08, 0.06, // 10am-3pm: WFH computer/lights
    0.04, 0.03, 0.03, 0.03,             // 4-7pm: low evening (peak hours)
    0.08, 0.12, 0.15, 0.10,             // 8-11pm: evening activity (off-peak)
  ];

  const getWeekendMultiplier = (dayOfWeek: number, hour: number): number => {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (hour >= 10 && hour <= 16) return 1.3;
    }
    return 1;
  };
  
  // Heat pump: efficient, moderate temp sensitivity
  const getTempMultiplier = (temp: number): number => {
    if (temp <= 35) return 1.5;      // Cold: heat pump works harder
    if (temp <= 45) return 1.3;
    if (temp <= 55) return 1.1;
    if (temp >= 80) return 1.3;      // Hot: AC
    if (temp >= 70) return 1.1;
    return 1.0;                       // Mild: baseline
  };

  for (const w of weather) {
    const date = new Date(w.date);
    const dayOfWeek = date.getDay();
    const tempMult = getTempMultiplier(w.tempMean);

    for (let hour = 0; hour < 24; hour++) {
      const baseUsage = hourlyPattern[hour];
      const weekendMult = getWeekendMultiplier(dayOfWeek, hour);
      
      for (let interval = 0; interval < 4; interval++) {
        const minute = interval * 15;
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 14;
        const endTime = `${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        const randomFactor = 0.7 + Math.random() * 0.6;
        const usage = Math.round(baseUsage * tempMult * weekendMult * randomFactor * 100) / 100;
        
        records.push({
          type: 'Electric usage',
          date: w.date,
          startTime,
          endTime,
          usage: Math.max(0.01, usage),
        });
      }
    }
  }

  return records;
}

// Family with school-age kids - electric baseboard heat (high temp sensitivity)
function generateFamilyData(weather: DailyWeather[]): UsageRecord[] {
  const records: UsageRecord[] = [];
  
  // Pattern: morning rush getting kids ready, empty during day, heavy evening
  const hourlyPattern = [
    0.02, 0.02, 0.02, 0.02, 0.02, 0.03, // 0-5am: sleeping
    0.12, 0.18, 0.15, 0.08,             // 6-9am: morning rush (peak!)
    0.03, 0.02, 0.02, 0.02, 0.03, 0.04, // 10am-3pm: empty house
    0.10, 0.15, 0.20, 0.18,             // 4-7pm: everyone home (peak!)
    0.15, 0.12, 0.08, 0.04,             // 8-11pm: winding down
  ];

  const getWeekendMultiplier = (dayOfWeek: number, hour: number): number => {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (hour >= 6 && hour <= 8) return 0.5;
      if (hour >= 9 && hour <= 16) return 1.4;
    }
    return 1;
  };
  
  // Electric baseboard heat: HIGH sensitivity to cold
  const getTempMultiplier = (temp: number): number => {
    if (temp <= 30) return 2.2;      // Very cold: baseboard cranking
    if (temp <= 40) return 1.8;
    if (temp <= 50) return 1.4;
    if (temp >= 85) return 1.4;      // Hot: window AC
    if (temp >= 75) return 1.2;
    return 1.0;
  };

  let seed = 12345;
  const seededRandom = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (const w of weather) {
    const date = new Date(w.date);
    const dayOfWeek = date.getDay();
    const tempMult = getTempMultiplier(w.tempMean);
    
    const dailyVariation = 0.7 + seededRandom() * 0.8;
    const isHighUsageDay = seededRandom() > 0.85;
    const highUsageMult = isHighUsageDay ? 1.5 + seededRandom() * 0.5 : 1;

    for (let hour = 0; hour < 24; hour++) {
      const baseUsage = hourlyPattern[hour];
      const weekendMult = getWeekendMultiplier(dayOfWeek, hour);
      
      for (let interval = 0; interval < 4; interval++) {
        const minute = interval * 15;
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 14;
        const endTime = `${hour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        const randomFactor = 0.7 + seededRandom() * 0.6;
        const usage = Math.round(baseUsage * tempMult * weekendMult * dailyVariation * highUsageMult * randomFactor * 100) / 100;
        
        records.push({
          type: 'Electric usage',
          date: w.date,
          startTime,
          endTime,
          usage: Math.max(0.01, usage),
        });
      }
    }
  }

  return records;
}

export function generateDemoData(persona: DemoPersona = 'ev-wfh'): DemoData {
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');
  const weather = generateWeather(startDate, endDate);
  
  const metadata: CSVMetadata = persona === 'ev-wfh' 
    ? {
        name: 'Demo User',
        address: '123 Main St, Redmond WA 98052',
        accountNumber: 'DEMO-EV-WFH',
        service: 'Demo Service',
      }
    : {
        name: 'Demo Family',
        address: '456 Oak Ave, Bothell WA 98011',
        accountNumber: 'DEMO-FAMILY',
        service: 'Demo Service',
      };
  
  const records = persona === 'family' 
    ? generateFamilyData(weather)
    : generateEvWfhData(weather);
  
  return { records, metadata, weather };
}
