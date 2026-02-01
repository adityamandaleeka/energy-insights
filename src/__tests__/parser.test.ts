import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import { SAMPLE_CSV, EXPECTED_RESULTS } from '../__fixtures__/sampleData';
import { isPeakHour } from '../utils/rates';
import type { UsageRecord } from '../types';

// Helper to parse CSV string (mirrors parser.ts logic)
function parseCSVString(text: string): UsageRecord[] {
  const lines = text.split('\n');
  const headerIndex = lines.findIndex(line => line.startsWith('TYPE,'));
  const processedText = headerIndex !== -1 
    ? lines.slice(headerIndex).join('\n') 
    : text;
  
  const result = Papa.parse<{
    TYPE: string;
    DATE: string;
    'START TIME': string;
    'END TIME': string;
    'USAGE (kWh)': string;
  }>(processedText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .filter((row) => row.TYPE === 'Electric usage')
    .map((row) => ({
      type: row.TYPE,
      date: row.DATE,
      startTime: row['START TIME'],
      endTime: row['END TIME'],
      usage: parseFloat(row['USAGE (kWh)']) || 0,
    }));
}

// Helper to calculate peak/off-peak usage
function calculateUsageBreakdown(records: UsageRecord[]) {
  let totalUsage = 0;
  let peakUsage = 0;
  let offPeakUsage = 0;

  for (const record of records) {
    const date = new Date(record.date);
    const hour = parseInt(record.startTime.split(':')[0], 10);
    const dayOfWeek = date.getDay();
    const isPeak = isPeakHour(hour, dayOfWeek);

    totalUsage += record.usage;
    if (isPeak) {
      peakUsage += record.usage;
    } else {
      offPeakUsage += record.usage;
    }
  }

  return {
    totalUsage: Math.round(totalUsage * 100) / 100,
    peakUsage: Math.round(peakUsage * 100) / 100,
    offPeakUsage: Math.round(offPeakUsage * 100) / 100,
    recordCount: records.length,
  };
}

describe('CSV Parser', () => {
  it('parses sample CSV correctly', () => {
    const records = parseCSVString(SAMPLE_CSV);
    expect(records.length).toBe(EXPECTED_RESULTS.recordCount);
  });

  it('skips metadata header rows', () => {
    const records = parseCSVString(SAMPLE_CSV);
    // All records should be Electric usage type
    expect(records.every(r => r.type === 'Electric usage')).toBe(true);
  });

  it('parses usage values correctly', () => {
    const records = parseCSVString(SAMPLE_CSV);
    // First record should be 0.05 kWh
    expect(records[0].usage).toBe(0.05);
    // Peak morning records should be 0.20 kWh
    const peakRecord = records.find(r => r.startTime === '07:00');
    expect(peakRecord?.usage).toBe(0.20);
  });
});

describe('Usage breakdown calculation', () => {
  it('calculates total usage correctly', () => {
    const records = parseCSVString(SAMPLE_CSV);
    const breakdown = calculateUsageBreakdown(records);
    expect(breakdown.totalUsage).toBe(EXPECTED_RESULTS.totalUsage);
  });

  it('calculates peak usage correctly', () => {
    const records = parseCSVString(SAMPLE_CSV);
    const breakdown = calculateUsageBreakdown(records);
    expect(breakdown.peakUsage).toBe(EXPECTED_RESULTS.peakUsage);
  });

  it('calculates off-peak usage correctly', () => {
    const records = parseCSVString(SAMPLE_CSV);
    const breakdown = calculateUsageBreakdown(records);
    expect(breakdown.offPeakUsage).toBe(EXPECTED_RESULTS.offPeakUsage);
  });

  it('peak + off-peak equals total', () => {
    const records = parseCSVString(SAMPLE_CSV);
    const breakdown = calculateUsageBreakdown(records);
    expect(breakdown.peakUsage + breakdown.offPeakUsage).toBeCloseTo(breakdown.totalUsage, 2);
  });
});

describe('Regression snapshot', () => {
  it('matches expected results', () => {
    const records = parseCSVString(SAMPLE_CSV);
    const breakdown = calculateUsageBreakdown(records);
    
    // This test will fail if calculations change unexpectedly
    expect(breakdown).toEqual(EXPECTED_RESULTS);
  });
});
