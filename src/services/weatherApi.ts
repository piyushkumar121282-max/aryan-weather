import {
  GeoLocation,
  FullWeatherData,
  CurrentWeatherData,
  HourlyForecastItem,
  DailyForecastItem,
  AirQualityData,
  TempUnit,
  WindUnit,
} from '../types';

export const DEFAULT_CITIES: GeoLocation[] = [
  { name: 'Tokyo', country: 'Japan', admin1: 'Tokyo', latitude: 35.6895, longitude: 139.6917, timezone: 'Asia/Tokyo' },
  { name: 'New York', country: 'United States', admin1: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { name: 'London', country: 'United Kingdom', admin1: 'England', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  { name: 'Paris', country: 'France', admin1: 'Île-de-France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { name: 'Dubai', country: 'United Arab Emirates', admin1: 'Dubai', latitude: 25.2048, longitude: 55.2708, timezone: 'Asia/Dubai' },
  { name: 'Sydney', country: 'Australia', admin1: 'New South Wales', latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { name: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore' },
  { name: 'Mumbai', country: 'India', admin1: 'Maharashtra', latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata' },
];

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=8&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Geocoding error: ${res.statusText}`);
    }
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((item: any) => ({
      id: item.id,
      name: item.name,
      country: item.country || '',
      countryCode: item.country_code,
      admin1: item.admin1 || '',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone || 'auto',
      elevation: item.elevation,
    }));
  } catch (err) {
    console.error('Failed to search locations:', err);
    return [];
  }
}

export async function fetchWeatherData(location: GeoLocation): Promise<FullWeatherData> {
  const { latitude, longitude } = location;

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&timezone=auto`;

  const [weatherRes, airRes] = await Promise.allSettled([
    fetch(weatherUrl).then((r) => {
      if (!r.ok) throw new Error(`Weather API error: ${r.statusText}`);
      return r.json();
    }),
    fetch(airQualityUrl).then((r) => {
      if (!r.ok) return null;
      return r.json();
    }),
  ]);

  if (weatherRes.status === 'rejected') {
    throw new Error(weatherRes.reason?.message || 'Failed to fetch weather data');
  }

  const wData = weatherRes.value;
  const current = wData.current || {};
  const hourly = wData.hourly || {};
  const daily = wData.daily || {};

  const currentObj: CurrentWeatherData = {
    time: current.time || new Date().toISOString(),
    temperature: current.temperature_2m ?? 0,
    apparentTemperature: current.apparent_temperature ?? current.temperature_2m ?? 0,
    relativeHumidity: current.relative_humidity_2m ?? 0,
    isDay: Boolean(current.is_day),
    precipitation: current.precipitation ?? 0,
    rain: current.rain ?? 0,
    showers: current.showers ?? 0,
    snowfall: current.snowfall ?? 0,
    weatherCode: current.weather_code ?? 0,
    cloudCover: current.cloud_cover ?? 0,
    pressureMsl: current.pressure_msl ?? 1013,
    surfacePressure: current.surface_pressure ?? 1013,
    windSpeed: current.wind_speed_10m ?? 0,
    windDirection: current.wind_direction_10m ?? 0,
    windGusts: current.wind_gusts_10m ?? 0,
    uvIndex: current.uv_index ?? 0,
  };

  // Hourly items (next 24-48 hours)
  const hourlyItems: HourlyForecastItem[] = [];
  if (Array.isArray(hourly.time)) {
    const nowTimeStr = current.time || new Date().toISOString();
    // Find index close to current time
    let startIndex = hourly.time.findIndex((t: string) => t >= nowTimeStr);
    if (startIndex < 0) startIndex = 0;
    // Take 24 hours starting from current time
    const endIndex = Math.min(startIndex + 24, hourly.time.length);

    for (let i = startIndex; i < endIndex; i++) {
      hourlyItems.push({
        time: hourly.time[i],
        timestamp: new Date(hourly.time[i]).getTime(),
        temperature: hourly.temperature_2m?.[i] ?? 0,
        apparentTemperature: hourly.apparent_temperature?.[i] ?? 0,
        relativeHumidity: hourly.relative_humidity_2m?.[i] ?? 0,
        precipitationProbability: hourly.precipitation_probability?.[i] ?? 0,
        precipitation: hourly.precipitation?.[i] ?? 0,
        weatherCode: hourly.weather_code?.[i] ?? 0,
        windSpeed: hourly.wind_speed_10m?.[i] ?? 0,
        uvIndex: hourly.uv_index?.[i] ?? 0,
        isDay: hourly.is_day?.[i] === 1,
      });
    }
  }

  // Daily items (7 days)
  const dailyItems: DailyForecastItem[] = [];
  if (Array.isArray(daily.time)) {
    for (let i = 0; i < daily.time.length && i < 7; i++) {
      dailyItems.push({
        date: daily.time[i],
        weatherCode: daily.weather_code?.[i] ?? 0,
        temperatureMax: daily.temperature_2m_max?.[i] ?? 0,
        temperatureMin: daily.temperature_2m_min?.[i] ?? 0,
        apparentTemperatureMax: daily.apparent_temperature_max?.[i] ?? 0,
        apparentTemperatureMin: daily.apparent_temperature_min?.[i] ?? 0,
        sunrise: daily.sunrise?.[i] ?? '',
        sunset: daily.sunset?.[i] ?? '',
        uvIndexMax: daily.uv_index_max?.[i] ?? 0,
        precipitationSum: daily.precipitation_sum?.[i] ?? 0,
        precipitationProbabilityMax: daily.precipitation_probability_max?.[i] ?? 0,
        windSpeedMax: daily.wind_speed_10m_max?.[i] ?? 0,
      });
    }
  }

  let airQuality: AirQualityData | undefined = undefined;
  if (airRes.status === 'fulfilled' && airRes.value && airRes.value.current) {
    const aCurr = airRes.value.current;
    airQuality = {
      usAqi: aCurr.us_aqi,
      europeanAqi: aCurr.european_aqi,
      pm25: aCurr.pm2_5,
      pm10: aCurr.pm10,
      carbonMonoxide: aCurr.carbon_monoxide,
      nitrogenDioxide: aCurr.nitrogen_dioxide,
      sulphurDioxide: aCurr.sulphur_dioxide,
      ozone: aCurr.ozone,
    };
  }

  return {
    location,
    current: currentObj,
    hourly: hourlyItems,
    daily: dailyItems,
    airQuality,
    timezone: wData.timezone || location.timezone || 'UTC',
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export function convertTemp(celsius: number, unit: TempUnit): number {
  if (unit === 'F') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

export function convertWind(kmh: number, unit: WindUnit): { value: number; unit: string } {
  if (unit === 'mph') {
    return { value: Math.round(kmh * 0.621371), unit: 'mph' };
  }
  if (unit === 'm/s') {
    return { value: Math.round((kmh / 3.6) * 10) / 10, unit: 'm/s' };
  }
  return { value: Math.round(kmh), unit: 'km/h' };
}
