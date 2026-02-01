import { useState } from 'react';
import { TOU_RATE } from '../utils/rates';

interface WhatIfCalculatorProps {
  peakUsage: number;
  offPeakUsage: number;
  flatCost: number;
  touCost: number;
  monthCount: number;
}

export function WhatIfCalculator({ peakUsage, offPeakUsage, flatCost, touCost, monthCount }: WhatIfCalculatorProps) {
  const [shiftPercent, setShiftPercent] = useState(20);

  const shiftedKwh = (peakUsage * shiftPercent) / 100;
  const newPeakUsage = peakUsage - shiftedKwh;
  const newOffPeakUsage = offPeakUsage + shiftedKwh;

  const avgPeakRate = (TOU_RATE.peakRateWinter + TOU_RATE.peakRateSummer) / 2;
  const originalTouEstimate = (peakUsage * avgPeakRate) + (offPeakUsage * TOU_RATE.offPeakRate);
  const newTouCost = (newPeakUsage * avgPeakRate) + (newOffPeakUsage * TOU_RATE.offPeakRate);
  const additionalSavings = originalTouEstimate - newTouCost;

  const totalSavingsForPeriod = (flatCost - touCost) + additionalSavings;
  const monthlySavings = totalSavingsForPeriod / monthCount;
  const yearlySavings = monthlySavings * 12;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">What If</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Estimate savings from shifting usage</p>

      <div className="mb-5">
        <label className="block text-xs text-stone-500 dark:text-stone-400 mb-2">
          Shift peak usage to off-peak:
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="50"
            value={shiftPercent}
            onChange={(e) => setShiftPercent(Number(e.target.value))}
            className="flex-1 h-1.5 bg-stone-200 dark:bg-stone-700 rounded appearance-none cursor-pointer accent-teal-600"
          />
          <span className="text-lg font-medium text-stone-900 dark:text-stone-100 w-12 text-right">{shiftPercent}%</span>
        </div>
      </div>

      <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded p-4">
        <p className="text-xs text-teal-600 dark:text-teal-400">Potential TOU savings with shift</p>
        <p className="text-2xl font-semibold text-teal-700 dark:text-teal-300">${yearlySavings.toFixed(2)}<span className="text-sm font-normal">/yr</span></p>
        <p className="text-xs text-teal-600 dark:text-teal-500 mt-1">${monthlySavings.toFixed(2)}/mo</p>
      </div>

      <details className="mt-4 text-sm">
        <summary className="text-stone-500 dark:text-stone-400 cursor-pointer hover:text-stone-700 dark:hover:text-stone-300">Tips for shifting usage</summary>
        <ul className="mt-2 text-stone-600 dark:text-stone-400 space-y-1 pl-4 border-l-2 border-stone-200 dark:border-stone-700 text-xs">
          <li>Run dishwasher after 8pm or on weekends</li>
          <li>Do laundry before 7am or after 8pm</li>
          <li>Charge EVs overnight</li>
          <li>Pre-cool/heat before peak hours</li>
        </ul>
      </details>
    </div>
  );
}
