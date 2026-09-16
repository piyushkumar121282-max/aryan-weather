import React from 'react';
import { ArrowDown, ArrowUp, RefreshCw, Clock } from 'lucide-react';
import { FullWeatherData, TempUnit } from '../types';
import { convertTemp } from '../services/weatherApi';
import { getWeatherCondition } from '../utils/weatherCodes';
import { WeatherIcon } from './WeatherIcon';

interface CurrentWeatherProps {
  weather: FullWeatherData;
  tempUnit: TempUnit;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const CurrentWeather: React.FC<CurrentWeatherProps> = ({
  weather,
  tempUnit,
  onRefresh,
  isRefreshing,
}) => {
  const { current, location, daily, timezone, lastUpdated } = weather;
  const condition = getWeatherCondition(current.weatherCode, current.isDay);

  const todayDaily = daily[0];
  const maxTemp = todayDaily ? convertTemp(todayDaily.temperatureMax, tempUnit) : convertTemp(current.temperature, tempUnit);
  const minTemp = todayDaily ? convertTemp(todayDaily.temperatureMin, tempUnit) : convertTemp(current.temperature, tempUnit);

  const tempVal = convertTemp(current.temperature, tempUnit);
  const feelsLikeVal = convertTemp(current.apparentTemperature, tempUnit);

  // Local time formatted for location's timezone
  const localTimeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());

  // Dynamic atmospheric tone styling (subtle, WCAG AA compliant, anti-slop)
  const getAtmosphericTone = () => {
    if (!current.isDay) {
      return 'from-slate-900/90 via-indigo-950/80 to-slate-900/90 border-indigo-900/30 text-white';
    }
    switch (condition.category) {
      case 'clear':
        return 'from-sky-500/10 via-amber-500/5 to-blue-500/10 border-sky-200/60 dark:border-sky-900/30 text-slate-900 dark:text-slate-100';
      case 'rain':
      case 'drizzle':
        return 'from-blue-600/10 via-slate-500/10 to-indigo-600/10 border-blue-200/60 dark:border-blue-900/30 text-slate-900 dark:text-slate-100';
      case 'snow':
        return 'from-cyan-500/10 via-sky-400/5 to-slate-400/10 border-cyan-200/60 dark:border-cyan-900/30 text-slate-900 dark:text-slate-100';
      case 'thunderstorm':
        return 'from-slate-700/15 via-purple-900/10 to-amber-600/10 border-purple-200/60 dark:border-purple-900/30 text-slate-900 dark:text-slate-100';
      default:
        return 'from-slate-500/10 via-slate-400/5 to-slate-600/10 border-slate-200/60 dark:border-slate-800 text-slate-900 dark:text-slate-100';
    }
  };

  return (
    <div
      id="current-weather-card"
      className={`relative w-full rounded-3xl p-6 md:p-8 bg-gradient-to-br ${getAtmosphericTone()} bg-neutral-950/80 backdrop-blur-xl border border-neutral-850 shadow-xl overflow-hidden transition-all duration-300 text-white`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Real-Time Weather</span>
          </div>
          <h1 id="current-location-title" className="text-2xl md:text-4xl font-bold tracking-tight text-white">
            {location.name}
          </h1>
          <p id="current-location-subtitle" className="text-sm md:text-base text-neutral-400 mt-0.5">
            {[location.admin1, location.country].filter(Boolean).join(', ')}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Local Time: {localTimeStr}</span>
          </div>
        </div>

        {/* Refresh & Last Updated Button */}
        <div className="flex flex-col items-end gap-1">
          <button
            id="btn-refresh-weather"
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-slate-200 hover:bg-neutral-800 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
            title="Refresh current meteorological data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
          <span className="text-[11px] text-neutral-400">
            Updated {lastUpdated}
          </span>
        </div>
      </div>

      {/* Main Temperature & Weather State Display */}
      <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3.5 rounded-2xl bg-neutral-900/90 shadow-xs border border-neutral-800 shrink-0">
            <WeatherIcon name={condition.iconName} className="w-16 h-16 md:w-20 md:h-20" />
          </div>
          <div>
            <div className="flex items-baseline">
              <span id="current-temperature-value" className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-none">
                {tempVal}
              </span>
              <span className="text-2xl md:text-3xl font-semibold text-slate-500 dark:text-slate-400 ml-1">
                °{tempUnit}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span>Feels like <strong>{feelsLikeVal}°{tempUnit}</strong></span>
              <span>•</span>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="inline-flex items-center text-rose-600 dark:text-rose-400">
                  <ArrowUp className="w-3.5 h-3.5" /> {maxTemp}°
                </span>
                <span className="inline-flex items-center text-sky-600 dark:text-sky-400">
                  <ArrowDown className="w-3.5 h-3.5" /> {minTemp}°
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Condition details badge */}
        <div className="md:text-right max-w-xs">
          <div id="current-condition-label" className="text-xl md:text-2xl font-bold tracking-tight">
            {condition.label}
          </div>
          <p id="current-condition-desc" className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {condition.description}
          </p>
        </div>
      </div>
    </div>
  );
};
