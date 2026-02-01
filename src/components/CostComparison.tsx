interface CostComparisonProps {
  flatCost: number;
  touCost: number;
  monthCount: number;
}

export function CostComparison({ flatCost, touCost, monthCount }: CostComparisonProps) {
  const savings = flatCost - touCost;
  const savingsPercent = ((savings / flatCost) * 100).toFixed(1);
  const wouldSave = savings > 0;

  const monthlyFlat = flatCost / monthCount;
  const monthlyTou = touCost / monthCount;
  const monthlySavings = savings / monthCount;
  const yearlyFlat = monthlyFlat * 12;
  const yearlyTou = monthlyTou * 12;
  const yearlySavings = monthlySavings * 12;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Cost Comparison</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-6">Based on {monthCount} month{monthCount !== 1 ? 's' : ''} of data, projected to monthly/yearly</p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-stone-400 dark:text-stone-500">
              <th className="pb-3 font-medium"></th>
              <th className="pb-3 font-medium">Flat Rate</th>
              <th className="pb-3 font-medium">Time-of-Use</th>
              <th className="pb-3 font-medium">Difference</th>
            </tr>
          </thead>
          <tbody className="text-stone-900 dark:text-stone-100">
            <tr className="border-t border-stone-100 dark:border-stone-800">
              <td className="py-3 text-stone-500 dark:text-stone-400">Per month</td>
              <td className="py-3 font-medium">${monthlyFlat.toFixed(2)}</td>
              <td className="py-3 font-medium">${monthlyTou.toFixed(2)}</td>
              <td className={`py-3 font-medium ${wouldSave ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {wouldSave ? '−' : '+'}${Math.abs(monthlySavings).toFixed(2)}
              </td>
            </tr>
            <tr className="border-t border-stone-100 dark:border-stone-800">
              <td className="py-3 text-stone-500 dark:text-stone-400">Per year</td>
              <td className="py-3 font-medium">${yearlyFlat.toFixed(2)}</td>
              <td className="py-3 font-medium">${yearlyTou.toFixed(2)}</td>
              <td className={`py-3 font-medium ${wouldSave ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {wouldSave ? '−' : '+'}${Math.abs(yearlySavings).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={`mt-6 rounded p-4 ${wouldSave ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800' : 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800'}`}>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-semibold ${wouldSave ? 'text-teal-700 dark:text-teal-400' : 'text-orange-700 dark:text-orange-400'}`}>
            {wouldSave ? '−' : '+'}${Math.abs(yearlySavings).toFixed(2)}/yr
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
