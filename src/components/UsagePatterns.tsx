interface UsagePatternsProps {
  records: { date: string; startTime: string; usage: number }[];
}

interface Pattern {
  type: 'baseline' | 'recurring' | 'spike' | 'night-owl';
  title: string;
  description: string;
  icon: string;
  value?: string;
}

export function UsagePatterns({ records }: UsagePatternsProps) {
  if (records.length === 0) return null;

  const patterns: Pattern[] = [];

  // 1. Calculate baseline (always-on load) - 5th percentile
  const sortedUsage = [...records].sort((a, b) => a.usage - b.usage);
  const p5Index = Math.floor(sortedUsage.length * 0.05);
  const baseline = sortedUsage[p5Index]?.usage || 0;
  const baselineMonthly = baseline * 4 * 24 * 30; // per 15-min interval → monthly
  
  if (baseline > 0.01) {
    patterns.push({
      type: 'baseline',
      title: 'Always-on load',
      description: `Your home uses at least ${(baseline * 4).toFixed(2)} kWh/hour continuously. This is your fridge, router, standby devices, etc.`,
      icon: '🔌',
      value: `~${baselineMonthly.toFixed(0)} kWh/mo`,
    });
  }

  // 2. Find hourly averages to detect patterns
  const hourlyStats = new Map<number, { total: number; count: number; values: number[] }>();
  for (const record of records) {
    const hour = parseInt(record.startTime.split(':')[0], 10);
    if (!hourlyStats.has(hour)) {
      hourlyStats.set(hour, { total: 0, count: 0, values: [] });
    }
    const stats = hourlyStats.get(hour)!;
    stats.total += record.usage;
    stats.count += 1;
    stats.values.push(record.usage);
  }

  const hourlyAvg = new Map<number, number>();
  hourlyStats.forEach((stats, hour) => {
    hourlyAvg.set(hour, stats.total / stats.count);
  });

  // Find peak usage hours
  const sortedHours = Array.from(hourlyAvg.entries()).sort((a, b) => b[1] - a[1]);
  const peakHour = sortedHours[0];
  const lowestHour = sortedHours[sortedHours.length - 1];
  
  if (peakHour && lowestHour) {
    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'pm' : 'am';
      const hour12 = h % 12 || 12;
      return `${hour12}${ampm}`;
    };
    
    const ratio = peakHour[1] / (lowestHour[1] || 0.01);
    if (ratio > 3) {
      patterns.push({
        type: 'recurring',
        title: 'Peak usage time',
        description: `Your highest usage is at ${formatHour(peakHour[0])} (${ratio.toFixed(1)}x your lowest hour at ${formatHour(lowestHour[0])})`,
        icon: '📈',
        value: formatHour(peakHour[0]),
      });
    }
  }

  // 3. Check for overnight activity (11pm-5am)
  const nightHours = [23, 0, 1, 2, 3, 4];
  const dayHours = [10, 11, 12, 13, 14, 15];
  const nightAvg = nightHours.reduce((sum, h) => sum + (hourlyAvg.get(h) || 0), 0) / nightHours.length;
  const dayAvg = dayHours.reduce((sum, h) => sum + (hourlyAvg.get(h) || 0), 0) / dayHours.length;
  
  if (nightAvg > dayAvg * 1.5 && nightAvg > baseline * 2) {
    patterns.push({
      type: 'night-owl',
      title: 'Significant overnight usage',
      description: 'Your overnight usage (11pm-5am) is higher than midday. This could be EV charging, water heater, or HVAC.',
      icon: '🌙',
      value: `${(nightAvg * 4).toFixed(2)} kWh/hr`,
    });
  }

  // 4. Find unusual spikes - use 95th percentile as threshold instead of hourly avg
  const p95Index = Math.floor(sortedUsage.length * 0.95);
  const p95 = sortedUsage[p95Index]?.usage || 0;
  const spikeThreshold = Math.max(p95 * 1.5, 1.0); // 1.5x the 95th percentile, min 1 kWh
  
  // Group spikes by day to avoid counting every interval
  const spikeDays = new Map<string, { maxUsage: number; time: string; count: number }>();
  for (const record of records) {
    if (record.usage > spikeThreshold) {
      const existing = spikeDays.get(record.date);
      if (!existing || record.usage > existing.maxUsage) {
        spikeDays.set(record.date, {
          maxUsage: record.usage,
          time: record.startTime,
          count: (existing?.count || 0) + 1,
        });
      } else {
        existing.count += 1;
      }
    }
  }

  const spikeDaysList = Array.from(spikeDays.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => b.maxUsage - a.maxUsage);

  if (spikeDaysList.length > 0 && spikeDaysList.length <= 20) {
    const topSpike = spikeDaysList[0];
    const spikeDate = new Date(topSpike.date.replace(/-/g, '/'));
    const formatted = spikeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    patterns.push({
      type: 'spike',
      title: 'Unusual spike detected',
      description: `Highest spike: ${topSpike.maxUsage.toFixed(2)} kWh at ${topSpike.time} on ${formatted}. Found ${spikeDaysList.length} days with unusual spikes.`,
      icon: '⚡',
      value: `${spikeDaysList.length} days`,
    });
  }

  // 5. Check for consistent patterns (low variance at certain hours = scheduled device)
  const consistentHours: number[] = [];
  hourlyStats.forEach((stats, hour) => {
    if (stats.values.length > 10) {
      const avg = stats.total / stats.count;
      const variance = stats.values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / stats.values.length;
      const cv = Math.sqrt(variance) / avg; // coefficient of variation
      if (cv < 0.3 && avg > baseline * 1.5) {
        consistentHours.push(hour);
      }
    }
  });

  if (consistentHours.length > 0) {
    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'pm' : 'am';
      const hour12 = h % 12 || 12;
      return `${hour12}${ampm}`;
    };
    patterns.push({
      type: 'recurring',
      title: 'Scheduled device detected',
      description: `Very consistent usage at ${consistentHours.slice(0, 3).map(formatHour).join(', ')}. Likely a device on a timer or regular schedule.`,
      icon: '⏰',
    });
  }

  if (patterns.length === 0) {
    patterns.push({
      type: 'baseline',
      title: 'No unusual patterns',
      description: 'Your usage looks fairly typical with no standout patterns detected.',
      icon: '✓',
    });
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Usage Patterns</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Detected patterns in your electricity usage</p>
      
      <div className="space-y-4">
        {patterns.map((pattern, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-xl">{pattern.icon}</span>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{pattern.title}</p>
                {pattern.value && (
                  <span className="text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded">
                    {pattern.value}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{pattern.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
