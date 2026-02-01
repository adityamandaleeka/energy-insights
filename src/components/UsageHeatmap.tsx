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
  if (max === 0) return 'bg-stone-100';
  const intensity = value / max;
  
  if (intensity < 0.2) return 'bg-stone-100';
  if (intensity < 0.4) return 'bg-stone-200';
  if (intensity < 0.6) return 'bg-stone-300';
  if (intensity < 0.8) return 'bg-stone-400';
  return 'bg-stone-600';
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
    <div className="bg-white border border-stone-200 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 mb-1">Usage by Hour</h2>
      <p className="text-xs text-stone-400 mb-4">Average consumption patterns</p>
      
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          <div className="flex mb-1">
            <div className="w-10" />
            {HOURS.filter((_, i) => i % 4 === 0).map((hour) => (
              <div key={hour} className="flex-1 text-xs text-stone-400 text-center">
                {getHourLabel(hour)}
              </div>
            ))}
          </div>

          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center mb-0.5">
              <div className="w-10 text-xs text-stone-500">{day}</div>
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

          <div className="flex items-center justify-end gap-2 mt-3 text-xs text-stone-400">
            <span>Less</span>
            <div className="flex gap-px">
              <div className="w-4 h-3 bg-stone-100" />
              <div className="w-4 h-3 bg-stone-200" />
              <div className="w-4 h-3 bg-stone-300" />
              <div className="w-4 h-3 bg-stone-400" />
              <div className="w-4 h-3 bg-stone-600" />
            </div>
            <span>More</span>
          </div>

          <p className="mt-4 text-xs text-stone-500">
            Peak TOU hours: Mon–Fri 7–10am & 5–8pm
          </p>
        </div>
      </div>
    </div>
  );
}
