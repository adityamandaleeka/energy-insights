import { describe, it, expect } from 'vitest';
import { 
  extractZipCode, 
  getCoordinates, 
  calculateDegreeDays,
} from '../utils/weather';
import type { DailyWeather } from '../utils/weather';

describe('extractZipCode', () => {
  it('extracts 5-digit zip from typical address', () => {
    expect(extractZipCode('123 Main St, Seattle WA 98101')).toBe('98101');
  });

  it('extracts zip with ZIP+4 format', () => {
    expect(extractZipCode('456 Oak Ave, Bellevue WA 98004-1234')).toBe('98004');
  });

  it('handles address with zip at end', () => {
    expect(extractZipCode('789 Pine Rd, Redmond, WA 98052')).toBe('98052');
  });

  it('handles quoted address from CSV', () => {
    expect(extractZipCode('"123 Example St, Bothell, WA 98011"')).toBe('98011');
  });

  it('returns null for address without zip', () => {
    expect(extractZipCode('123 Main St, Seattle WA')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractZipCode('')).toBeNull();
  });
});

describe('getCoordinates', () => {
  it('returns coordinates for known zip code', () => {
    const coords = getCoordinates('98052'); // Redmond
    expect(coords.lat).toBeCloseTo(47.68, 1);
    expect(coords.lon).toBeCloseTo(-122.12, 1);
  });

  it('returns default Seattle coords for unknown zip', () => {
    const coords = getCoordinates('99999');
    expect(coords.lat).toBeCloseTo(47.61, 1);
    expect(coords.lon).toBeCloseTo(-122.33, 1);
  });

  it('handles empty string with default coords', () => {
    const coords = getCoordinates('');
    expect(coords.lat).toBeCloseTo(47.61, 1);
  });
});

describe('calculateDegreeDays', () => {
  const mockWeather: DailyWeather[] = [
    { date: '2025-01-15', tempMax: 45, tempMin: 35, tempMean: 40 }, // 25 HDD
    { date: '2025-01-16', tempMax: 50, tempMin: 40, tempMean: 45 }, // 20 HDD
    { date: '2025-07-15', tempMax: 85, tempMin: 65, tempMean: 75 }, // 10 CDD
    { date: '2025-07-16', tempMax: 90, tempMin: 70, tempMean: 80 }, // 15 CDD
    { date: '2025-05-15', tempMax: 68, tempMin: 58, tempMean: 65 }, // 0 (at base)
  ];

  it('calculates heating degree days correctly', () => {
    const result = calculateDegreeDays(mockWeather);
    expect(result.heatingDegreeDays).toBe(45); // 25 + 20
  });

  it('calculates cooling degree days correctly', () => {
    const result = calculateDegreeDays(mockWeather);
    expect(result.coolingDegreeDays).toBe(25); // 10 + 15
  });

  it('handles custom base temperature', () => {
    const result = calculateDegreeDays(mockWeather, 70);
    // At base 70: 40→30 HDD, 45→25 HDD, 75→5 CDD, 80→10 CDD, 65→5 HDD
    expect(result.heatingDegreeDays).toBe(60); // 30 + 25 + 5
    expect(result.coolingDegreeDays).toBe(15); // 5 + 10
  });

  it('handles empty weather array', () => {
    const result = calculateDegreeDays([]);
    expect(result.heatingDegreeDays).toBe(0);
    expect(result.coolingDegreeDays).toBe(0);
  });

  it('handles all cold days', () => {
    const coldWeather: DailyWeather[] = [
      { date: '2025-01-01', tempMax: 35, tempMin: 25, tempMean: 30 },
      { date: '2025-01-02', tempMax: 40, tempMin: 30, tempMean: 35 },
    ];
    const result = calculateDegreeDays(coldWeather);
    expect(result.heatingDegreeDays).toBe(65); // 35 + 30
    expect(result.coolingDegreeDays).toBe(0);
  });

  it('handles all hot days', () => {
    const hotWeather: DailyWeather[] = [
      { date: '2025-08-01', tempMax: 95, tempMin: 75, tempMean: 85 },
      { date: '2025-08-02', tempMax: 90, tempMin: 70, tempMean: 80 },
    ];
    const result = calculateDegreeDays(hotWeather);
    expect(result.heatingDegreeDays).toBe(0);
    expect(result.coolingDegreeDays).toBe(35); // 20 + 15
  });
});
