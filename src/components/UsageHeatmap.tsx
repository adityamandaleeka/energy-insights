import type { HourlyAverage } from '../types';

interface UsageHeatmapProps {
  hourlyAverages: HourlyAverage[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getHourLabel(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

function getColor(value: number, max: number): string {
  if (max === 0) return 'bg-stone-100 dark:bg-stone-800';
  const intensity = value / max;
  
  if (intensity < 0.2) return 'bg-teal-100 dark:bg-teal-900';
  if (intensity < 0.4) return 'bg-teal-300 dark:bg-teal-700';
  if (intensity < 0.6) return 'bg-yellow-300 dark:bg-yellow-600';
  if (intensity < 0.8) return 'bg-orange-400 dark:bg-orange-500';
  return 'bg-red-500 dark:bg-red-600';
}

export function UsageHeatmap({ hourlyAverages }: UsageHeatmapProps) {
  const averageMap = new Map<string, number>();
  let maxAverage = 0;

  for (const avg of hourlyAverages) {
    const key = `${avg.weekday}-${avg.hour}`;
    averageMap.set(key, avg.average);
    if (avg.average > maxAverage) maxAverage = avg.average;
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Usage by Hour</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Average consumption patterns</p>
      
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          <div className="flex mb-1">
            <div className="w-10" />
            {HOURS.filter((_, i) => i % 4 === 0).map((hour) => (
              <div key={hour} className="flex-1 text-xs text-stone-400 dark:text-stone-500 text-center">
                {getHourLabel(hour)}
              </div>
            ))}
          </div>

          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center mb-0.5">
              <div className="w-10 text-xs text-stone-500 dark:text-stone-400">{day}</div>
              <div className="flex-1 flex gap-px">
                {HOURS.map((hour) => {
                  const key = `${dayIndex}-${hour}`;
                  const value = averageMap.get(key) || 0;
                  return (
                    <div
                      key={hour}
                      className={`flex-1 h-5 ${getColor(value, maxAverage)}`}
                      title={`${day} ${getHourLabel(hour)}: ${(value * 1000).toFixed(0)} Wh`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-stone-400 dark:text-stone-500">
        <p>Peak TOU hours: Mon–Fri 7–10am & 5–8pm</p>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-px">
            <div className="w-4 h-3 bg-teal-100 dark:bg-teal-900" />
            <div className="w-4 h-3 bg-teal-300 dark:bg-teal-700" />
            <div className="w-4 h-3 bg-yellow-300 dark:bg-yellow-600" />
            <div className="w-4 h-3 bg-orange-400 dark:bg-orange-500" />
            <div className="w-4 h-3 bg-red-500 dark:bg-red-600" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
