import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { CostComparison } from './components/CostComparison';
import type { RatePlan } from './components/CostComparison';
import { UsageHeatmap } from './components/UsageHeatmap';
import { MonthlyChart } from './components/MonthlyChart';
import { PeakBreakdown } from './components/PeakBreakdown';
import { WhatIfCalculator } from './components/WhatIfCalculator';
import { WeekdayComparison } from './components/WeekdayComparison';
import { HighUsageDays } from './components/HighUsageDays';
import { SeasonalComparison } from './components/SeasonalComparison';
import { UsagePatterns } from './components/UsagePatterns';
import { StatisticalInsights } from './components/StatisticalInsights';
import type { UsageRecord, MonthlyStats, HourlyAverage } from './types';
import {
  parseCSVWithMetadata,
  calculateMonthlyStats,
  calculateHourlyAverages,
  calculateTotalCosts,
} from './utils/parser';
import type { CSVMetadata } from './utils/parser';
import { RATE_EFFECTIVE_DATE, isWinterMonth } from './utils/rates';
import { generateDemoData, DEMO_PERSONAS } from './utils/demoData';
import type { DemoPersona } from './utils/demoData';
import { extractZipCode, fetchWeatherData } from './utils/weather';
import type { DailyWeather } from './utils/weather';

interface AnalysisData {
  records: UsageRecord[];
  monthlyStats: MonthlyStats[];
  hourlyAverages: HourlyAverage[];
  isDemo?: boolean;
  demoPersona?: DemoPersona;
  flatCost: number;
  touCost: number;
  touSuperCost: number;
  totalUsage: number;
  peakUsage: number;
  offPeakUsage: number;
  winterPeakUsage: number;
  summerPeakUsage: number;
  metadata?: CSVMetadata;
  weather?: DailyWeather[];
}

const STORAGE_KEY = 'energy-insights-data';

function loadCachedData(): AnalysisData | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function saveCachedData(data: AnalysisData | null) {
  try {
    if (data && !data.isDemo) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(() => loadCachedData());
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<RatePlan>('flat');
  const [nerdMode, setNerdMode] = useState(false);
  const [nerdToastVisible, setNerdToastVisible] = useState(false);
  const [nerdToastFading, setNerdToastFading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Save to localStorage when data changes
  useEffect(() => {
    saveCachedData(data);
  }, [data]);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const { records, metadata } = await parseCSVWithMetadata(file);
      
      if (records.length === 0) {
        throw new Error('No electric usage data found in this file');
      }

      const monthlyStats = calculateMonthlyStats(records);
      const hourlyAverages = calculateHourlyAverages(records);
      const { flatCost, touCost, touSuperCost } = calculateTotalCosts(records);

      const totalUsage = records.reduce((sum, r) => sum + r.usage, 0);
      const peakUsage = monthlyStats.reduce((sum, m) => sum + m.peakUsage, 0);
      const offPeakUsage = monthlyStats.reduce((sum, m) => sum + m.offPeakUsage, 0);
      
      // Calculate seasonal peak usage for accurate What If calculations
      let winterPeakUsage = 0;
      let summerPeakUsage = 0;
      monthlyStats.forEach(m => {
        const monthNum = parseInt(m.month.split('-')[1], 10);
        if (isWinterMonth(monthNum)) {
          winterPeakUsage += m.peakUsage;
        } else {
          summerPeakUsage += m.peakUsage;
        }
      });

      // Fetch weather data if we have an address with zip code
      let weather: DailyWeather[] | undefined;
      if (metadata.address) {
        const zipCode = extractZipCode(metadata.address);
        if (zipCode && records.length > 0) {
          const dates = records.map(r => r.date).sort();
          const startDate = dates[0];
          const endDate = dates[dates.length - 1];
          try {
            weather = await fetchWeatherData(zipCode, startDate, endDate);
          } catch (e) {
            console.warn('Failed to fetch weather data:', e);
          }
        }
      }

      setData({
        records,
        monthlyStats,
        hourlyAverages,
        flatCost,
        touCost,
        touSuperCost,
        totalUsage,
        peakUsage,
        offPeakUsage,
        winterPeakUsage,
        summerPeakUsage,
        metadata,
        weather,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = (persona: DemoPersona) => {
    const demoData = generateDemoData(persona);
    const { records, metadata, weather } = demoData;
    const monthlyStats = calculateMonthlyStats(records);
    const hourlyAverages = calculateHourlyAverages(records);
    const { flatCost, touCost, touSuperCost } = calculateTotalCosts(records);

    const totalUsage = records.reduce((sum, r) => sum + r.usage, 0);
    const peakUsage = monthlyStats.reduce((sum, m) => sum + m.peakUsage, 0);
    const offPeakUsage = monthlyStats.reduce((sum, m) => sum + m.offPeakUsage, 0);
    
    let winterPeakUsage = 0;
    let summerPeakUsage = 0;
    monthlyStats.forEach(m => {
      const monthNum = parseInt(m.month.split('-')[1], 10);
      if (isWinterMonth(monthNum)) {
        winterPeakUsage += m.peakUsage;
      } else {
        summerPeakUsage += m.peakUsage;
      }
    });

    setData({
      records,
      monthlyStats,
      hourlyAverages,
      flatCost,
      touCost,
      touSuperCost,
      totalUsage,
      peakUsage,
      offPeakUsage,
      winterPeakUsage,
      summerPeakUsage,
      isDemo: true,
      demoPersona: persona,
      metadata,
      weather,
    });
  };

  const handleReset = () => {
    setData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-10 px-4 font-[system-ui]">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              Energy Insights
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
              Analyze your PSE electricity data and compare rate plans
            </p>
          </div>
          <div className="flex gap-2">
            {data && (
              <button
                onClick={() => {
                  const newValue = !nerdMode;
                  setNerdMode(newValue);
                  if (newValue) {
                    setNerdToastVisible(true);
                    setNerdToastFading(false);
                    setTimeout(() => setNerdToastFading(true), 1500);
                    setTimeout(() => setNerdToastVisible(false), 2000);
                  }
                }}
                className={`p-2 text-xl rounded-full border transition-all ${
                  nerdMode 
                    ? 'bg-violet-100 dark:bg-violet-900/50 border-violet-300 dark:border-violet-700 scale-110' 
                    : 'border-stone-200 dark:border-stone-700 grayscale opacity-50 hover:opacity-75 hover:border-stone-300 dark:hover:border-stone-600'
                }`}
                aria-label="Toggle advanced stats"
                title="Advanced stats for nerds"
              >
                🤓
              </button>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-700 hover:border-stone-300 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:border-stone-600 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Nerd mode toast */}
        {nerdToastVisible && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-500 ${nerdToastFading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="bg-violet-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
              <span className="text-xl">🤓</span>
              <span className="font-medium">Nerd mode enabled!</span>
              <span className="text-violet-200 text-sm">Advanced stats shown below</span>
            </div>
          </div>
        )}

        {!data ? (
          <div className="max-w-2xl">
            {/* Intro blurb */}
            <div className="mb-8 p-5 bg-gradient-to-br from-teal-50 to-sky-50 dark:from-teal-900/20 dark:to-sky-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
              <h2 className="text-lg font-medium text-stone-900 dark:text-stone-100 mb-2">
                Should you switch to Time-of-Use pricing?
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Puget Sound Energy is rolling out <strong>Time-of-Use (TOU)</strong> rate plans that charge different prices based on when you use electricity. 
                Peak hours (weekday mornings and evenings) cost more, while off-peak hours cost less. 
                TOU pricing can save you money if you shift usage to off-peak times, and helps reduce strain on the electrical grid when demand is highest.
                This tool analyzes your actual usage patterns to show you how TOU would affect your bills.
              </p>
            </div>

            {/* Analyze data - primary */}
            <div className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-lg mb-6">
              <h3 className="font-medium text-stone-900 dark:text-stone-100 mb-1">Analyze your data</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 mb-1">Get personalized results with your actual PSE usage</p>
              <p className="text-xs text-stone-500 dark:text-stone-500 mb-4">Your data stays on your device and is never sent to a server</p>
              <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border-l-2 border-red-400 text-red-700 dark:text-red-400 text-sm rounded">
                  {error}
                </div>
              )}
            </div>
              
            {/* Demo options */}
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">Or try with sample data:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleDemo('ev-wfh')}
                className="p-4 text-left rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
              >
                <p className="font-medium text-sm text-stone-900 dark:text-stone-100">EV Owner, Works from Home</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Charges EV overnight, home during day</p>
              </button>
              <button
                onClick={() => handleDemo('family')}
                className="p-4 text-left rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
              >
                <p className="font-medium text-sm text-stone-900 dark:text-stone-100">Family with School-Age Kids</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Morning rush, evening family time</p>
              </button>
            </div>
            
            <div className="mt-10">
              <h2 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">How to get your data</h2>
              <ol className="text-sm text-stone-600 dark:text-stone-400 space-y-1.5 list-decimal list-inside">
                <li>Log in to pse.com</li>
                <li>Go to My Usage</li>
                <li>Scroll down to "Download your data"</li>
                <li>Choose your date range</li>
                <li>Select CSV format and download</li>
              </ol>
              <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
                Only electricity data is supported. All processing happens locally in your browser.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {data.isDemo && (
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Viewing sample: <strong>{DEMO_PERSONAS.find(p => p.id === data.demoPersona)?.name}</strong>
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Use your own PSE data for accurate results
                  </p>
                </div>
                <div className="flex gap-2">
                  {DEMO_PERSONAS.filter(p => p.id !== data.demoPersona).map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleDemo(p.id)}
                      className="text-xs text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
                    >
                      Try {p.name.split(',')[0]}
                    </button>
                  ))}
                  <button
                    onClick={handleReset}
                    className="text-xs text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
                  >
                    Use your data
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-stone-400 dark:text-stone-500">Usage</span>
                  <span className="ml-2 font-medium text-stone-900 dark:text-stone-100">{(data.totalUsage / 1000).toFixed(1)} MWh</span>
                </div>
                <div>
                  <span className="text-stone-400 dark:text-stone-500">Period</span>
                  <span className="ml-2 font-medium text-stone-900 dark:text-stone-100">{data.monthlyStats.length} months</span>
                </div>
                <div>
                  <span className="text-stone-400 dark:text-stone-500">Readings</span>
                  <span className="ml-2 font-medium text-stone-900 dark:text-stone-100">{data.records.length.toLocaleString()}</span>
                </div>
              </div>
              {!data.isDemo && (
                <button
                  onClick={handleReset}
                  className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 underline underline-offset-2"
                >
                  Analyze different file
                </button>
              )}
            </div>

            <CostComparison
              flatCost={data.flatCost}
              touCost={data.touCost}
              touSuperCost={data.touSuperCost}
              monthCount={data.monthlyStats.length}
              currentPlan={currentPlan}
              onCurrentPlanChange={setCurrentPlan}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PeakBreakdown
                peakUsage={data.peakUsage}
                offPeakUsage={data.offPeakUsage}
              />
              <WhatIfCalculator
                peakUsage={data.peakUsage}
                offPeakUsage={data.offPeakUsage}
                winterPeakUsage={data.winterPeakUsage}
                summerPeakUsage={data.summerPeakUsage}
                flatCost={data.flatCost}
                touCost={data.touCost}
                touSuperCost={data.touSuperCost}
                monthCount={data.monthlyStats.length}
                currentPlan={currentPlan}
              />
            </div>

            <UsageHeatmap hourlyAverages={data.hourlyAverages} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WeekdayComparison records={data.records} />
              <HighUsageDays records={data.records} weather={data.weather} />
            </div>

            <SeasonalComparison records={data.records} weather={data.weather} />

            <UsagePatterns records={data.records} weather={data.weather} />

            {nerdMode && <StatisticalInsights records={data.records} weather={data.weather} />}

            <MonthlyChart monthlyStats={data.monthlyStats} />
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-stone-200 dark:border-stone-800 text-xs text-stone-400 dark:text-stone-500 space-y-1">
          <p>Rates from PSE Electric Summary Sheet dated {RATE_EFFECTIVE_DATE}. Actual bills may include additional fees and taxes.</p>
          <p>This tool is not affiliated with, endorsed by, or connected to Puget Sound Energy in any way.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
