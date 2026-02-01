import { describe, it, expect } from 'vitest';

// These are utility functions extracted for testing
// They mirror the logic in StatisticalInsights.tsx

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function calculateCV(stdDev: number, mean: number): number {
  if (mean === 0) return 0;
  return (stdDev / mean) * 100;
}

function calculateAutocorrelation(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < values.length - 1; i++) {
    numerator += (values[i] - mean) * (values[i + 1] - mean);
  }
  for (let i = 0; i < values.length; i++) {
    denominator += Math.pow(values[i] - mean, 2);
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function detectAnomalies(
  dailyTotals: { date: string; usage: number }[], 
  mean: number, 
  stdDev: number,
  threshold: number = 2.5
): { date: string; usage: number; zscore: number }[] {
  return dailyTotals
    .map(d => ({ ...d, zscore: stdDev === 0 ? 0 : (d.usage - mean) / stdDev }))
    .filter(d => Math.abs(d.zscore) > threshold);
}

describe('Statistical Calculations', () => {
  describe('calculateMean', () => {
    it('calculates mean of simple values', () => {
      expect(calculateMean([10, 20, 30])).toBe(20);
    });

    it('handles single value', () => {
      expect(calculateMean([42])).toBe(42);
    });

    it('handles empty array', () => {
      expect(calculateMean([])).toBe(0);
    });

    it('handles decimal values', () => {
      expect(calculateMean([1.5, 2.5, 3.0])).toBeCloseTo(2.333, 2);
    });
  });

  describe('calculateMedian', () => {
    it('calculates median of odd-length array', () => {
      expect(calculateMedian([1, 3, 5])).toBe(3);
    });

    it('calculates median of even-length array', () => {
      expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
    });

    it('handles unsorted input', () => {
      expect(calculateMedian([5, 1, 3, 4, 2])).toBe(3);
    });

    it('handles single value', () => {
      expect(calculateMedian([7])).toBe(7);
    });

    it('handles empty array', () => {
      expect(calculateMedian([])).toBe(0);
    });
  });

  describe('calculateStdDev', () => {
    it('calculates standard deviation', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const mean = calculateMean(values);
      expect(calculateStdDev(values, mean)).toBeCloseTo(2, 0);
    });

    it('returns 0 for identical values', () => {
      const values = [5, 5, 5, 5];
      expect(calculateStdDev(values, 5)).toBe(0);
    });

    it('handles empty array', () => {
      expect(calculateStdDev([], 0)).toBe(0);
    });
  });

  describe('calculateCV', () => {
    it('calculates coefficient of variation', () => {
      expect(calculateCV(10, 50)).toBe(20); // 10/50 * 100 = 20%
    });

    it('handles zero mean', () => {
      expect(calculateCV(5, 0)).toBe(0);
    });

    it('handles high variability', () => {
      expect(calculateCV(50, 50)).toBe(100); // 100% CV
    });
  });

  describe('calculateAutocorrelation', () => {
    it('detects strong positive autocorrelation', () => {
      // Gradually increasing values - should have positive autocorr
      const values = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      const mean = calculateMean(values);
      const autocorr = calculateAutocorrelation(values, mean);
      expect(autocorr).toBeGreaterThan(0.5);
    });

    it('detects low autocorrelation for random-like data', () => {
      // Alternating values
      const values = [10, 20, 10, 20, 10, 20, 10, 20];
      const mean = calculateMean(values);
      const autocorr = calculateAutocorrelation(values, mean);
      expect(autocorr).toBeLessThan(0);
    });

    it('handles constant values', () => {
      const values = [5, 5, 5, 5, 5];
      expect(calculateAutocorrelation(values, 5)).toBe(0);
    });

    it('handles empty array', () => {
      expect(calculateAutocorrelation([], 0)).toBe(0);
    });

    it('handles single value', () => {
      expect(calculateAutocorrelation([5], 5)).toBe(0);
    });
  });

  describe('detectAnomalies', () => {
    const baseData = [
      { date: '2025-01-01', usage: 20 },
      { date: '2025-01-02', usage: 22 },
      { date: '2025-01-03', usage: 18 },
      { date: '2025-01-04', usage: 21 },
      { date: '2025-01-05', usage: 19 },
      { date: '2025-01-06', usage: 20 },
      { date: '2025-01-07', usage: 60 }, // Anomaly - 3x normal
    ];
    
    const mean = 25.71; // Approx mean including anomaly
    const stdDev = 14.14; // Approx std dev

    it('detects high usage anomaly', () => {
      const anomalies = detectAnomalies(baseData, mean, stdDev, 2.0);
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].date).toBe('2025-01-07');
    });

    it('respects threshold parameter', () => {
      // With strict threshold, may not find anomalies
      const strictAnomalies = detectAnomalies(baseData, mean, stdDev, 5.0);
      expect(strictAnomalies.length).toBe(0);
    });

    it('handles data with no anomalies', () => {
      const normalData = [
        { date: '2025-01-01', usage: 20 },
        { date: '2025-01-02', usage: 21 },
        { date: '2025-01-03', usage: 19 },
      ];
      const anomalies = detectAnomalies(normalData, 20, 1, 2.5);
      expect(anomalies.length).toBe(0);
    });

    it('handles zero standard deviation', () => {
      const constantData = [
        { date: '2025-01-01', usage: 20 },
        { date: '2025-01-02', usage: 20 },
      ];
      const anomalies = detectAnomalies(constantData, 20, 0);
      expect(anomalies.length).toBe(0);
    });
  });
});

describe('Weather Correlation Algorithm', () => {
  // Test the Pearson correlation calculation
  function calculatePearsonR(data: { temp: number; usage: number }[]): number {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = data.reduce((s, d) => s + d.temp, 0);
    const sumY = data.reduce((s, d) => s + d.usage, 0);
    const sumXY = data.reduce((s, d) => s + d.temp * d.usage, 0);
    const sumX2 = data.reduce((s, d) => s + d.temp * d.temp, 0);
    const sumY2 = data.reduce((s, d) => s + d.usage * d.usage, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  it('detects positive correlation (cooling load)', () => {
    // Hot days = more usage (AC)
    const data = [
      { temp: 60, usage: 20 },
      { temp: 70, usage: 25 },
      { temp: 80, usage: 35 },
      { temp: 90, usage: 45 },
    ];
    const r = calculatePearsonR(data);
    expect(r).toBeGreaterThan(0.9);
  });

  it('detects negative correlation (heating load)', () => {
    // Cold days = more usage (electric heat)
    const data = [
      { temp: 30, usage: 50 },
      { temp: 40, usage: 40 },
      { temp: 50, usage: 30 },
      { temp: 60, usage: 20 },
    ];
    const r = calculatePearsonR(data);
    expect(r).toBeLessThan(-0.9);
  });

  it('detects no correlation', () => {
    // Random relationship
    const data = [
      { temp: 50, usage: 30 },
      { temp: 60, usage: 25 },
      { temp: 70, usage: 35 },
      { temp: 80, usage: 20 },
    ];
    const r = calculatePearsonR(data);
    expect(Math.abs(r)).toBeLessThan(0.5);
  });

  it('handles constant temperature', () => {
    const data = [
      { temp: 70, usage: 20 },
      { temp: 70, usage: 30 },
      { temp: 70, usage: 25 },
    ];
    const r = calculatePearsonR(data);
    expect(r).toBe(0);
  });
});
