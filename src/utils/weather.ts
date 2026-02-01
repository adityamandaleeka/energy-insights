// Weather data fetching using Open-Meteo (free, no API key needed)

export interface DailyWeather {
  date: string;
  tempMax: number; // Fahrenheit
  tempMin: number;
  tempMean: number;
}

// Zip code to approximate lat/long for PSE service area
// We can expand this or use a geocoding API for more precision
const ZIP_TO_COORDS: Record<string, { lat: number; lon: number }> = {
  // Common PSE area zip codes
  '98011': { lat: 47.76, lon: -122.21 }, // Bothell
  '98012': { lat: 47.84, lon: -122.23 }, // Bothell
  '98021': { lat: 47.79, lon: -122.24 }, // Bothell
  '98052': { lat: 47.68, lon: -122.12 }, // Redmond
  '98053': { lat: 47.68, lon: -122.02 }, // Redmond
  '98004': { lat: 47.62, lon: -122.21 }, // Bellevue
  '98005': { lat: 47.61, lon: -122.17 }, // Bellevue
  '98006': { lat: 47.55, lon: -122.15 }, // Bellevue
  '98007': { lat: 47.62, lon: -122.14 }, // Bellevue
  '98008': { lat: 47.61, lon: -122.10 }, // Bellevue
  '98033': { lat: 47.68, lon: -122.19 }, // Kirkland
  '98034': { lat: 47.72, lon: -122.21 }, // Kirkland
  '98101': { lat: 47.61, lon: -122.33 }, // Seattle
  '98103': { lat: 47.67, lon: -122.34 }, // Seattle
  '98105': { lat: 47.66, lon: -122.29 }, // Seattle
  '98115': { lat: 47.69, lon: -122.28 }, // Seattle
  '98122': { lat: 47.61, lon: -122.30 }, // Seattle
  '98125': { lat: 47.72, lon: -122.31 }, // Seattle
  '98133': { lat: 47.74, lon: -122.34 }, // Seattle
  '98155': { lat: 47.76, lon: -122.32 }, // Shoreline
  '98177': { lat: 47.76, lon: -122.37 }, // Seattle
  '98028': { lat: 47.76, lon: -122.25 }, // Kenmore
  '98072': { lat: 47.76, lon: -122.14 }, // Woodinville
  '98077': { lat: 47.74, lon: -122.05 }, // Woodinville
  '98074': { lat: 47.63, lon: -122.05 }, // Sammamish
  '98075': { lat: 47.59, lon: -122.04 }, // Sammamish
};

// Default to Seattle area if zip not found
const DEFAULT_COORDS = { lat: 47.61, lon: -122.33 };

export function extractZipCode(address: string): string | null {
  // Look for 5-digit zip code pattern
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

export function getCoordinates(zipCode: string): { lat: number; lon: number } {
  return ZIP_TO_COORDS[zipCode] || DEFAULT_COORDS;
}

export async function fetchWeatherData(
  zipCode: string,
  startDate: string,
  endDate: string
): Promise<DailyWeather[]> {
  const coords = getCoordinates(zipCode);
  
  // Open-Meteo historical weather API
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', coords.lat.toString());
  url.searchParams.set('longitude', coords.lon.toString());
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,temperature_2m_mean');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('timezone', 'America/Los_Angeles');
  
  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.daily || !data.daily.time) {
      return [];
    }
    
    const weather: DailyWeather[] = [];
    for (let i = 0; i < data.daily.time.length; i++) {
      weather.push({
        date: data.daily.time[i],
        tempMax: data.daily.temperature_2m_max[i],
        tempMin: data.daily.temperature_2m_min[i],
        tempMean: data.daily.temperature_2m_mean[i],
      });
    }
    
    return weather;
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    return [];
  }
}

// Calculate heating/cooling degree days
export function calculateDegreeDays(weather: DailyWeather[], baseTemp: number = 65): {
  heatingDegreeDays: number;
  coolingDegreeDays: number;
} {
  let heatingDegreeDays = 0;
  let coolingDegreeDays = 0;
  
  for (const day of weather) {
    if (day.tempMean < baseTemp) {
      heatingDegreeDays += baseTemp - day.tempMean;
    } else if (day.tempMean > baseTemp) {
      coolingDegreeDays += day.tempMean - baseTemp;
    }
  }
  
  return { heatingDegreeDays, coolingDegreeDays };
}
