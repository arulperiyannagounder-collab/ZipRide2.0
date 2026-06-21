import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

console.log(
  '[WeatherService] WEATHER_API_KEY Loaded:',
  !!process.env.WEATHER_API_KEY
);

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

interface WeatherData {
  temp: number;
  weatherText: string;
  windSpeed: number;
  humidity: number;
  weatherMultiplier: number;
  weatherFactor: number;
  rainChance: number;
  temperature: number;
  condition: string;
  windKph: number;
  isDay: boolean;
}

interface WeatherCacheEntry {
  data: WeatherData;
  timestamp: number;
}

const weatherCache: Record<string, WeatherCacheEntry> = {};

const getCacheKey = (lat: number, lng: number) => {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
};

export const getWeatherData = async (lat: number, lng: number): Promise<WeatherData> => {
  const cacheKey = getCacheKey(lat, lng);
  const cached = weatherCache[cacheKey];

  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.data;
  }

  // Fallback defaults
  const fallback: WeatherData = {
    temp: 28,
    weatherText: 'Clear',
    windSpeed: 10,
    humidity: 55,
    weatherMultiplier: 1.0,
    weatherFactor: 0,
    rainChance: 0,
    temperature: 28,
    condition: 'Clear',
    windKph: 10,
    isDay: true
  };

  if (!WEATHER_API_KEY || WEATHER_API_KEY === 'YOUR_WEATHER_API_KEY' || WEATHER_API_KEY.includes('YOUR_')) {
    console.log('[WeatherService] Fetching real live weather using free Open-Meteo API...');
    try {
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&daily=precipitation_probability_max&forecast_days=1&timezone=auto`;
      const response = await fetch(openMeteoUrl);
      if (!response.ok) {
        throw new Error(`Open-Meteo responded with status ${response.status}`);
      }
      const data = await response.json();
      const current = data.current;
      const daily = data.daily;
      
      const temp = current?.temperature_2m ?? fallback.temp;
      const humidity = current?.relative_humidity_2m ?? fallback.humidity;
      const windSpeed = current?.wind_speed_10m ?? fallback.windSpeed;
      const isDay = current?.is_day === 1;
      const code = current?.weather_code ?? 0;
      const rainChance = daily?.precipitation_probability_max?.[0] ?? fallback.rainChance;

      // Map WMO codes to text and surcharges
      let weatherText = 'Clear';
      let weatherMultiplier = 1.0;
      let weatherFactor = 0;

      if (code === 0) {
        weatherText = 'Clear';
        weatherMultiplier = 1.0;
        weatherFactor = 0;
      } else if (code >= 1 && code <= 3) {
        weatherText = 'Cloudy';
        weatherMultiplier = 1.1;
        weatherFactor = 10;
      } else if (code >= 45 && code <= 48) {
        weatherText = 'Foggy';
        weatherMultiplier = 1.1;
        weatherFactor = 10;
      } else if (code >= 51 && code <= 55) {
        weatherText = 'Drizzle';
        weatherMultiplier = 1.15;
        weatherFactor = 15;
      } else if (code >= 61 && code <= 65) {
        weatherText = 'Rainy';
        weatherMultiplier = 1.25;
        weatherFactor = 30;
      } else if (code >= 80 && code <= 82) {
        weatherText = 'Heavy Rain';
        weatherMultiplier = 1.4;
        weatherFactor = 40;
      } else if (code >= 95 && code <= 99) {
        weatherText = 'Monsoon Storm';
        weatherMultiplier = 1.5;
        weatherFactor = 60;
      }

      const result: WeatherData = {
        temp,
        weatherText,
        windSpeed,
        humidity,
        weatherMultiplier,
        weatherFactor,
        rainChance,
        temperature: temp,
        condition: weatherText,
        windKph: windSpeed,
        isDay
      };

      weatherCache[cacheKey] = {
        data: result,
        timestamp: Date.now()
      };

      return result;
    } catch (openMeteoErr) {
      console.error('[WeatherService] Open-Meteo fallback fetch error:', openMeteoErr);
      return fallback;
    }
  }

  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lng}&days=1&aqi=no`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`WeatherAPI responded with status ${response.status}`);
    }
    const data = await response.json();
    
    const temp = data.current?.temp_c ?? fallback.temp;
    const weatherText = data.current?.condition?.text ?? fallback.weatherText;
    const windSpeed = data.current?.wind_kph ?? fallback.windSpeed;
    const humidity = data.current?.humidity ?? fallback.humidity;
    const rainChance = data.forecast?.forecastday?.[0]?.day?.daily_chance_of_rain ?? fallback.rainChance;
    const isDay = data.current?.is_day === 1;

    // Map weather conditions to surcharges and multipliers
    let weatherMultiplier = 1.0;
    let weatherFactor = 0; // Surcharge

    const wt = weatherText.toLowerCase();
    if (wt.includes('overcast') || wt.includes('cloud') || wt.includes('mist') || wt.includes('haze') || wt.includes('fog')) {
      weatherMultiplier = 1.1;
      weatherFactor = 10;
    } else if (wt.includes('heavy rain') || wt.includes('monsoon') || wt.includes('torrential')) {
      weatherMultiplier = 1.4;
      weatherFactor = 40;
    } else if (wt.includes('rain') || wt.includes('drizzle') || wt.includes('shower')) {
      weatherMultiplier = 1.25;
      weatherFactor = 30;
    } else if (wt.includes('storm') || wt.includes('thunder') || wt.includes('snow') || wt.includes('blizzard')) {
      weatherMultiplier = 1.5;
      weatherFactor = 60;
    }

    const result: WeatherData = {
      temp,
      weatherText,
      windSpeed,
      humidity,
      weatherMultiplier,
      weatherFactor,
      rainChance,
      temperature: temp,
      condition: weatherText,
      windKph: windSpeed,
      isDay
    };

    weatherCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    return result;
  } catch (err) {
    console.error('[WeatherService] Error retrieving weather details:', err);
    return fallback;
  }
};

