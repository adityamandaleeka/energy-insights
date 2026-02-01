interface CostComparisonProps {
  flatCost: number;
  touCost: number;
  totalUsage: number;
}

export function CostComparison({ flatCost, touCost, totalUsage }: CostComparisonProps) {
  const savings = flatCost - touCost;
  const savingsPercent = ((savings / flatCost) * 100).toFixed(1);
  const wouldSave = savings > 0;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-6">Cost Comparison</h2>
      
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Total Usage</p>
          <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">{totalUsage.toFixed(0)} <span className="text-sm font-normal text-stone-500 dark:text-stone-400">kWh</span></p>
        </div>
        
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Flat Rate</p>
          <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">${flatCost.toFixed(2)}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500">Schedule 7</p>
        </div>
        
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Time-of-Use</p>
          <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">${touCost.toFixed(2)}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500">Schedule 307</p>
        </div>
      </div>

      <div className={`rounded p-4 ${wouldSave ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800' : 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800'}`}>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-semibold ${wouldSave ? 'text-teal-700 dark:text-teal-400' : 'text-orange-700 dark:text-orange-400'}`}>
            {wouldSave ? '−' : '+'}${Math.abs(savings).toFixed(2)}
          </span>
          <span className={`text-sm ${wouldSave ? 'text-teal-600 dark:text-teal-500' : 'text-orange-600 dark:text-orange-500'}`}>
            ({Math.abs(Number(savingsPercent))}% {wouldSave ? 'savings' : 'more'}) with TOU
          </span>
        </div>
      </div>

      <details className="mt-6 text-sm">
        <summary className="text-stone-500 dark:text-stone-400 cursor-pointer hover:text-stone-700 dark:hover:text-stone-300">Rate details</summary>
        <div className="mt-3 text-stone-600 dark:text-stone-400 space-y-1 pl-4 border-l-2 border-stone-200 dark:border-stone-700">
          <p><strong>Peak hours:</strong> Mon–Fri 7–10am & 5–8pm</p>
          <p><strong>Peak rate (Oct–Mar):</strong> $0.345/kWh</p>
          <p><strong>Peak rate (Apr–Sep):</strong> $0.23/kWh</p>
          <p><strong>Off-peak rate:</strong> $0.096/kWh</p>
        </div>
      </details>
    </div>
  );
}
