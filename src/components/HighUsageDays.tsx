interface HighUsageDaysProps {
  records: { date: string; usage: number }[];
}

export function HighUsageDays({ records }: HighUsageDaysProps) {
  // Aggregate usage by day
  const dailyUsage = new Map<string, number>();
  
  for (const record of records) {
    const current = dailyUsage.get(record.date) || 0;
    dailyUsage.set(record.date, current + record.usage);
  }

  const days = Array.from(dailyUsage.entries())
    .map(([date, usage]) => ({ date, usage }))
    .sort((a, b) => b.usage - a.usage);

  const topDays = days.slice(0, 5);
  const avgUsage = days.reduce((sum, d) => sum + d.usage, 0) / days.length;

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Highest Usage Days</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Days with unusually high electricity use</p>
      
      <div className="space-y-3">
        {topDays.map((day) => {
          const percentAboveAvg = ((day.usage - avgUsage) / avgUsage * 100).toFixed(0);
          const barWidth = (day.usage / topDays[0].usage) * 100;
          
          return (
            <div key={day.date}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-600 dark:text-stone-300">{formatDate(day.date)}</span>
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
