interface UsageComparisonsProps {
  totalUsage: number; // total kWh over the period
  numDays: number;
  records: { date: string; usage: number }[];
}

// Average monthly usage data (kWh)
const US_AVERAGE_MONTHLY = 886; // EIA 2023
const WA_AVERAGE_MONTHLY = 950; // Pacific Northwest tends higher due to electric heat

// Fun equivalents (kWh required)
const EQUIVALENTS = {
  iphoneCharges: 0.012, // kWh per full charge
  netflix55TV: 0.1, // kWh per hour on a 55" TV
  laundryLoads: 2.5, // kWh per washer+dryer cycle
  dishwasherLoads: 1.8, // kWh per dishwasher cycle
  showerMinutesElectric: 0.5, // kWh per minute of electric water heater shower
  coffeesCoffeemaker: 0.1, // kWh per pot of coffee
  toastSlices: 0.04, // kWh per slice of toast
  videoCalls: 0.02, // kWh per hour of video call on laptop
};

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

export function UsageComparisons({ totalUsage, numDays, records }: UsageComparisonsProps) {
  // Calculate daily totals
  const dailyTotals = new Map<string, number>();
  for (const r of records) {
    dailyTotals.set(r.date, (dailyTotals.get(r.date) || 0) + r.usage);
  }
  const dailyUsages = Array.from(dailyTotals.values()).sort((a, b) => a - b);
  
  // Baseload: average of 5th and 10th percentile
  const p5 = dailyUsages[Math.floor(dailyUsages.length * 0.05)] || 0;
  const p10 = dailyUsages[Math.floor(dailyUsages.length * 0.10)] || 0;
  const baseload = (p5 + p10) / 2;
  
  const monthlyAvg = (totalUsage / numDays) * 30.44; // Average days per month
  
  // Benchmark comparisons
  const vsUS = ((monthlyAvg - US_AVERAGE_MONTHLY) / US_AVERAGE_MONTHLY) * 100;
  const vsWA = ((monthlyAvg - WA_AVERAGE_MONTHLY) / WA_AVERAGE_MONTHLY) * 100;
  
  // Time period description
  const months = Math.round(numDays / 30);
  const periodText = months >= 12 
    ? `${(numDays / 365).toFixed(1)} years` 
    : months > 1 
    ? `${months} months` 
    : `${numDays} days`;

  // Fun equivalents for total usage
  const equivalents = [
    { emoji: '📱', value: formatNumber(totalUsage / EQUIVALENTS.iphoneCharges), label: 'iPhone charges' },
    { emoji: '📺', value: formatNumber(totalUsage / EQUIVALENTS.netflix55TV), label: 'hours of TV' },
    { emoji: '🧺', value: formatNumber(totalUsage / EQUIVALENTS.laundryLoads), label: 'laundry loads' },
    { emoji: '☕', value: formatNumber(totalUsage / EQUIVALENTS.coffeesCoffeemaker), label: 'pots of coffee' },
    { emoji: '🍞', value: formatNumber(totalUsage / EQUIVALENTS.toastSlices), label: 'slices of toast' },
  ];
  
  // Baseload context (what's always on)
  const baseloadWatts = baseload ? (baseload / 24) * 1000 : null;
  const baseloadLEDs = baseloadWatts ? Math.round(baseloadWatts / 10) : null;
  const baseloadFridges = baseloadWatts ? (baseloadWatts / 50).toFixed(1) : null;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">How You Compare</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Your usage in context</p>
      
      {/* Benchmarks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">vs. US Average</p>
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {vsUS > 0 ? '+' : ''}{vsUS.toFixed(0)}%
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            {vsUS > 10 
              ? 'Higher than typical' 
              : vsUS < -10 
              ? 'Lower than typical' 
              : 'About average'}
          </p>
        </div>
        <div className="p-3 bg-stone-50 dark:bg-stone-800 rounded">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">vs. Washington Average</p>
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {vsWA > 0 ? '+' : ''}{vsWA.toFixed(0)}%
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            {vsWA > 10 
              ? 'Higher than typical' 
              : vsWA < -10 
              ? 'Lower than typical' 
              : 'About average'}
          </p>
        </div>
      </div>

      {/* Baseload context */}
      {baseloadWatts && baseloadLEDs && baseloadFridges && (
        <div className="mb-5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
          <p className="text-sm text-stone-700 dark:text-stone-200 mb-1">
            🔌 Your always-on load: ~{baseloadWatts.toFixed(0)}W
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            That's like running {baseloadLEDs} LED bulbs 24/7, or {baseloadFridges} refrigerators
          </p>
        </div>
      )}

      {/* Fun equivalents */}
      <div className="mb-4">
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
          Over the {periodText} represented in this data, your {formatNumber(totalUsage)} kWh is equivalent to:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {equivalents.map((eq, i) => (
            <div key={i} className="p-3 bg-stone-50 dark:bg-stone-800 rounded text-center">
              <p className="text-lg mb-1">{eq.emoji}</p>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{eq.value}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">{eq.label}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-stone-400 dark:text-stone-500">
        Sources: US avg {US_AVERAGE_MONTHLY} kWh/mo (<a href="https://www.eia.gov/energyexplained/electricity/use-of-electricity.php" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600 dark:hover:text-stone-300">EIA 2023</a>) · WA avg ~{WA_AVERAGE_MONTHLY} kWh/mo (<a href="https://www.eia.gov/electricity/sales_revenue_price/pdf/table5_a.pdf" target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600 dark:hover:text-stone-300">EIA state data</a>)
      </p>
    </div>
  );
}
