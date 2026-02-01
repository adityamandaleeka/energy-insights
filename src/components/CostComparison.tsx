import { useState } from 'react';

interface CostComparisonProps {
  flatCost: number;
  touCost: number;
  monthCount: number;
}

export function CostComparison({ flatCost, touCost, monthCount }: CostComparisonProps) {
  const [showYearly, setShowYearly] = useState(true);
  
  const savings = flatCost - touCost;
  const savingsPercent = ((savings / flatCost) * 100).toFixed(1);
  const wouldSave = savings > 0;

  const monthlyFlat = flatCost / monthCount;
  const monthlyTou = touCost / monthCount;
  const monthlySavings = savings / monthCount;
  const yearlyFlat = monthlyFlat * 12;
  const yearlyTou = monthlyTou * 12;
  const yearlySavings = monthlySavings * 12;

  const displayFlat = showYearly ? yearlyFlat : monthlyFlat;
  const displayTou = showYearly ? yearlyTou : monthlyTou;
  const displaySavings = showYearly ? yearlySavings : monthlySavings;
  const periodLabel = showYearly ? '/yr' : '/mo';

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200">Cost Comparison</h2>
          <p className="text-xs text-stone-400 dark:text-stone-500">Based on {monthCount} month{monthCount !== 1 ? 's' : ''} of data</p>
        </div>
        <div className="flex text-xs border border-stone-200 dark:border-stone-700 rounded overflow-hidden">
          <button
            onClick={() => setShowYearly(false)}
            className={`px-3 py-1.5 ${!showYearly ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setShowYearly(true)}
            className={`px-3 py-1.5 ${showYearly ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
          >
            Yearly
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Flat Rate</p>
          <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">${displayFlat.toFixed(2)}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500">Schedule 7</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Time-of-Use</p>
          <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">${displayTou.toFixed(2)}</p>
          <p className="text-xs text-stone-400 dark:text-stone-500">Schedule 307</p>
        </div>
        <div>
          <p className="text-xs text-stone-400 dark:text-stone-500 mb-1">Difference</p>
          <p className={`text-xl font-semibold ${wouldSave ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {wouldSave ? '−' : '+'}${Math.abs(displaySavings).toFixed(2)}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">{Math.abs(Number(savingsPercent))}% {wouldSave ? 'less' : 'more'}</p>
        </div>
      </div>

      <div className={`rounded p-4 ${wouldSave ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800' : 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800'}`}>
        <p className={`text-sm ${wouldSave ? 'text-teal-700 dark:text-teal-300' : 'text-orange-700 dark:text-orange-300'}`}>
          {wouldSave 
            ? `TOU would save you $${Math.abs(displaySavings).toFixed(2)}${periodLabel}` 
            : `TOU would cost $${Math.abs(displaySavings).toFixed(2)}${periodLabel} more`}
        </p>
      </div>

      <details className="mt-6 text-sm">
        <summary className="text-stone-500 dark:text-stone-400 cursor-pointer hover:text-stone-700 dark:hover:text-stone-300">Rate details</summary>
        <div className="mt-3 text-stone-600 dark:text-stone-400 space-y-1 pl-4 border-l-2 border-stone-200 dark:border-stone-700">
          <p><strong>Peak hours:</strong> Mon–Fri 7–10am & 5–8pm</p>
          <p><strong>Peak rate (Oct–Mar):</strong> $0.345/kWh</p>
          <p><strong>Peak rate (Apr–Sep):</strong> $0.23/kWh</p>
          <p><strong>Off-peak rate:</strong> $0.096/kWh</p>
          <p><strong>Flat rate:</strong> $0.122/kWh (first 600 kWh/mo), $0.142/kWh after</p>
        </div>
      </details>
    </div>
  );
}
