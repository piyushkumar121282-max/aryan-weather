export interface WeatherConditionInfo {
  label: string;
  description: string;
  iconName:
    | 'Sun'
    | 'Moon'
    | 'CloudSun'
    | 'CloudMoon'
    | 'Cloud'
    | 'CloudFog'
    | 'CloudDrizzle'
    | 'CloudRain'
    | 'CloudSnow'
    | 'CloudLightning'
    | 'Snowflake';
  category: 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm';
}

export function getWeatherCondition(code: number, isDay: boolean = true): WeatherConditionInfo {
  switch (code) {
    case 0:
      return {
        label: isDay ? 'Sunny' : 'Clear Sky',
        description: isDay ? 'Bright, cloudless sky' : 'Crisp, clear starry night',
        iconName: isDay ? 'Sun' : 'Moon',
        category: 'clear',
      };
    case 1:
      return {
        label: isDay ? 'Mainly Sunny' : 'Mainly Clear',
        description: 'Isolated light clouds',
        iconName: isDay ? 'CloudSun' : 'CloudMoon',
        category: 'clear',
      };
    case 2:
      return {
        label: 'Partly Cloudy',
        description: 'Scattered clouds with sunshine intervals',
        iconName: isDay ? 'CloudSun' : 'CloudMoon',
        category: 'partly-cloudy',
      };
    case 3:
      return {
        label: 'Overcast',
        description: 'Solid dense cloud layer',
        iconName: 'Cloud',
        category: 'cloudy',
      };
    case 45:
      return {
        label: 'Foggy',
        description: 'Dense fog reducing visibility',
        iconName: 'CloudFog',
        category: 'fog',
      };
    case 48:
      return {
        label: 'Depositing Rime Fog',
        description: 'Icy mist and freezing fog',
        iconName: 'CloudFog',
        category: 'fog',
      };
    case 51:
      return {
        label: 'Light Drizzle',
        description: 'Gentle mist and fine precipitation',
        iconName: 'CloudDrizzle',
        category: 'drizzle',
      };
    case 53:
      return {
        label: 'Moderate Drizzle',
        description: 'Steady fine drizzle',
        iconName: 'CloudDrizzle',
        category: 'drizzle',
      };
    case 55:
      return {
        label: 'Dense Drizzle',
        description: 'Heavy drizzle with reduced visibility',
        iconName: 'CloudDrizzle',
        category: 'drizzle',
      };
    case 56:
    case 57:
      return {
        label: 'Freezing Drizzle',
        description: 'Freezing droplets with icy surfaces',
        iconName: 'Snowflake',
        category: 'snow',
      };
    case 61:
      return {
        label: 'Slight Rain',
        description: 'Light passing rain showers',
        iconName: 'CloudRain',
        category: 'rain',
      };
    case 63:
      return {
        label: 'Moderate Rain',
        description: 'Steady consistent rainfall',
        iconName: 'CloudRain',
        category: 'rain',
      };
    case 65:
      return {
        label: 'Heavy Rain',
        description: 'Substantial downpour and wet conditions',
        iconName: 'CloudRain',
        category: 'rain',
      };
    case 66:
    case 67:
      return {
        label: 'Freezing Rain',
        description: 'Sub-zero rain causing ice accumulation',
        iconName: 'CloudRain',
        category: 'rain',
      };
    case 71:
      return {
        label: 'Slight Snow Fall',
        description: 'Light flurries and dustings',
        iconName: 'CloudSnow',
        category: 'snow',
      };
    case 73:
      return {
        label: 'Moderate Snow',
        description: 'Steady snowfall accumulating on ground',
        iconName: 'Snowflake',
        category: 'snow',
      };
    case 75:
      return {
        label: 'Heavy Snow Fall',
        description: 'Intense snowfall and blizzard potential',
        iconName: 'Snowflake',
        category: 'snow',
      };
    case 77:
      return {
        label: 'Snow Grains',
        description: 'Fine frozen precipitation grains',
        iconName: 'Snowflake',
        category: 'snow',
      };
    case 80:
      return {
        label: 'Slight Rain Showers',
        description: 'Passing brief showers',
        iconName: 'CloudRain',
        category: 'rain',
      };
    case 81:
      return {
        label: 'Moderate Showers',
        description: 'Intermittent moderate showers',
        iconName: 'CloudRain',
        category: 'rain',
      };
    case 82:
      return {
        label: 'Violent Showers',
        description: 'Heavy sudden torrential rain burst',
        iconName: 'CloudRain',
        category: 'rain',
      };
    case 85:
      return {
        label: 'Slight Snow Showers',
        description: 'Scattered brief snow squalls',
        iconName: 'CloudSnow',
        category: 'snow',
      };
    case 86:
      return {
        label: 'Heavy Snow Showers',
        description: 'Strong gusty snow bursts',
        iconName: 'CloudSnow',
        category: 'snow',
      };
    case 95:
      return {
        label: 'Thunderstorm',
        description: 'Atmospheric storm with lightning and thunder',
        iconName: 'CloudLightning',
        category: 'thunderstorm',
      };
    case 96:
    case 99:
      return {
        label: 'Thunderstorm with Hail',
        description: 'Severe electrical storm accompanied by hail',
        iconName: 'CloudLightning',
        category: 'thunderstorm',
      };
    default:
      return {
        label: isDay ? 'Clear' : 'Clear Sky',
        description: 'Fair weather conditions',
        iconName: isDay ? 'Sun' : 'Moon',
        category: 'clear',
      };
  }
}

export function getUvRiskLevel(uvIndex: number): { label: string; colorClass: string; advice: string } {
  if (uvIndex < 3) {
    return { label: 'Low', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', advice: 'Minimal sun protection required.' };
  }
  if (uvIndex < 6) {
    return { label: 'Moderate', colorClass: 'text-amber-700 bg-amber-50 border-amber-200', advice: 'Wear sunglasses & SPF 30+ outside.' };
  }
  if (uvIndex < 8) {
    return { label: 'High', colorClass: 'text-orange-700 bg-orange-50 border-orange-200', advice: 'Protection required. Seek shade midday.' };
  }
  if (uvIndex < 11) {
    return { label: 'Very High', colorClass: 'text-rose-700 bg-rose-50 border-rose-200', advice: 'Extra protection needed. Avoid midday sun.' };
  }
  return { label: 'Extreme', colorClass: 'text-purple-700 bg-purple-50 border-purple-200', advice: 'Take full precautions. Avoid direct sun.' };
}

export function getAqiCategory(aqi: number): { label: string; colorClass: string; description: string } {
  if (aqi <= 50) {
    return { label: 'Good', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', description: 'Air quality is satisfactory with little or no risk.' };
  }
  if (aqi <= 100) {
    return { label: 'Moderate', colorClass: 'text-amber-700 bg-amber-50 border-amber-200', description: 'Acceptable; sensitive individuals should consider limiting prolonged outdoor exertion.' };
  }
  if (aqi <= 150) {
    return { label: 'Unhealthy for Sensitive Groups', colorClass: 'text-orange-700 bg-orange-50 border-orange-200', description: 'General public not likely affected, but sensitive groups may experience effects.' };
  }
  if (aqi <= 200) {
    return { label: 'Unhealthy', colorClass: 'text-rose-700 bg-rose-50 border-rose-200', description: 'Everyone may begin to experience health effects.' };
  }
  if (aqi <= 300) {
    return { label: 'Very Unhealthy', colorClass: 'text-purple-700 bg-purple-50 border-purple-200', description: 'Health alert: serious risk for the entire population.' };
  }
  return { label: 'Hazardous', colorClass: 'text-stone-800 bg-stone-100 border-stone-300', description: 'Emergency warning: active health hazards for all.' };
}

export function getWindDirectionName(degree: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degree % 360) / 22.5) % 16;
  return directions[index];
}
