interface SeasonalComparisonProps {
  records: { date: string; usage: number; startTime: string }[];
}

export function SeasonalComparison({ records }: SeasonalComparisonProps) {
  // Winter: Oct-Mar (months 10,11,12,1,2,3 → JS 9,10,11,0,1,2)
  // Summer: Apr-Sep (months 4,5,6,7,8,9 → JS 3,4,5,6,7,8)
  
  const isWinter = (month: number) => month >= 9 || month <= 2;
  
  let winterUsage = 0;
  let summerUsage = 0;
  let winterPeak = 0;
  let summerPeak = 0;
  let winterOffPeak = 0;
  let summerOffPeak = 0;
  const winterDays = new Set<string>();
  const summerDays = new Set<string>();

  const isPeakHour = (hour: number, dayOfWeek: number) => {
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    return (hour >= 7 && hour < 10) || (hour >= 17 && hour < 20);
  };

  for (const record of records) {
    const [year, month, day] = record.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const jsMonth = date.getMonth();
    const dayOfWeek = date.getDay();
    const hour = parseInt(record.startTime.split(':')[0], 10);
    const isPeak = isPeakHour(hour, dayOfWeek);

    if (isWinter(jsMonth)) {
      winterUsage += record.usage;
      winterDays.add(record.date);
      if (isPeak) winterPeak += record.usage;
      else winterOffPeak += record.usage;
    } else {
      summerUsage += record.usage;
      summerDays.add(record.date);
      if (isPeak) summerPeak += record.usage;
      else summerOffPeak += record.usage;
    }
  }

  const winterDayCount = winterDays.size || 1;
  const summerDayCount = summerDays.size || 1;

  const winterAvg = winterUsage / winterDayCount;
  const summerAvg = summerUsage / summerDayCount;

  const winterPeakPct = (winterPeak / winterUsage) * 100 || 0;
  const summerPeakPct = (summerPeak / summerUsage) * 100 || 0;

  if (winterDays.size === 0 || summerDays.size === 0) {
    return (
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
        <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Winter vs Summer</h2>
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Need data from both seasons to compare. Upload a full year of data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Winter vs Summer</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">How your usage changes by season</p>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Winter */}
        <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">❄️</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">Winter</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Avg/day</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">{winterAvg.toFixed(1)} kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Peak usage</span>
              <span className="text-stone-700 dark:text-stone-300">{winterPeakPct.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Days tracked</span>
              <span className="text-stone-700 dark:text-stone-300">{winterDays.size}</span>
            </div>
          </div>
        </div>

        {/* Summer */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">☀️</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">Summer</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Avg/day</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">{summerAvg.toFixed(1)} kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Peak usage</span>
              <span className="text-stone-700 dark:text-stone-300">{summerPeakPct.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 dark:text-stone-400">Days tracked</span>
              <span className="text-stone-700 dark:text-stone-300">{summerDays.size}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-center text-stone-500 dark:text-stone-400">
        {winterAvg > summerAvg 
          ? `Winter usage is ${((winterAvg - summerAvg) / summerAvg * 100).toFixed(0)}% higher than summer`
          : `Summer usage is ${((summerAvg - winterAvg) / winterAvg * 100).toFixed(0)}% higher than winter`
        }
      </p>
    </div>
  );
}
