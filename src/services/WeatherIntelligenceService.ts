export interface WeatherDetails {
  temperature: number;
  condition: string;
  humidity: number;
  windKph: number;
  isDay: boolean;
  rainChance?: number;
  weatherRiskScore: number; // 0-100
  warnings: string[];
}

export class WeatherIntelligenceService {
  /**
   * Fetches weather data from the backend API and computes the risk score.
   */
  public static async fetchLiveWeather(lat: number, lng: number): Promise<WeatherDetails> {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
      if (!response.ok) {
        throw new Error(`Weather API returned status: ${response.status}`);
      }
      const data = await response.json();
      
      const condition = data.condition || data.weatherText || 'Clear';
      const temperature = data.temperature !== undefined ? data.temperature : (data.temp || 27);
      const humidity = data.humidity !== undefined ? data.humidity : 50;
      const windKph = data.windKph !== undefined ? data.windKph : (data.windSpeed || 10);
      const isDay = data.isDay !== undefined ? data.isDay : true;
      const rainChance = data.rainChance !== undefined ? data.rainChance : 0;

      // Compute Weather Risk Score (0-100)
      const riskBreakdown = this.calculateWeatherRisk(condition, windKph, humidity, rainChance);

      return {
        temperature,
        condition,
        humidity,
        windKph,
        isDay,
        rainChance,
        weatherRiskScore: riskBreakdown.score,
        warnings: riskBreakdown.warnings
      };
    } catch (error) {
      console.error('[WeatherIntelligenceService] Error fetching weather:', error);
      // Fallback
      return {
        temperature: 28,
        condition: 'Clear',
        humidity: 50,
        windKph: 12,
        isDay: true,
        rainChance: 0,
        weatherRiskScore: 5,
        warnings: []
      };
    }
  }

  /**
   * Evaluates the risk level based on weather parameters.
   */
  public static calculateWeatherRisk(
    condition: string,
    windKph: number,
    humidity: number,
    rainChance: number
  ): { score: number; warnings: string[] } {
    let score = 5; // Base risk
    const warnings: string[] = [];
    const cond = condition.toLowerCase();

    // Condition risk mapping
    if (cond.includes('clear') || cond.includes('sunny')) {
      score = 5;
    } else if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('mist') || cond.includes('haze') || cond.includes('fog')) {
      score = 25;
      if (cond.includes('fog')) {
        warnings.push('Low Visibility Warning: Reduced visibility due to fog.');
      }
    } else if (cond.includes('drizzle') || cond.includes('light rain')) {
      score = 45;
      warnings.push('Wet Roads Warning: Drizzle may cause slippery pavement.');
    } else if (cond.includes('heavy rain') || cond.includes('rain') || cond.includes('shower')) {
      score = 70;
      warnings.push('Hydroplaning Risk: Heavy rain detected. Drive slowly.');
    } else if (cond.includes('storm') || cond.includes('thunder') || cond.includes('monsoon') || cond.includes('extreme')) {
      score = 90;
      warnings.push('Monsoon Storm Alert: Flooding and strong wind hazards. Avoid non-essential travel.');
    }

    // Additional risk adjustments
    if (windKph > 35) {
      score += 10;
      warnings.push('High Winds Alert: Strong gusts. Keep firm vehicle grip.');
    }
    if (rainChance > 70 && !warnings.some(w => w.includes('Rain') || w.includes('Monsoon') || w.includes('Wet'))) {
      score += 5;
      warnings.push('High Precipitation Probability: Rain expected soon.');
    }
    if (humidity > 90 && score < 30) {
      score += 5;
    }

    return {
      score: Math.min(100, score),
      warnings
    };
  }
}
