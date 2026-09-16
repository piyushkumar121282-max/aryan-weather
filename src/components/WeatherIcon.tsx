import React from 'react';
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Snowflake,
  LucideProps,
} from 'lucide-react';
import { WeatherConditionInfo } from '../utils/weatherCodes';

interface WeatherIconProps extends LucideProps {
  name: WeatherConditionInfo['iconName'] | string;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ name, className = 'w-6 h-6', ...props }) => {
  switch (name) {
    case 'Sun':
      return <Sun className={`${className} text-amber-500`} {...props} />;
    case 'Moon':
      return <Moon className={`${className} text-sky-200`} {...props} />;
    case 'CloudSun':
      return <CloudSun className={`${className} text-amber-400`} {...props} />;
    case 'CloudMoon':
      return <CloudMoon className={`${className} text-indigo-300`} {...props} />;
    case 'Cloud':
      return <Cloud className={`${className} text-slate-400`} {...props} />;
    case 'CloudFog':
      return <CloudFog className={`${className} text-slate-400`} {...props} />;
    case 'CloudDrizzle':
      return <CloudDrizzle className={`${className} text-sky-400`} {...props} />;
    case 'CloudRain':
      return <CloudRain className={`${className} text-blue-500`} {...props} />;
    case 'CloudSnow':
      return <CloudSnow className={`${className} text-cyan-300`} {...props} />;
    case 'CloudLightning':
      return <CloudLightning className={`${className} text-amber-500`} {...props} />;
    case 'Snowflake':
      return <Snowflake className={`${className} text-cyan-300`} {...props} />;
    default:
      return <Sun className={`${className} text-amber-500`} {...props} />;
  }
};
