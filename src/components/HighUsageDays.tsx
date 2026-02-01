import type { DailyWeather } from '../utils/weather';

interface HighUsageDaysProps {
  records: { date: string; usage: number }[];
  weather?: DailyWeather[];
}

export function HighUsageDays({ records, weather }: HighUsageDaysProps) {
  // Aggregate usage by day
  const dailyUsage = new Map<string, number>();
  
  for (const record of records) {
    const current = dailyUsage.get(record.date) || 0;
    dailyUsage.set(record.date, current + record.usage);
  }

  // Create weather lookup
  const weatherMap = new Map(weather?.map(w => [w.date, w]) || []);

  const days = Array.from(dailyUsage.entries())
    .map(([date, usage]) => ({ date, usage, weather: weatherMap.get(date) }))
    .sort((a, b) => b.usage - a.usage);

  const topDays = days.slice(0, 5);
  const avgUsage = days.reduce((sum, d) => sum + d.usage, 0) / days.length;

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Determine if temp was extreme
  const getTempContext = (w: DailyWeather | undefined) => {
    if (!w) return null;
    const temp = w.tempMean;
    if (temp <= 35) return { text: `${temp.toFixed(0)}°F 🥶`, type: 'cold' };
    if (temp >= 80) return { text: `${temp.toFixed(0)}°F 🔥`, type: 'hot' };
    if (temp <= 45) return { text: `${temp.toFixed(0)}°F`, type: 'cool' };
    if (temp >= 70) return { text: `${temp.toFixed(0)}°F`, type: 'warm' };
    return { text: `${temp.toFixed(0)}°F`, type: 'mild' };
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Highest Usage Days</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Days with unusually high electricity use</p>
      
      <div className="space-y-3">
        {topDays.map((day) => {
          const percentAboveAvg = ((day.usage - avgUsage) / avgUsage * 100).toFixed(0);
          const barWidth = (day.usage / topDays[0].usage) * 100;
          const tempContext = getTempContext(day.weather);
          
          return (
            <div key={day.date}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-600 dark:text-stone-300">
                  {formatDate(day.date)}
                  {tempContext && (
                    <span className={`ml-2 ${
                      tempContext.type === 'cold' || tempContext.type === 'cool' 
                        ? 'text-blue-500 dark:text-blue-400' 
                        : tempContext.type === 'hot' || tempContext.type === 'warm'
                        ? 'text-orange-500 dark:text-orange-400'
                        : 'text-stone-400'
                    }`}>
                      {tempContext.text}
                    </span>
                  )}
                </span>
                <span className="text-stone-900 dark:text-stone-100 font-medium">
                  {day.usage.toFixed(1)} kWh
                  <span className="text-orange-500 dark:text-orange-400 ml-2">
                    +{percentAboveAvg}%
                  </span>
                </span>
              </div>
              <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="mt-4 text-xs text-stone-400 dark:text-stone-500 text-center">
        Average daily usage: {avgUsage.toFixed(1)} kWh
      </p>
    </div>
  );
}
