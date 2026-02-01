import { useState } from 'react';
import { TOU_RATE, TOU_SUPER_RATE } from '../utils/rates';
import type { RatePlan } from './CostComparison';

interface WhatIfCalculatorProps {
  peakUsage: number;
  offPeakUsage: number;
  winterPeakUsage: number;
  summerPeakUsage: number;
  flatCost: number;
  touCost: number;
  touSuperCost: number;
  monthCount: number;
  currentPlan: RatePlan;
}

export function WhatIfCalculator({ 
  peakUsage, 
  offPeakUsage, 
  winterPeakUsage,
  summerPeakUsage,
  flatCost, 
  touCost, 
  touSuperCost, 
  monthCount, 
  currentPlan 
}: WhatIfCalculatorProps) {
  const [shiftPercent, setShiftPercent] = useState(20);

  const costs = { flat: flatCost, tou: touCost, touSuper: touSuperCost };
  const currentCost = costs[currentPlan];

  const shiftedKwh = (peakUsage * shiftPercent) / 100;
  const newOffPeakUsage = offPeakUsage + shiftedKwh;

  // Calculate shifted amounts proportionally by season
  const winterRatio = peakUsage > 0 ? winterPeakUsage / peakUsage : 0.5;
  const summerRatio = 1 - winterRatio;
  const winterShifted = shiftedKwh * winterRatio;
  const summerShifted = shiftedKwh * summerRatio;

  // TOU (Schedule 307) calculations
  const originalTouEstimate = 
    (winterPeakUsage * TOU_RATE.peakRateWinter) + 
    (summerPeakUsage * TOU_RATE.peakRateSummer) + 
    (offPeakUsage * TOU_RATE.offPeakRate);
  
  const newTouCost = 
    ((winterPeakUsage - winterShifted) * TOU_RATE.peakRateWinter) + 
    ((summerPeakUsage - summerShifted) * TOU_RATE.peakRateSummer) + 
    (newOffPeakUsage * TOU_RATE.offPeakRate);
  
  const touAdditionalSavings = originalTouEstimate - newTouCost;

  // TOU Super (Schedule 327) calculations - assume shifted usage goes to super off-peak
  const originalTouSuperEstimate = 
    (winterPeakUsage * TOU_SUPER_RATE.peakRateWinter) + 
    (summerPeakUsage * TOU_SUPER_RATE.peakRateSummer) + 
    (offPeakUsage * TOU_SUPER_RATE.offPeakRate);
  
  const newTouSuperCost = 
    ((winterPeakUsage - winterShifted) * TOU_SUPER_RATE.peakRateWinter) + 
    ((summerPeakUsage - summerShifted) * TOU_SUPER_RATE.peakRateSummer) + 
    (offPeakUsage * TOU_SUPER_RATE.offPeakRate) +
    (shiftedKwh * TOU_SUPER_RATE.superOffPeakRate); // Shifted goes to super off-peak
  
  const touSuperAdditionalSavings = originalTouSuperEstimate - newTouSuperCost;

  // Calculate savings vs current plan
  const touTotalSavings = (currentCost - touCost) + touAdditionalSavings;
  const touSuperTotalSavings = (currentCost - touSuperCost) + touSuperAdditionalSavings;
  
  const touYearlySavings = (touTotalSavings / monthCount) * 12;
  const touSuperYearlySavings = (touSuperTotalSavings / monthCount) * 12;

  // If already on TOU, just show shift savings
  const isOnTou = currentPlan === 'tou' || currentPlan === 'touSuper';
  const shiftOnlySavings = (touAdditionalSavings / monthCount) * 12;

  const formatSavings = (amount: number) => {
    if (amount >= 0) {
      return { text: `$${amount.toFixed(2)}`, positive: true };
    } else {
      return { text: `+$${Math.abs(amount).toFixed(2)}`, positive: false };
    }
  };

  const touDisplay = formatSavings(touYearlySavings);
  const touSuperDisplay = formatSavings(touSuperYearlySavings);

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

      {isOnTou ? (
        // Already on TOU - just show shift savings
        shiftOnlySavings >= 0 ? (
          <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded p-4">
            <p className="text-xs text-teal-600 dark:text-teal-400">Savings from shifting {shiftPercent}% to off-peak</p>
            <p className="text-2xl font-semibold text-teal-700 dark:text-teal-300">${shiftOnlySavings.toFixed(2)}<span className="text-sm font-normal">/yr</span></p>
            <p className="text-xs text-teal-600 dark:text-teal-500 mt-1">${(shiftOnlySavings / 12).toFixed(2)}/mo</p>
          </div>
        ) : (
          <div className="bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded p-4">
            <p className="text-xs text-stone-500 dark:text-stone-400">No additional savings</p>
            <p className="text-sm text-stone-600 dark:text-stone-300 mt-1">Your usage is already well-distributed</p>
          </div>
        )
      ) : (
        // On flat rate - show both TOU options
        <div className="space-y-3">
          <div className={`rounded p-4 ${touDisplay.positive ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800' : 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-xs ${touDisplay.positive ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  Time-of-Use (Schedule 307)
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Peak/off-peak pricing</p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-semibold ${touDisplay.positive ? 'text-teal-700 dark:text-teal-300' : 'text-orange-700 dark:text-orange-300'}`}>
                  {touDisplay.text}<span className="text-sm font-normal">/yr</span>
                </p>
              </div>
            </div>
          </div>
          
          <div className={`rounded p-4 ${touSuperDisplay.positive ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800' : 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-xs ${touSuperDisplay.positive ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  TOU + Super Off-Peak (Schedule 327)
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Lowest rates 11pm–7am</p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-semibold ${touSuperDisplay.positive ? 'text-teal-700 dark:text-teal-300' : 'text-orange-700 dark:text-orange-300'}`}>
                  {touSuperDisplay.text}<span className="text-sm font-normal">/yr</span>
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-stone-400 dark:text-stone-500 text-center">
            {touDisplay.positive || touSuperDisplay.positive ? 'Savings' : 'Additional cost'} vs your current plan with {shiftPercent}% shift
          </p>
        </div>
      )}

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
