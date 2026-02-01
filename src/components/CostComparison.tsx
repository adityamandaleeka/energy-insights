import { useState } from 'react';

type RatePlan = 'flat' | 'tou' | 'touSuper';

interface CostComparisonProps {
  flatCost: number;
  touCost: number;
  touSuperCost: number;
  monthCount: number;
}

const PLANS: { id: RatePlan; name: string; schedule: string; description: string }[] = [
  { id: 'flat', name: 'Flat Rate', schedule: 'Schedule 7', description: 'Same rate all day' },
  { id: 'tou', name: 'Time-of-Use', schedule: 'Schedule 307', description: 'Peak/off-peak pricing' },
  { id: 'touSuper', name: 'TOU + Super Off-Peak', schedule: 'Schedule 327', description: 'Lowest overnight rates' },
];

export function CostComparison({ flatCost, touCost, touSuperCost, monthCount }: CostComparisonProps) {
  const [showYearly, setShowYearly] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<RatePlan>('flat');
  
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
              onClick={() => setCurrentPlan(plan.id)}
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
        <div className="mt-3 text-stone-600 dark:text-stone-400 space-y-3 pl-4 border-l-2 border-stone-200 dark:border-stone-700 text-xs">
          <div>
            <p className="font-medium text-sm">Flat Rate (Schedule 7)</p>
            <p>Basic: $7.49/mo • Tier 1: ~$0.185/kWh (≤600 kWh) • Tier 2: ~$0.205/kWh</p>
          </div>
          <div>
            <p className="font-medium text-sm">Time-of-Use (Schedule 307)</p>
            <p>Basic: $7.49/mo • Peak (Mon–Fri 7–10am, 5–8pm): $0.54 winter / $0.34 summer • Off-peak: $0.11</p>
          </div>
          <div>
            <p className="font-medium text-sm">TOU + Super Off-Peak (Schedule 327)</p>
            <p>Basic: $7.49/mo • Peak: $0.51 winter / $0.28 summer • Mid: $0.13 • Super off-peak (11pm–7am): $0.08</p>
          </div>
        </div>
      </details>
    </div>
  );
}
