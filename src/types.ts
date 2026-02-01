export interface UsageRecord {
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  usage: number;
  notes?: string;
}

export interface DailyUsage {
  date: string;
  totalUsage: number;
  peakUsage: number;
  offPeakUsage: number;
  hourlyUsage: number[];
}

export interface CostComparison {
  flatRate: number;
  touRate: number;
  savings: number;
  savingsPercent: number;
}

export interface HourlyAverage {
  hour: number;
  weekday: number;
  average: number;
}

export interface MonthlyStats {
  month: string;
  totalUsage: number;
  flatCost: number;
  touCost: number;
  peakUsage: number;
  offPeakUsage: number;
}
