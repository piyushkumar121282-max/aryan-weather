import React from 'react';
import {
  Droplets,
  Wind,
  Sun,
  Gauge,
  Cloud,
  CloudRain,
  Sunrise,
  Sunset,
  Compass,
} from 'lucide-react';
import { FullWeatherData, WindUnit } from '../types';
import { convertWind } from '../services/weatherApi';
import { getUvRiskLevel, getWindDirectionName } from '../utils/weatherCodes';

interface WeatherMetricsProps {
  weather: FullWeatherData;
  windUnit: WindUnit;
}

export const WeatherMetrics: React.FC<WeatherMetricsProps> = ({ weather, windUnit }) => {
  const { current, daily, timezone } = weather;
  const today = daily[0];

  const windObj = convertWind(current.windSpeed, windUnit);
  const gustObj = convertWind(current.windGusts, windUnit);
  const windDirName = getWindDirectionName(current.windDirection);
  const uvRisk = getUvRiskLevel(current.uvIndex);

  // Format sunrise and sunset
  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(isoString));
    } catch {
      return isoString.split('T')[1]?.slice(0, 5) || '--:--';
    }
  };

  const sunriseTime = formatTime(today?.sunrise);
  const sunsetTime = formatTime(today?.sunset);

  const metrics = [
    {
      id: 'metric-humidity',
      label: 'Humidity',
      value: `${current.relativeHumidity}%`,
      subtext: current.relativeHumidity > 70 ? 'High humidity' : current.relativeHumidity < 30 ? 'Dry air' : 'Comfortable',
      icon: Droplets,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      id: 'metric-wind',
      label: 'Wind',
      value: `${windObj.value} ${windObj.unit}`,
      subtext: `${windDirName} (${current.windDirection}°) • Gusts ${gustObj.value} ${gustObj.unit}`,
      icon: Wind,
      iconColor: 'text-teal-500',
      bgColor: 'bg-teal-50 dark:bg-teal-950/30',
      extraIcon: (
        <Compass
          className="w-4 h-4 text-teal-600 dark:text-teal-400 transition-transform duration-500"
          style={{ transform: `rotate(${current.windDirection}deg)` }}
        />
      ),
    },
    {
      id: 'metric-uv',
      label: 'UV Index',
      value: `${current.uvIndex.toFixed(1)}`,
      badge: uvRisk.label,
      badgeColor: uvRisk.colorClass,
      subtext: uvRisk.advice,
      icon: Sun,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      id: 'metric-pressure',
      label: 'Pressure',
      value: `${Math.round(current.pressureMsl)} hPa`,
      subtext: current.pressureMsl >= 1013 ? 'High pressure (stable)' : 'Low pressure (unsettled)',
      icon: Gauge,
      iconColor: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    },
    {
      id: 'metric-cloud-cover',
      label: 'Cloud Cover',
      value: `${current.cloudCover}%`,
      subtext: current.cloudCover < 20 ? 'Mostly sunny' : current.cloudCover > 80 ? 'Heavy cloud deck' : 'Scattered clouds',
      icon: Cloud,
      iconColor: 'text-slate-500',
      bgColor: 'bg-slate-100 dark:bg-slate-800/50',
    },
    {
      id: 'metric-precipitation',
      label: 'Precipitation',
      value: `${current.precipitation} mm`,
      subtext: today?.precipitationProbabilityMax !== undefined ? `${today.precipitationProbabilityMax}% chance today` : 'Real-time sensor',
      icon: CloudRain,
      iconColor: 'text-cyan-500',
      bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    },
  ];

  return (
    <div id="weather-metrics-section" className="w-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
        Current Meteorological Conditions
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              id={m.id}
              className="p-4 rounded-2xl bg-neutral-950 border border-neutral-850 shadow-2xs flex flex-col justify-between hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-400">
                  {m.label}
                </span>
                <div className={`p-1.5 rounded-lg ${m.bgColor}`}>
                  <Icon className={`w-4 h-4 ${m.iconColor}`} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-white tracking-tight">
                    {m.value}
                  </span>
                  {m.badge && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${m.badgeColor}`}>
                      {m.badge}
                    </span>
                  )}
                  {m.extraIcon && <div className="ml-auto">{m.extraIcon}</div>}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
                  {m.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sunrise & Sunset Banner */}
      <div id="sun-cycle-card" className="mt-3 grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-850 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-900/30">
            <Sunrise className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-400">Sunrise</div>
            <div className="text-sm md:text-base font-bold text-white">{sunriseTime}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-850 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-950/40 text-orange-400 border border-orange-900/30">
            <Sunset className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-400">Sunset</div>
            <div className="text-sm md:text-base font-bold text-white">{sunsetTime}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
