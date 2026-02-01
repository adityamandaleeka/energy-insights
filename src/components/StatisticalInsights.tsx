import { XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, ScatterChart, Scatter, CartesianGrid } from 'recharts';
import type { DailyWeather } from '../utils/weather';

interface StatisticalInsightsProps {
  records: { date: string; usage: number }[];
  weather?: DailyWeather[];
}

interface DailyTotal {
  date: string;
  usage: number;
  dayIndex: number;
}

interface Anomaly {
  date: string;
  usage: number;
  z: number;
}

export function StatisticalInsights({ records, weather }: StatisticalInsightsProps) {
  if (records.length < 100) return null; // Need enough data

  // Aggregate to daily totals
  const dailyMap = new Map<string, number>();
  for (const record of records) {
    dailyMap.set(record.date, (dailyMap.get(record.date) || 0) + record.usage);
  }
  
  const dailyTotals: DailyTotal[] = Array.from(dailyMap.entries())
    .map(([date, usage], i) => ({ date, usage, dayIndex: i }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (dailyTotals.length < 14) return null; // Need at least 2 weeks

  // 1. Calculate basic stats
  const usages = dailyTotals.map(d => d.usage);
  const mean = usages.reduce((a, b) => a + b, 0) / usages.length;
  const variance = usages.reduce((sum, u) => sum + Math.pow(u - mean, 2), 0) / usages.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100; // Coefficient of variation

  // 2. Linear regression for trend
  const n = dailyTotals.length;
  const sumX = dailyTotals.reduce((sum, d) => sum + d.dayIndex, 0);
  const sumY = usages.reduce((a, b) => a + b, 0);
  const sumXY = dailyTotals.reduce((sum, d) => sum + d.dayIndex * d.usage, 0);
  const sumX2 = dailyTotals.reduce((sum, d) => sum + d.dayIndex * d.dayIndex, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const monthlyTrend = slope * 30; // kWh change per month

  // 3. Z-score anomalies (|z| > 2.5) - with z-score included
  const anomalies: Anomaly[] = dailyTotals
    .map(d => ({ date: d.date, usage: d.usage, z: (d.usage - mean) / stdDev }))
    .filter(d => Math.abs(d.z) > 2.5)
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z)); // Sort by most extreme first

  // 4. Sorted usages for percentile calculations
  const sorted = [...usages].sort((a, b) => a - b);

  // 5. Weekly pattern strength (how different are days of week from each other?)
  const byDayOfWeek: number[][] = [[], [], [], [], [], [], []];
  for (const d of dailyTotals) {
    const [year, month, day] = d.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    byDayOfWeek[date.getDay()].push(d.usage);
  }
  
  const dowMeans = byDayOfWeek.map(arr => 
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : mean
  );
  const dowVariance = dowMeans.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / 7;
  const weeklyPatternStrength = Math.sqrt(dowVariance) / mean * 100;

  // 6. Median vs Mean (skewness indicator)
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
  const skewDirection = mean > median ? 'right' : mean < median ? 'left' : 'symmetric';

  // 7. Baseload analysis - estimate always-on load from lowest days
  const p10 = sorted[Math.floor(sorted.length * 0.10)];
  const p5 = sorted[Math.floor(sorted.length * 0.05)];
  const baseload = (p5 + p10) / 2; // Average of 5th and 10th percentile as baseload estimate
  const baseloadPercent = (baseload / mean) * 100;

  // 8. Peak-to-base ratio
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const peakToBase = p95 / Math.max(p5, 0.1); // Avoid division by zero

  // 9. Autocorrelation (lag-1) - does today predict tomorrow?
  let sumXY_ac = 0, sumX_ac = 0, sumY_ac = 0, sumX2_ac = 0, sumY2_ac = 0;
  for (let i = 0; i < usages.length - 1; i++) {
    const x = usages[i];
    const y = usages[i + 1];
    sumXY_ac += x * y;
    sumX_ac += x;
    sumY_ac += y;
    sumX2_ac += x * x;
    sumY2_ac += y * y;
  }
  const n_ac = usages.length - 1;
  const autocorr = (n_ac * sumXY_ac - sumX_ac * sumY_ac) / 
    (Math.sqrt(n_ac * sumX2_ac - sumX_ac * sumX_ac) * Math.sqrt(n_ac * sumY2_ac - sumY_ac * sumY_ac));

  // 10. Temperature sensitivity - compare winter vs summer
  const winterDays = dailyTotals.filter(d => {
    const month = parseInt(d.date.split('-')[1]);
    return month >= 10 || month <= 3; // Oct-Mar
  });
  const summerDays = dailyTotals.filter(d => {
    const month = parseInt(d.date.split('-')[1]);
    return month >= 4 && month <= 9; // Apr-Sep
  });
  const winterAvg = winterDays.length > 0 
    ? winterDays.reduce((sum, d) => sum + d.usage, 0) / winterDays.length 
    : mean;
  const summerAvg = summerDays.length > 0 
    ? summerDays.reduce((sum, d) => sum + d.usage, 0) / summerDays.length 
    : mean;
  const seasonalRatio = Math.max(winterAvg, summerAvg) / Math.min(winterAvg, summerAvg);
  const heatingDominant = winterAvg > summerAvg;

  // 11. Seasonal box plot stats
  const getBoxStats = (days: DailyTotal[]) => {
    if (days.length < 5) return null;
    const vals = days.map(d => d.usage).sort((a, b) => a - b);
    return {
      min: vals[0],
      p25: vals[Math.floor(vals.length * 0.25)],
      median: vals[Math.floor(vals.length * 0.5)],
      p75: vals[Math.floor(vals.length * 0.75)],
      max: vals[vals.length - 1],
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
    };
  };
  const winterStats = getBoxStats(winterDays);
  const summerStats = getBoxStats(summerDays);
  const allSeasonMax = Math.max(
    winterStats?.max ?? 0, 
    summerStats?.max ?? 0
  );
  const allSeasonMin = Math.min(
    winterStats?.min ?? Infinity, 
    summerStats?.min ?? Infinity
  );

  // 12. Weather correlation analysis (needed for change point detection)
  const weatherCorrelation = (() => {
    if (!weather || weather.length < 30) return null;
    
    // Match daily usage to weather data
    const weatherMap = new Map(weather.map(w => [w.date, w]));
    const paired: { temp: number; usage: number; date: string }[] = [];
    
    for (const d of dailyTotals) {
      const w = weatherMap.get(d.date);
      if (w && w.tempMean != null) {
        paired.push({ temp: w.tempMean, usage: d.usage, date: d.date });
      }
    }
    
    if (paired.length < 30) return null;
    
    // Calculate correlation coefficient
    const n = paired.length;
    const sumX = paired.reduce((s, p) => s + p.temp, 0);
    const sumY = paired.reduce((s, p) => s + p.usage, 0);
    const sumXY = paired.reduce((s, p) => s + p.temp * p.usage, 0);
    const sumX2 = paired.reduce((s, p) => s + p.temp * p.temp, 0);
    const sumY2 = paired.reduce((s, p) => s + p.usage * p.usage, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r = denominator !== 0 ? numerator / denominator : 0;
    
    // Linear regression for sensitivity
    const slope = numerator / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Find base temp (where usage is minimal) - approximate
    const sorted = [...paired].sort((a, b) => a.usage - b.usage);
    const minUsageDays = sorted.slice(0, Math.floor(n * 0.1));
    const baseTemp = minUsageDays.reduce((s, p) => s + p.temp, 0) / minUsageDays.length;
    
    // Calculate heating/cooling sensitivity (kWh per degree from base)
    const coldDays = paired.filter(p => p.temp < baseTemp - 5);
    const hotDays = paired.filter(p => p.temp > baseTemp + 5);
    
    const heatingSlope = coldDays.length > 10 ? (() => {
      const cN = coldDays.length;
      const cSumX = coldDays.reduce((s, p) => s + p.temp, 0);
      const cSumY = coldDays.reduce((s, p) => s + p.usage, 0);
      const cSumXY = coldDays.reduce((s, p) => s + p.temp * p.usage, 0);
      const cSumX2 = coldDays.reduce((s, p) => s + p.temp * p.temp, 0);
      return (cN * cSumXY - cSumX * cSumY) / (cN * cSumX2 - cSumX * cSumX);
    })() : null;
    
    const coolingSlope = hotDays.length > 10 ? (() => {
      const hN = hotDays.length;
      const hSumX = hotDays.reduce((s, p) => s + p.temp, 0);
      const hSumY = hotDays.reduce((s, p) => s + p.usage, 0);
      const hSumXY = hotDays.reduce((s, p) => s + p.temp * p.usage, 0);
      const hSumX2 = hotDays.reduce((s, p) => s + p.temp * p.temp, 0);
      return (hN * hSumXY - hSumX * hSumY) / (hN * hSumX2 - hSumX * hSumX);
    })() : null;
    
    return {
      r,
      slope,
      intercept,
      baseTemp,
      heatingSlope,
      coolingSlope,
      data: paired,
      hasHeating: heatingSlope !== null && heatingSlope < -0.1,
      hasCooling: coolingSlope !== null && coolingSlope > 0.1,
    };
  })();

  // 13. Change point detection - find sustained shifts in usage
  // Uses weather data to calculate temperature-adjusted usage when available
  interface ChangePoint {
    date: string;
    beforeAvg: number;
    afterAvg: number;
    changePercent: number;
    direction: 'up' | 'down';
  }
  
  const detectChangePoints = (): ChangePoint[] => {
    if (dailyTotals.length < 90) return []; // Need at least 3 months
    
    // Create weather lookup if available
    const weatherMap = new Map(weather?.map(w => [w.date, w]) || []);
    const hasWeather = weather && weather.length > 30;
    
    // If we have weather, calculate temperature-adjusted usage
    // This removes the effect of temperature so we can see true baseline shifts
    let adjustedDailyTotals = dailyTotals;
    
    if (hasWeather && weatherCorrelation && Math.abs(weatherCorrelation.r) > 0.3) {
      // Use the regression to calculate expected usage for each day's temp
      // Then compute residual (actual - expected) + mean
      // This normalizes all days to what usage would be at average temp
      adjustedDailyTotals = dailyTotals.map(d => {
        const w = weatherMap.get(d.date);
        if (w && w.tempMean != null) {
          const expectedUsage = weatherCorrelation.intercept + weatherCorrelation.slope * w.tempMean;
          const residual = d.usage - expectedUsage;
          return { ...d, usage: mean + residual }; // Normalized usage
        }
        return d;
      });
    }
    
    // Group by month
    const monthlyData: Map<string, { usages: number[], firstDate: string, temps: number[] }> = new Map();
    for (let i = 0; i < adjustedDailyTotals.length; i++) {
      const d = adjustedDailyTotals[i];
      const monthKey = d.date.substring(0, 7); // "YYYY-MM"
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { usages: [], firstDate: d.date, temps: [] });
      }
      const m = monthlyData.get(monthKey)!;
      m.usages.push(d.usage);
      const w = weatherMap.get(d.date);
      if (w) m.temps.push(w.tempMean);
    }
    
    // Calculate monthly averages
    const months = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        avg: data.usages.reduce((a, b) => a + b, 0) / data.usages.length,
        avgTemp: data.temps.length > 0 ? data.temps.reduce((a, b) => a + b, 0) / data.temps.length : null,
        count: data.usages.length,
        firstDate: data.firstDate,
        isWinter: (() => {
          const m = parseInt(month.split('-')[1]);
          return m >= 10 || m <= 3;
        })(),
      }))
      .filter(m => m.count >= 14)
      .sort((a, b) => a.month.localeCompare(b.month));
    
    if (months.length < 4) return [];
    
    const changes: ChangePoint[] = [];
    const minChangePercent = hasWeather ? 20 : 25; // Lower threshold if we have weather-adjusted data
    
    // Look for changes that persist
    for (let i = 2; i < months.length - 1; i++) {
      const prev = months[i - 1];
      const curr = months[i];
      const next = months[i + 1];
      const twoBack = months[i - 2];
      
      // If no weather data, skip season boundaries
      if (!hasWeather && prev.isWinter !== curr.isWinter) continue;
      
      const changePrevToCurr = ((curr.avg - prev.avg) / prev.avg) * 100;
      
      // Check if this is a real shift:
      // 1. Significant change from previous month
      // 2. Persists into next month (next similar to curr)
      // 3. Different from the pattern 2 months ago (not oscillation)
      if (Math.abs(changePrevToCurr) >= minChangePercent) {
        const nextSimilarToCurr = Math.abs((next.avg - curr.avg) / curr.avg) * 100 < 15;
        const notOscillation = Math.abs((curr.avg - twoBack.avg) / twoBack.avg) * 100 >= minChangePercent * 0.5;
        
        if (nextSimilarToCurr && notOscillation) {
          changes.push({
            date: curr.firstDate,
            beforeAvg: prev.avg,
            afterAvg: curr.avg,
            changePercent: Math.abs(changePrevToCurr),
            direction: changePrevToCurr > 0 ? 'up' : 'down',
          });
        }
      }
    }
    
    return changes.slice(0, 2);
  };
  
  const changePoints = detectChangePoints();

  // Nerd box wrapper component
  const NerdBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-stone-900 border-2 border-violet-200 dark:border-violet-800 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">🤓</span>
        <h3 className="text-sm font-medium text-violet-700 dark:text-violet-300">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🤓</span>
        <div>
          <h2 className="text-sm font-medium text-violet-700 dark:text-violet-300">Advanced Statistics</h2>
          <p className="text-xs text-stone-400 dark:text-stone-500">{dailyTotals.length} days of data analyzed</p>
        </div>
      </div>

      {/* Summary Stats */}
      <NerdBox title="Summary Statistics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-stone-50 dark:bg-stone-800 rounded">
            <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">{mean.toFixed(1)}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Avg kWh/day</p>
          </div>
          <div className="text-center p-3 bg-stone-50 dark:bg-stone-800 rounded">
            <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">{median.toFixed(1)}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Median kWh/day</p>
          </div>
          <div className="text-center p-3 bg-stone-50 dark:bg-stone-800 rounded">
            <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">{stdDev.toFixed(1)}</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Std deviation</p>
          </div>
          <div className="text-center p-3 bg-stone-50 dark:bg-stone-800 rounded">
            <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">{cv.toFixed(0)}%</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">Variability (CV)</p>
          </div>
        </div>
      </NerdBox>

      {/* Patterns & Trends */}
      <NerdBox title="Patterns & Trends">
        <div className="space-y-3 text-sm">
        {/* Trend */}
        <div className="flex items-start gap-3">
          <span className="text-lg">{monthlyTrend > 0.5 ? '📈' : monthlyTrend < -0.5 ? '📉' : '➡️'}</span>
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">
              {monthlyTrend > 0.5 
                ? 'Usage trending up' 
                : monthlyTrend < -0.5 
                ? 'Usage trending down' 
                : 'Usage is stable'}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {Math.abs(monthlyTrend) > 0.5 
                ? `${monthlyTrend > 0 ? '+' : ''}${monthlyTrend.toFixed(1)} kWh/day per month`
                : 'No significant trend detected'}
            </p>
          </div>
        </div>

        {/* Variability interpretation */}
        <div className="flex items-start gap-3">
          <span className="text-lg">{cv < 20 ? '🎯' : cv < 40 ? '📊' : '🎢'}</span>
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">
              {cv < 20 ? 'Very consistent usage' : cv < 40 ? 'Moderate variability' : 'High variability'}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {cv < 20 
                ? 'Your daily usage is predictable - good for TOU planning'
                : cv < 40
                ? 'Some day-to-day variation in your usage patterns'
                : 'Your usage varies a lot - harder to predict bills'}
            </p>
          </div>
        </div>

        {/* Weekly pattern */}
        <div className="flex items-start gap-3">
          <span className="text-lg">{weeklyPatternStrength > 10 ? '📅' : '🔄'}</span>
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">
              {weeklyPatternStrength > 10 ? 'Strong weekly pattern' : 'Weak weekly pattern'}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {weeklyPatternStrength > 10 
                ? 'Your usage differs significantly by day of week'
                : 'Usage is similar across all days of the week'}
            </p>
          </div>
        </div>

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="flex items-start gap-3">
            <span className="text-lg">🔍</span>
            <div className="flex-1">
              <p className="font-medium text-stone-900 dark:text-stone-100">
                {anomalies.length} statistical anomal{anomalies.length === 1 ? 'y' : 'ies'}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                Days with usage more than 2.5 standard deviations from the mean
              </p>
              <div className="flex flex-wrap gap-2">
                {anomalies.slice(0, 6).map(a => {
                  const [year, month, day] = a.date.split('-').map(Number);
                  const dateObj = new Date(year, month - 1, day);
                  const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const isHigh = a.z > 0;
                  return (
                    <span 
                      key={a.date}
                      className={`text-xs px-2 py-1 rounded ${
                        isHigh 
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' 
                          : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                      }`}
                    >
                      {formatted}: {a.usage.toFixed(1)} kWh ({isHigh ? '+' : ''}{a.z.toFixed(1)}σ)
                    </span>
                  );
                })}
                {anomalies.length > 6 && (
                  <span className="text-xs text-stone-400">+{anomalies.length - 6} more</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Skewness */}
        {skewDirection !== 'symmetric' && Math.abs(mean - median) > 1 && (
          <div className="flex items-start gap-3">
            <span className="text-lg">{skewDirection === 'right' ? '⚖️' : '⚖️'}</span>
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">
                {skewDirection === 'right' ? 'Occasional high usage days' : 'Occasional low usage days'}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {skewDirection === 'right' 
                  ? 'A few high-usage days pull your average up'
                  : 'A few low-usage days (away?) pull your average down'}
              </p>
            </div>
          </div>
        )}

        {/* Change point detection */}
        {changePoints.length > 0 && (
          <div className="flex items-start gap-3">
            <span className="text-lg">📈</span>
            <div className="flex-1">
              <p className="font-medium text-stone-900 dark:text-stone-100">
                Usage shift{changePoints.length > 1 ? 's' : ''} detected
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                Permanent changes in your baseline usage (≥25% shift sustained for 2+ months, not seasonal)
              </p>
              <div className="space-y-2">
                {changePoints.map((cp, i) => {
                  const [year, month, day] = cp.date.split('-').map(Number);
                  const dateObj = new Date(year, month - 1, day);
                  const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                  return (
                    <div 
                      key={i}
                      className={`text-xs px-3 py-2 rounded ${
                        cp.direction === 'up' 
                          ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' 
                          : 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
                      }`}
                    >
                      <span className="font-medium text-stone-700 dark:text-stone-200">Starting {formatted}:</span>{' '}
                      <span className={cp.direction === 'up' ? 'text-orange-700 dark:text-orange-300' : 'text-teal-700 dark:text-teal-300'}>
                        {cp.direction === 'up' ? '↑' : '↓'} {cp.changePercent.toFixed(0)}% 
                      </span>
                      <span className="text-stone-500 dark:text-stone-400">
                        {' '}({cp.beforeAvg.toFixed(1)} → {cp.afterAvg.toFixed(1)} kWh/day avg)
                      </span>
                      <p className="text-stone-400 dark:text-stone-500 mt-0.5">
                        {cp.direction === 'up' 
                          ? 'Possible causes: new appliance, EV, more people home, behavior change' 
                          : 'Possible causes: efficiency upgrade, appliance removed, fewer occupants'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        </div>
      </NerdBox>

      {/* Load Analysis */}
      <NerdBox title="Load Analysis">
        <div className="space-y-3 text-sm">
        {/* Baseload analysis */}
        <div className="flex items-start gap-3">
          <span className="text-lg">🔌</span>
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">
              ~{baseload.toFixed(1)} kWh/day baseload
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Always-on load (fridge, standby devices, etc) is ~{baseloadPercent.toFixed(0)}% of your average usage
            </p>
          </div>
        </div>

        {/* Peak-to-base ratio */}
        <div className="flex items-start gap-3">
          <span className="text-lg">{peakToBase > 3 ? '⚡' : '📊'}</span>
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">
              {peakToBase.toFixed(1)}x peak-to-base ratio
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {peakToBase > 3 
                ? 'High spikes vs baseline - big discretionary loads (HVAC, EV, appliances)'
                : peakToBase > 2
                ? 'Moderate variation - some flexibility in when you use power'
                : 'Low variation - usage is fairly consistent day-to-day'}
            </p>
          </div>
        </div>

        {/* Autocorrelation / Predictability */}
        <div className="flex items-start gap-3">
          <span className="text-lg">{autocorr > 0.5 ? '🎯' : autocorr > 0.2 ? '📈' : '🎲'}</span>
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">
              {autocorr > 0.5 
                ? 'Highly predictable patterns' 
                : autocorr > 0.2 
                ? 'Moderately predictable' 
                : 'Low day-to-day predictability'}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {autocorr > 0.5 
                ? `Today's usage strongly predicts tomorrow's (r=${autocorr.toFixed(2)}) - TOU savings estimates are reliable`
                : autocorr > 0.2
                ? `Some correlation between consecutive days (r=${autocorr.toFixed(2)})`
                : `Usage varies independently day-to-day (r=${autocorr.toFixed(2)}) - actual savings may differ from projections`}
            </p>
          </div>
        </div>

        {/* Temperature sensitivity */}
        {winterDays.length > 7 && summerDays.length > 7 && (
          <div className="flex items-start gap-3">
            <span className="text-lg">{heatingDominant ? '🔥' : '❄️'}</span>
            <div>
              <p className="font-medium text-stone-900 dark:text-stone-100">
                {seasonalRatio > 1.3 
                  ? `${heatingDominant ? 'Heating' : 'Cooling'}-dominated usage`
                  : 'Low seasonal sensitivity'}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {seasonalRatio > 1.3
                  ? `${heatingDominant ? 'Winter' : 'Summer'} avg ${Math.max(winterAvg, summerAvg).toFixed(1)} kWh/day vs ${Math.min(winterAvg, summerAvg).toFixed(1)} other season (${seasonalRatio.toFixed(1)}x) - HVAC is a major driver`
                  : 'Usage is similar across seasons - HVAC isn\'t your main load'}
              </p>
            </div>
          </div>
        )}
        </div>
      </NerdBox>

      {/* Distribution & Charts */}
      <NerdBox title="Usage Distribution">
        {/* Load Duration Curve */}
        <div className="mb-6">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Load Duration Curve</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
              Days sorted from highest to lowest usage - read: "I exceed X kWh on Y% of days"
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={[...usages].sort((a, b) => b - a).map((usage, i) => ({
                    percent: Math.round((i / usages.length) * 100),
                    usage,
                  }))}
                  margin={{ top: 5, right: 10, left: 10, bottom: 20 }}
                >
                  <XAxis 
                    dataKey="percent" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    label={{ value: '% of days exceeded', position: 'bottom', offset: 0, fontSize: 11, fill: '#78716c' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    label={{ value: 'kWh/day', angle: -90, position: 'insideLeft', offset: 5, fontSize: 11, fill: '#78716c' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(1)} kWh/day`, 'Usage']}
                    labelFormatter={(v) => `Exceeded on ${v}% of days`}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '12px' }}
                  />
                  <ReferenceLine y={mean} stroke="#f97316" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="usage" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Seasonal Box Plot Comparison (vertical) */}
          {winterStats && summerStats && (
            <div className="mb-4">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Seasonal Comparison</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                Winter (Oct-Mar) vs Summer (Apr-Sep) usage distribution
              </p>
              <div className="flex justify-center gap-12">
                {/* Winter box plot */}
                <div className="flex flex-col items-center">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">❄️ Winter</p>
                  <div className="relative w-12 h-48">
                    {/* Y-axis scale line */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-px h-full bg-stone-200 dark:bg-stone-700"></div>
                    
                    {/* Whisker line (min to max) */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 w-px bg-blue-400 dark:bg-blue-500"
                      style={{
                        bottom: `${((winterStats.min - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%`,
                        height: `${((winterStats.max - winterStats.min) / (allSeasonMax - allSeasonMin)) * 100}%`,
                      }}
                    ></div>
                    
                    {/* Min cap */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 h-px w-4 bg-blue-400 dark:bg-blue-500"
                      style={{ bottom: `${((winterStats.min - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%` }}
                    ></div>
                    
                    {/* Max cap */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 h-px w-4 bg-blue-400 dark:bg-blue-500"
                      style={{ bottom: `${((winterStats.max - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%` }}
                    ></div>
                    
                    {/* IQR Box */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 w-8 bg-blue-100 dark:bg-blue-900/50 border border-blue-400 dark:border-blue-600 rounded"
                      style={{
                        bottom: `${((winterStats.p25 - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%`,
                        height: `${((winterStats.p75 - winterStats.p25) / (allSeasonMax - allSeasonMin)) * 100}%`,
                      }}
                    ></div>
                    
                    {/* Median line */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 h-0.5 w-8 bg-blue-600 dark:bg-blue-400"
                      style={{ bottom: `${((winterStats.median - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%` }}
                    ></div>
                    
                    {/* Mean dot */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full"
                      style={{ bottom: `${((winterStats.mean - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%`, transform: 'translate(-50%, 50%)' }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-stone-500 dark:text-stone-400 text-center">
                    <p>Med: <span className="font-medium">{winterStats.median.toFixed(1)}</span></p>
                    <p className="text-[10px]">{winterStats.min.toFixed(0)}-{winterStats.max.toFixed(0)} kWh</p>
                  </div>
                </div>

                {/* Y-axis labels */}
                <div className="flex flex-col justify-between h-48 text-xs text-stone-400 dark:text-stone-500">
                  <span>{allSeasonMax.toFixed(0)}</span>
                  <span>{((allSeasonMax + allSeasonMin) / 2).toFixed(0)}</span>
                  <span>{allSeasonMin.toFixed(0)}</span>
                </div>

                {/* Summer box plot */}
                <div className="flex flex-col items-center">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">☀️ Summer</p>
                  <div className="relative w-12 h-48">
                    {/* Y-axis scale line */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-px h-full bg-stone-200 dark:bg-stone-700"></div>
                    
                    {/* Whisker line (min to max) */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 w-px bg-amber-400 dark:bg-amber-500"
                      style={{
                        bottom: `${((summerStats.min - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%`,
                        height: `${((summerStats.max - summerStats.min) / (allSeasonMax - allSeasonMin)) * 100}%`,
                      }}
                    ></div>
                    
                    {/* Min cap */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 h-px w-4 bg-amber-400 dark:bg-amber-500"
                      style={{ bottom: `${((summerStats.min - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%` }}
                    ></div>
                    
                    {/* Max cap */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 h-px w-4 bg-amber-400 dark:bg-amber-500"
                      style={{ bottom: `${((summerStats.max - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%` }}
                    ></div>
                    
                    {/* IQR Box */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 w-8 bg-amber-100 dark:bg-amber-900/50 border border-amber-400 dark:border-amber-600 rounded"
                      style={{
                        bottom: `${((summerStats.p25 - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%`,
                        height: `${((summerStats.p75 - summerStats.p25) / (allSeasonMax - allSeasonMin)) * 100}%`,
                      }}
                    ></div>
                    
                    {/* Median line */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 h-0.5 w-8 bg-amber-600 dark:bg-amber-400"
                      style={{ bottom: `${((summerStats.median - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%` }}
                    ></div>
                    
                    {/* Mean dot */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full"
                      style={{ bottom: `${((summerStats.mean - allSeasonMin) / (allSeasonMax - allSeasonMin)) * 100}%`, transform: 'translate(-50%, 50%)' }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-stone-500 dark:text-stone-400 text-center">
                    <p>Med: <span className="font-medium">{summerStats.median.toFixed(1)}</span></p>
                    <p className="text-[10px]">{summerStats.min.toFixed(0)}-{summerStats.max.toFixed(0)} kWh</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-4 text-xs text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <span className="w-4 h-0.5 bg-stone-600"></span> Median
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span> Mean
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 border border-stone-400 rounded-sm"></span> 25th-75th
                </span>
              </div>
            </div>
          )}
      </NerdBox>

      {/* Weather Correlation */}
      {weatherCorrelation && (
        <NerdBox title="Temperature vs Usage">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
            How your electricity usage correlates with outdoor temperature
          </p>
          
          {/* Scatter plot */}
          <div className="h-56 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis 
                  dataKey="temp" 
                  type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      label={{ value: 'Temperature (°F)', position: 'bottom', offset: 0, fontSize: 11, fill: '#78716c' }}
                      domain={['dataMin - 5', 'dataMax + 5']}
                    />
                    <YAxis 
                      dataKey="usage"
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      width={40}
                      label={{ value: 'kWh/day', angle: -90, position: 'insideLeft', offset: 5, fontSize: 11, fill: '#78716c' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'temp' ? `${Number(value).toFixed(0)}°F` : `${Number(value).toFixed(1)} kWh`,
                        name === 'temp' ? 'Temperature' : 'Usage'
                      ]}
                      contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '12px' }}
                    />
                    <Scatter 
                      data={weatherCorrelation.data} 
                      fill="#8b5cf6" 
                      fillOpacity={0.5}
                    />
                    {/* Regression line approximation using reference lines */}
                    <ReferenceLine 
                      x={weatherCorrelation.baseTemp} 
                      stroke="#f97316" 
                      strokeDasharray="3 3"
                      label={{ value: `${weatherCorrelation.baseTemp.toFixed(0)}°F`, fontSize: 10, fill: '#f97316' }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              
              {/* Key insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded">
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Correlation</p>
                  <p className="font-medium text-stone-900 dark:text-stone-100">
                    r = {weatherCorrelation.r.toFixed(2)}
                    <span className="text-xs text-stone-500 ml-2">
                      ({Math.abs(weatherCorrelation.r) > 0.5 ? 'Strong' : Math.abs(weatherCorrelation.r) > 0.3 ? 'Moderate' : 'Weak'})
                    </span>
                  </p>
                </div>
                
                <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded">
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Base Temperature</p>
                  <p className="font-medium text-stone-900 dark:text-stone-100">
                    ~{weatherCorrelation.baseTemp.toFixed(0)}°F
                    <span className="text-xs text-stone-500 ml-2">
                      (lowest usage)
                    </span>
                  </p>
                </div>
                
                {weatherCorrelation.hasHeating && weatherCorrelation.heatingSlope && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">❄️ Heating Sensitivity</p>
                    <p className="font-medium text-blue-700 dark:text-blue-300">
                      +{Math.abs(weatherCorrelation.heatingSlope).toFixed(2)} kWh/°F
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400">
                      Each degree colder adds ~{Math.abs(weatherCorrelation.heatingSlope).toFixed(1)} kWh/day
                    </p>
                  </div>
                )}
                
                {weatherCorrelation.hasCooling && weatherCorrelation.coolingSlope && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">☀️ Cooling Sensitivity</p>
                    <p className="font-medium text-amber-700 dark:text-amber-300">
                      +{weatherCorrelation.coolingSlope.toFixed(2)} kWh/°F
                    </p>
                    <p className="text-xs text-amber-500 dark:text-amber-400">
                      Each degree warmer adds ~{weatherCorrelation.coolingSlope.toFixed(1)} kWh/day
                    </p>
                  </div>
                )}
              </div>
              
              {!weatherCorrelation.hasHeating && !weatherCorrelation.hasCooling && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-3">
                  💡 Your usage doesn't show strong temperature sensitivity - you may not have electric heating/cooling, or it's very efficient.
                </p>
              )}
        </NerdBox>
      )}
    </div>
  );
}
