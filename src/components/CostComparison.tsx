import { useState } from 'react';

export type RatePlan = 'flat' | 'tou' | 'touSuper';

interface CostComparisonProps {
  flatCost: number;
  touCost: number;
  touSuperCost: number;
  monthCount: number;
  currentPlan: RatePlan;
  onCurrentPlanChange: (plan: RatePlan) => void;
}

const PLANS: { id: RatePlan; name: string; schedule: string; description: string }[] = [
  { id: 'flat', name: 'Flat Rate', schedule: 'Schedule 7', description: 'Same rate all day' },
  { id: 'tou', name: 'Time-of-Use', schedule: 'Schedule 307', description: 'Peak/off-peak pricing' },
  { id: 'touSuper', name: 'TOU + Super Off-Peak', schedule: 'Schedule 327', description: 'Lowest overnight rates' },
];

export function CostComparison({ flatCost, touCost, touSuperCost, monthCount, currentPlan, onCurrentPlanChange }: CostComparisonProps) {
  const [showYearly, setShowYearly] = useState(true);
  
  const costs = { flat: flatCost, tou: touCost, touSuper: touSuperCost };
  const multiplier = showYearly ? 12 / monthCount : 1 / monthCount;
  const periodLabel = showYearly ? '/yr' : '/mo';

  // Find best plan
  const sortedPlans = [...PLANS].sort((a, b) => costs[a.id] - costs[b.id]);
  const bestPlan = sortedPlans[0];
  const currentCost = costs[currentPlan] * multiplier;
  const bestCost = costs[bestPlan.id] * multiplier;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200">Rate Plan Comparison</h2>
          <p className="text-xs text-stone-400 dark:text-stone-500">Based on {monthCount} month{monthCount !== 1 ? 's' : ''} of your usage data</p>
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

      {/* Current plan selector */}
      <div className="mb-6 p-3 bg-stone-50 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">
        <label className="text-xs text-stone-500 dark:text-stone-400 block mb-2">I'm currently on:</label>
        <div className="flex gap-2 flex-wrap">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => onCurrentPlanChange(plan.id)}
              className={`text-xs px-3 py-1.5 rounded transition-colors ${
                currentPlan === plan.id
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                  : 'bg-white dark:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-600 hover:border-stone-300 dark:hover:border-stone-500'
              }`}
            >
              {plan.name}
            </button>
          ))}
        </div>
      </div>

      {/* Plan comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {PLANS.map((plan) => {
          const cost = costs[plan.id] * multiplier;
          const isCurrent = currentPlan === plan.id;
          const isBest = plan.id === bestPlan.id;
          const savingsVsCurrent = currentCost - cost;
          
          return (
            <div
              key={plan.id}
              className={`p-4 rounded border-2 ${
                isCurrent 
                  ? 'border-stone-400 dark:border-stone-500 bg-stone-50 dark:bg-stone-800' 
                  : isBest
                  ? 'border-teal-500 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100 text-sm">{plan.name}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{plan.schedule}</p>
                </div>
                <div className="flex gap-1">
                  {isCurrent && (
                    <span className="text-xs bg-stone-200 dark:bg-stone-600 text-stone-600 dark:text-stone-200 px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                  {isBest && (
                    <span className="text-xs bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded">
                      Best
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xl font-semibold text-stone-900 dark:text-stone-100">
                ${cost.toFixed(2)}
                <span className="text-sm font-normal text-stone-500">{periodLabel}</span>
              </p>
              {!isCurrent && savingsVsCurrent > 0 && (
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                  Save ${savingsVsCurrent.toFixed(2)}{periodLabel}
                </p>
              )}
              {!isCurrent && savingsVsCurrent < 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  +${Math.abs(savingsVsCurrent).toFixed(2)}{periodLabel} more
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommendation */}
      {currentPlan !== bestPlan.id && (
        <div className="rounded p-4 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 mb-6">
          <p className="text-sm text-teal-700 dark:text-teal-300">
            Switching to <strong>{bestPlan.name}</strong> would save you ${(currentCost - bestCost).toFixed(2)}{periodLabel}
          </p>
        </div>
      )}

      {currentPlan === bestPlan.id && (
        <div className="rounded p-4 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 mb-6">
          <p className="text-sm text-teal-700 dark:text-teal-300">
            You're already on the best plan for your usage pattern!
          </p>
        </div>
      )}

      <details className="text-sm">
        <summary className="text-stone-500 dark:text-stone-400 cursor-pointer hover:text-stone-700 dark:hover:text-stone-300">Rate details (as of Jan 2026)</summary>
        <div className="mt-4 text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-700">
                <th className="pb-2 pr-2 text-left font-medium text-stone-500 dark:text-stone-400" />
                <th className="pb-2 px-2 text-left">
                  <div className="font-medium text-stone-600 dark:text-stone-300">Flat Rate</div>
                  <div className="font-normal text-stone-400 dark:text-stone-500">Sch 7</div>
                </th>
                <th className="pb-2 px-2 text-left">
                  <div className="font-medium text-stone-600 dark:text-stone-300">Time-of-Use</div>
                  <div className="font-normal text-stone-400 dark:text-stone-500">Sch 307</div>
                </th>
                <th className="pb-2 pl-2 text-left">
                  <div className="font-medium text-stone-600 dark:text-stone-300">TOU + Super</div>
                  <div className="font-normal text-stone-400 dark:text-stone-500">Sch 327</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <td className="py-2.5 pr-2 text-stone-500 dark:text-stone-400">Peak</td>
                <td className="py-2.5 px-2 align-middle" rowSpan={3}>
                  <div className="bg-stone-50 dark:bg-stone-800 rounded-lg px-3 py-3 text-center">
                    <div className="font-semibold text-stone-700 dark:text-stone-200">$0.185<span className="font-normal text-stone-400 dark:text-stone-500">/kWh</span></div>
                    <div className="text-[10px] text-stone-400 dark:text-stone-500">first 600 kWh</div>
                    <div className="w-6 border-t border-stone-200 dark:border-stone-700 mx-auto my-1.5" />
                    <div className="font-semibold text-stone-700 dark:text-stone-200">$0.205<span className="font-normal text-stone-400 dark:text-stone-500">/kWh</span></div>
                    <div className="text-[10px] text-stone-400 dark:text-stone-500">above 600 kWh</div>
                    <div className="mt-2 text-[10px] text-stone-400 dark:text-stone-500 italic">Same rate all hours</div>
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <div className="space-y-1">
                    <div><span className="inline-block px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-semibold">$0.58</span> <span className="text-stone-400 dark:text-stone-500">Oct–Mar</span></div>
                    <div><span className="inline-block px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-semibold">$0.38</span> <span className="text-stone-400 dark:text-stone-500">Apr–Sep</span></div>
                  </div>
                </td>
                <td className="py-2.5 pl-2">
                  <div className="space-y-1">
                    <div><span className="inline-block px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-semibold">$0.55</span> <span className="text-stone-400 dark:text-stone-500">Oct–Mar</span></div>
                    <div><span className="inline-block px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-semibold">$0.32</span> <span className="text-stone-400 dark:text-stone-500">Apr–Sep</span></div>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <td className="py-2.5 pr-2 text-stone-500 dark:text-stone-400">Off-peak</td>
                <td className="py-2.5 px-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-semibold">$0.15</span>
                </td>
                <td className="py-2.5 pl-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-semibold">$0.17</span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-2 text-stone-500 dark:text-stone-400">Super off-peak</td>
                <td className="py-2.5 px-2 text-stone-300 dark:text-stone-600">—</td>
                <td className="py-2.5 pl-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold">$0.12</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 text-stone-400 dark:text-stone-500 space-y-0.5">
            <p>All plans: $7.49/mo basic charge. Rates include all per-kWh surcharges.</p>
            <p>Peak hours: Mon–Fri 7–10am &amp; 5–8pm (Sch 307 summer: 5–8pm only)</p>
            <p>Super off-peak: 11pm–7am daily. Weekends &amp; holidays are off-peak all day.</p>
          </div>
        </div>
      </details>
    </div>
  );
}
