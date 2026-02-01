import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { CostComparison } from './components/CostComparison';
import { UsageHeatmap } from './components/UsageHeatmap';
import { MonthlyChart } from './components/MonthlyChart';
import { PeakBreakdown } from './components/PeakBreakdown';
import { WhatIfCalculator } from './components/WhatIfCalculator';
import type { UsageRecord, MonthlyStats, HourlyAverage } from './types';
import {
  parseCSV,
  calculateMonthlyStats,
  calculateHourlyAverages,
  calculateTotalCosts,
} from './utils/parser';

interface AnalysisData {
  records: UsageRecord[];
  monthlyStats: MonthlyStats[];
  hourlyAverages: HourlyAverage[];
  flatCost: number;
  touCost: number;
  totalUsage: number;
  peakUsage: number;
  offPeakUsage: number;
}

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const records = await parseCSV(file);
      
      if (records.length === 0) {
        throw new Error('No electric usage data found in this file');
      }

      const monthlyStats = calculateMonthlyStats(records);
      const hourlyAverages = calculateHourlyAverages(records);
      const { flatCost, touCost } = calculateTotalCosts(records);

      const totalUsage = records.reduce((sum, r) => sum + r.usage, 0);
      const peakUsage = monthlyStats.reduce((sum, m) => sum + m.peakUsage, 0);
      const offPeakUsage = monthlyStats.reduce((sum, m) => sum + m.offPeakUsage, 0);

      setData({
        records,
        monthlyStats,
        hourlyAverages,
        flatCost,
        touCost,
        totalUsage,
        peakUsage,
        offPeakUsage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4 font-[system-ui]">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
            Energy Insights
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Analyze your PSE electricity data and compare rate plans
          </p>
        </header>

        {!data ? (
          <div className="max-w-lg">
            <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
            {error && (
              <div className="mt-4 p-3 bg-red-50 border-l-2 border-red-400 text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div className="mt-10">
              <h2 className="text-sm font-medium text-stone-700 mb-3">How to get your data</h2>
              <ol className="text-sm text-stone-600 space-y-1.5 list-decimal list-inside">
                <li>Log in to pse.com</li>
                <li>Go to My Usage</li>
                <li>Scroll down to "Download your data"</li>
                <li>Choose your date range</li>
                <li>Select CSV format and download</li>
              </ol>
              <p className="mt-4 text-xs text-stone-400">
                Only electricity data is supported. All processing happens locally in your browser.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-stone-400">Usage</span>
                  <span className="ml-2 font-medium text-stone-900">{(data.totalUsage / 1000).toFixed(1)} MWh</span>
                </div>
                <div>
                  <span className="text-stone-400">Period</span>
                  <span className="ml-2 font-medium text-stone-900">{data.monthlyStats.length} months</span>
                </div>
                <div>
                  <span className="text-stone-400">Readings</span>
                  <span className="ml-2 font-medium text-stone-900">{data.records.length.toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2"
              >
                Upload different file
              </button>
            </div>

            <CostComparison
              flatCost={data.flatCost}
              touCost={data.touCost}
              totalUsage={data.totalUsage}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PeakBreakdown
                peakUsage={data.peakUsage}
                offPeakUsage={data.offPeakUsage}
              />
              <WhatIfCalculator
                peakUsage={data.peakUsage}
                offPeakUsage={data.offPeakUsage}
                flatCost={data.flatCost}
                touCost={data.touCost}
              />
            </div>

            <UsageHeatmap hourlyAverages={data.hourlyAverages} />

            <MonthlyChart monthlyStats={data.monthlyStats} />
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-stone-200 text-xs text-stone-400 space-y-1">
          <p>Rate estimates based on PSE Schedule 7 and Schedule 307 as of 2025. Actual bills include additional fees and taxes.</p>
          <p>This tool is not affiliated with, endorsed by, or connected to Puget Sound Energy in any way.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
