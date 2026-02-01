import { useState } from 'react';
import { TOU_RATE } from '../utils/rates';

interface WhatIfCalculatorProps {
  peakUsage: number;
  offPeakUsage: number;
  flatCost: number;
  touCost: number;
}

export function WhatIfCalculator({ peakUsage, offPeakUsage, flatCost, touCost }: WhatIfCalculatorProps) {
  const [shiftPercent, setShiftPercent] = useState(20);

  const shiftedKwh = (peakUsage * shiftPercent) / 100;
  const newPeakUsage = peakUsage - shiftedKwh;
  const newOffPeakUsage = offPeakUsage + shiftedKwh;

  const avgPeakRate = (TOU_RATE.peakRateWinter + TOU_RATE.peakRateSummer) / 2;
  const originalTouEstimate = (peakUsage * avgPeakRate) + (offPeakUsage * TOU_RATE.offPeakRate);
  const newTouCost = (newPeakUsage * avgPeakRate) + (newOffPeakUsage * TOU_RATE.offPeakRate);
  const additionalSavings = originalTouEstimate - newTouCost;

  const totalTouSavings = (flatCost - touCost) + additionalSavings;

  return (
    <div className="bg-white border border-stone-200 rounded p-6">
      <h2 className="text-sm font-medium text-stone-700 mb-1">What If</h2>
      <p className="text-xs text-stone-400 mb-4">Estimate savings from shifting usage</p>

      <div className="mb-5">
        <label className="block text-xs text-stone-500 mb-2">
          Shift peak usage to off-peak:
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="50"
            value={shiftPercent}
            onChange={(e) => setShiftPercent(Number(e.target.value))}
            className="flex-1 h-1.5 bg-stone-200 rounded appearance-none cursor-pointer accent-stone-600"
          />
          <span className="text-lg font-medium text-stone-900 w-12 text-right">{shiftPercent}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
        <div>
          <p className="text-xs text-stone-400">Energy shifted</p>
          <p className="font-medium text-stone-900">{shiftedKwh.toFixed(0)} kWh</p>
        </div>
        <div>
          <p className="text-xs text-stone-400">Additional savings</p>
          <p className="font-medium text-stone-900">${additionalSavings.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded p-4">
        <p className="text-xs text-teal-600">Potential yearly TOU savings</p>
        <p className="text-2xl font-semibold text-teal-700">${totalTouSavings.toFixed(2)}</p>
      </div>

      <details className="mt-4 text-sm">
        <summary className="text-stone-500 cursor-pointer hover:text-stone-700">Tips for shifting usage</summary>
        <ul className="mt-2 text-stone-600 space-y-1 pl-4 border-l-2 border-stone-200 text-xs">
          <li>Run dishwasher after 8pm or on weekends</li>
          <li>Do laundry before 7am or after 8pm</li>
          <li>Charge EVs overnight</li>
          <li>Pre-cool/heat before peak hours</li>
        </ul>
      </details>
    </div>
  );
}
