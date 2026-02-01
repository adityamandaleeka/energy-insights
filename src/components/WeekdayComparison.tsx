import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WeekdayComparisonProps {
  records: { date: string; usage: number }[];
}

export function WeekdayComparison({ records }: WeekdayComparisonProps) {
  // Calculate average daily usage by day of week
  const dayStats = new Map<number, { total: number; count: number }>();
  
  for (const record of records) {
    const [year, month, day] = record.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    if (!dayStats.has(dayOfWeek)) {
      dayStats.set(dayOfWeek, { total: 0, count: 0 });
    }
    const stats = dayStats.get(dayOfWeek)!;
    stats.total += record.usage;
  }

  // Count unique days per day-of-week
  const uniqueDays = new Map<number, Set<string>>();
  for (const record of records) {
    const [year, month, day] = record.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    if (!uniqueDays.has(dayOfWeek)) {
      uniqueDays.set(dayOfWeek, new Set());
    }
    uniqueDays.get(dayOfWeek)!.add(record.date);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const data = dayNames.map((name, i) => {
    const stats = dayStats.get(i);
    const dayCount = uniqueDays.get(i)?.size || 1;
    return {
      day: name,
      avgUsage: stats ? stats.total / dayCount : 0,
      isWeekend: i === 0 || i === 6,
    };
  });

  const weekdayAvg = data.filter(d => !d.isWeekend).reduce((sum, d) => sum + d.avgUsage, 0) / 5;
  const weekendAvg = data.filter(d => d.isWeekend).reduce((sum, d) => sum + d.avgUsage, 0) / 2;
  const diff = ((weekendAvg - weekdayAvg) / weekdayAvg * 100).toFixed(0);

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Usage by Day of Week</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Average daily usage patterns</p>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#a8a29e" />
            <YAxis tick={{ fontSize: 11 }} stroke="#a8a29e" unit=" kWh" width={50} />
            <Tooltip 
              formatter={(value) => [`${Number(value).toFixed(1)} kWh`, 'Avg Usage']}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="avgUsage" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isWeekend ? '#14b8a6' : '#6366f1'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-indigo-500"></div>
          <span className="text-stone-600 dark:text-stone-400">Weekday: {weekdayAvg.toFixed(1)} kWh/day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-teal-500"></div>
          <span className="text-stone-600 dark:text-stone-400">Weekend: {weekendAvg.toFixed(1)} kWh/day</span>
        </div>
      </div>
      
      <p className="mt-3 text-xs text-center text-stone-500 dark:text-stone-400">
        {Number(diff) > 0 
          ? `Weekend usage is ${diff}% higher than weekdays`
          : Number(diff) < 0
          ? `Weekend usage is ${Math.abs(Number(diff))}% lower than weekdays`
          : 'Weekend and weekday usage are about the same'
        }
      </p>
    </div>
  );
}
