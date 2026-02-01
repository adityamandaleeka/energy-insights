import Papa from 'papaparse';
import type { UsageRecord, DailyUsage, MonthlyStats, HourlyAverage } from '../types';
import { isPeakHour, getTouRate, calculateFlatRateCost } from './rates';

interface RawRow {
  TYPE: string;
  DATE: string;
  'START TIME': string;
  'END TIME': string;
  'USAGE (kWh)': string;
  NOTES?: string;
}

function preprocessCSV(text: string): string {
  const lines = text.split('\n');
  // Find the line that starts with TYPE (the actual header row)
  const headerIndex = lines.findIndex(line => line.startsWith('TYPE,'));
  if (headerIndex === -1) {
    // Try to find it case-insensitive or with slight variations
    const altIndex = lines.findIndex(line => 
      line.toUpperCase().startsWith('TYPE,') || 
      line.includes('TYPE,DATE,')
    );
    if (altIndex !== -1) {
      return lines.slice(altIndex).join('\n');
    }
    return text; // Return original if no header found
  }
  return lines.slice(headerIndex).join('\n');
}

export function parseCSV(file: File): Promise<UsageRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const processedText = preprocessCSV(text);
      
      Papa.parse<RawRow>(processedText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const records: UsageRecord[] = results.data
            .filter((row) => row.TYPE === 'Electric usage')
            .map((row) => ({
              type: row.TYPE,
              date: row.DATE,
              startTime: row['START TIME'],
              endTime: row['END TIME'],
              usage: parseFloat(row['USAGE (kWh)']) || 0,
              notes: row.NOTES,
            }));
          resolve(records);
        },
        error: (error: Error) => reject(error),
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function calculateDailyUsage(records: UsageRecord[]): DailyUsage[] {
  const dailyMap = new Map<string, DailyUsage>();

  for (const record of records) {
    const date = new Date(record.date);
    const hour = parseInt(record.startTime.split(':')[0], 10);
    const dayOfWeek = date.getDay();
    const isPeak = isPeakHour(hour, dayOfWeek);

    if (!dailyMap.has(record.date)) {
      dailyMap.set(record.date, {
        date: record.date,
        totalUsage: 0,
        peakUsage: 0,
        offPeakUsage: 0,
        hourlyUsage: new Array(24).fill(0),
      });
    }

    const daily = dailyMap.get(record.date)!;
    daily.totalUsage += record.usage;
    daily.hourlyUsage[hour] += record.usage;

    if (isPeak) {
      daily.peakUsage += record.usage;
    } else {
      daily.offPeakUsage += record.usage;
    }
  }

  return Array.from(dailyMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export function calculateMonthlyStats(records: UsageRecord[]): MonthlyStats[] {
  const monthlyMap = new Map<string, { usage: number; peak: number; offPeak: number; touCost: number }>();

  for (const record of records) {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const hour = parseInt(record.startTime.split(':')[0], 10);
    const dayOfWeek = date.getDay();
    const isPeak = isPeakHour(hour, dayOfWeek);
    const touRate = getTouRate(date, hour);

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { usage: 0, peak: 0, offPeak: 0, touCost: 0 });
    }

    const monthly = monthlyMap.get(monthKey)!;
    monthly.usage += record.usage;
    monthly.touCost += record.usage * touRate;

    if (isPeak) {
      monthly.peak += record.usage;
    } else {
      monthly.offPeak += record.usage;
    }
  }

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      totalUsage: data.usage,
      flatCost: calculateFlatRateCost(data.usage),
      touCost: data.touCost,
      peakUsage: data.peak,
      offPeakUsage: data.offPeak,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function calculateHourlyAverages(records: UsageRecord[]): HourlyAverage[] {
  const hourlyMap = new Map<string, { total: number; count: number }>();

  for (const record of records) {
    const date = new Date(record.date);
    const hour = parseInt(record.startTime.split(':')[0], 10);
    const weekday = date.getDay();
    const key = `${weekday}-${hour}`;

    if (!hourlyMap.has(key)) {
      hourlyMap.set(key, { total: 0, count: 0 });
    }

    const data = hourlyMap.get(key)!;
    data.total += record.usage;
    data.count += 1;
  }

  return Array.from(hourlyMap.entries()).map(([key, data]) => {
    const [weekday, hour] = key.split('-').map(Number);
    return {
      hour,
      weekday,
      average: data.total / (data.count || 1),
    };
  });
}

export function calculateTotalCosts(records: UsageRecord[]): { flatCost: number; touCost: number } {
  // Calculate per-month to apply flat rate tiers correctly per billing period
  const monthlyMap = new Map<string, { usage: number; touCost: number }>();

  for (const record of records) {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const hour = parseInt(record.startTime.split(':')[0], 10);
    const rate = getTouRate(date, hour);

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { usage: 0, touCost: 0 });
    }

    const monthly = monthlyMap.get(monthKey)!;
    monthly.usage += record.usage;
    monthly.touCost += record.usage * rate;
  }

  let flatCost = 0;
  let touCost = 0;

  for (const data of monthlyMap.values()) {
    flatCost += calculateFlatRateCost(data.usage);
    touCost += data.touCost;
  }

  return { flatCost, touCost };
}
