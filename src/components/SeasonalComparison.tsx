import type { DailyWeather } from '../utils/weather';

interface SeasonalComparisonProps {
  records: { date: string; usage: number; startTime: string }[];
  weather?: DailyWeather[];
}

export function SeasonalComparison({ records, weather }: SeasonalComparisonProps) {
  // If we have weather data, use actual temperature to define cold/warm days
  // Otherwise fall back to calendar-based winter/summer
  const weatherMap = new Map(weather?.map(w => [w.date, w]) || []);
  const hasWeather = weather && weather.length > 30;
  
  // Temperature thresholds for cold/warm classification
  const coldThreshold = 50; // Days below 50°F are "cold"
  const warmThreshold = 65; // Days above 65°F are "warm"
  
  const isPeakHour = (hour: number, dayOfWeek: number) => {
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    return (hour >= 7 && hour < 10) || (hour >= 17 && hour < 20);
  };

  // Aggregate daily usage first
  const dailyData = new Map<string, { usage: number; peak: number; offPeak: number }>();
  
  for (const record of records) {
    const [year, month, day] = record.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const hour = parseInt(record.startTime.split(':')[0], 10);
    const isPeak = isPeakHour(hour, dayOfWeek);
    
    if (!dailyData.has(record.date)) {
      dailyData.set(record.date, { usage: 0, peak: 0, offPeak: 0 });
    }
    const d = dailyData.get(record.date)!;
    d.usage += record.usage;
    if (isPeak) d.peak += record.usage;
    else d.offPeak += record.usage;
  }

  // Classify days as cold or warm
  let coldUsage = 0, warmUsage = 0;
  let coldPeak = 0, warmPeak = 0;
  let coldDays: string[] = [], warmDays: string[] = [];
  let coldTemps: number[] = [], warmTemps: number[] = [];

  for (const [date, data] of dailyData.entries()) {
    const w = weatherMap.get(date);
    
    if (hasWeather && w) {
      // Use actual temperature
      if (w.tempMean <= coldThreshold) {
        coldUsage += data.usage;
        coldPeak += data.peak;
        coldDays.push(date);
        coldTemps.push(w.tempMean);
      } else if (w.tempMean >= warmThreshold) {
        warmUsage += data.usage;
        warmPeak += data.peak;
        warmDays.push(date);
        warmTemps.push(w.tempMean);
      }
      // Days between thresholds are "mild" and excluded
    } else {
      // Fallback to calendar-based seasons
      const month = parseInt(date.split('-')[1]);
      const jsMonth = month - 1;
      const isWinter = jsMonth >= 9 || jsMonth <= 2;
      
      if (isWinter) {
        coldUsage += data.usage;
        coldPeak += data.peak;
        coldDays.push(date);
      } else {
        warmUsage += data.usage;
        warmPeak += data.peak;
        warmDays.push(date);
      }
    }
  }

  const coldDayCount = coldDays.length || 1;
  const warmDayCount = warmDays.length || 1;

  const coldAvg = coldUsage / coldDayCount;
  const warmAvg = warmUsage / warmDayCount;

  const coldPeakPct = coldUsage > 0 ? (coldPeak / coldUsage) * 100 : 0;
  const warmPeakPct = warmUsage > 0 ? (warmPeak / warmUsage) * 100 : 0;

  const avgColdTemp = coldTemps.length > 0 
    ? coldTemps.reduce((a, b) => a + b, 0) / coldTemps.length 
    : null;
  const avgWarmTemp = warmTemps.length > 0 
    ? warmTemps.reduce((a, b) => a + b, 0) / warmTemps.length 
    : null;

  if (coldDays.length < 7 || warmDays.length < 7) {
    return (
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
        <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">
          {hasWeather ? 'Cold vs Warm Days' : 'Winter vs Summer'}
        </h2>
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Need data from both cold and warm periods to compare. Upload a full year of data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">
        {hasWeather ? 'Cold vs Warm Days' : 'Winter vs Summer'}
      </h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">
        {hasWeather 
          ? `Based on actual temperatures (cold: ≤${coldThreshold}°F, warm: ≥${warmThreshold}°F)`
          : 'How your usage changes by season'
        }
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Cold */}
        <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">❄️</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">
              {hasWeather ? 'Cold Days' : 'Winter'}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Avg/day</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">{coldAvg.toFixed(1)} kWh</span>
            </div>
            {avgColdTemp !== null && (
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Avg temp</span>
                <span className="text-blue-600 dark:text-blue-400">{avgColdTemp.toFixed(0)}°F</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Peak usage</span>
              <span className="text-stone-700 dark:text-stone-300">{coldPeakPct.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Days</span>
              <span className="text-stone-700 dark:text-stone-300">{coldDays.length}</span>
            </div>
          </div>
        </div>

        {/* Warm */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">☀️</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">
              {hasWeather ? 'Warm Days' : 'Summer'}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Avg/day</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">{warmAvg.toFixed(1)} kWh</span>
            </div>
            {avgWarmTemp !== null && (
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Avg temp</span>
                <span className="text-amber-600 dark:text-amber-400">{avgWarmTemp.toFixed(0)}°F</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Peak usage</span>
              <span className="text-stone-700 dark:text-stone-300">{warmPeakPct.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Days</span>
              <span className="text-stone-700 dark:text-stone-300">{warmDays.length}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-center text-stone-500 dark:text-stone-400">
        {coldAvg > warmAvg 
          ? `${hasWeather ? 'Cold days' : 'Winter'} usage is ${((coldAvg - warmAvg) / warmAvg * 100).toFixed(0)}% higher — likely heating`
          : `${hasWeather ? 'Warm days' : 'Summer'} usage is ${((warmAvg - coldAvg) / coldAvg * 100).toFixed(0)}% higher — likely cooling`
        }
      </p>
    </div>
  );
}
