import React, { useState } from 'react';
import { Droplets, Wind, Sun, ChevronDown, ChevronUp } from 'lucide-react';
import { DailyForecastItem, TempUnit, WindUnit } from '../types';
import { convertTemp, convertWind } from '../services/weatherApi';
import { getWeatherCondition, getUvRiskLevel } from '../utils/weatherCodes';
import { WeatherIcon } from './WeatherIcon';

interface DailyForecastProps {
  daily: DailyForecastItem[];
  tempUnit: TempUnit;
  windUnit: WindUnit;
  timezone: string;
}

export const DailyForecast: React.FC<DailyForecastProps> = ({
  daily,
  tempUnit,
  windUnit,
  timezone,
}) => {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Calculate weekly overall min and max for proportional range bar
  const allMins = daily.map((d) => d.temperatureMin);
  const allMaxs = daily.map((d) => d.temperatureMax);
  const weekMin = Math.min(...allMins);
  const weekMax = Math.max(...allMaxs);
  const rangeSpan = Math.max(weekMax - weekMin, 1);

  const formatDay = (dateStr: string, index: number) => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    try {
      const d = new Date(dateStr + 'T12:00:00');
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T12:00:00');
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const toggleExpand = (dateStr: string) => {
    setExpandedDate((prev) => (prev === dateStr ? null : dateStr));
  };

  return (
    <div id="daily-forecast-section" className="w-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
        7-Day Extended Outlook
      </h2>

      <div className="bg-neutral-950 border border-neutral-850 rounded-3xl shadow-2xl divide-y divide-neutral-850/80 overflow-hidden text-slate-100">
        {daily.map((item, idx) => {
          const condition = getWeatherCondition(item.weatherCode, true);
          const minT = convertTemp(item.temperatureMin, tempUnit);
          const maxT = convertTemp(item.temperatureMax, tempUnit);
          const wind = convertWind(item.windSpeedMax, windUnit);
          const uvRisk = getUvRiskLevel(item.uvIndexMax);
          const isExpanded = expandedDate === item.date;

          // Bar positioning math
          const leftPercent = Math.max(0, ((item.temperatureMin - weekMin) / rangeSpan) * 100);
          const widthPercent = Math.max(8, ((item.temperatureMax - item.temperatureMin) / rangeSpan) * 100);

          return (
            <div
              key={item.date}
              id={`daily-row-${idx}`}
              className={`transition-all duration-200 ${
                isExpanded ? 'bg-neutral-900/90' : 'hover:bg-neutral-900/40'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleExpand(item.date)}
                className={`w-full px-4 md:px-6 py-3.5 flex items-center justify-between text-left transition-colors ${
                  isExpanded ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-900/60'
                }`}
              >
                {/* Day and Date */}
                <div className="w-24 md:w-32 shrink-0 flex items-center gap-2">
                  {isExpanded && (
                    <span className="w-1.5 h-4 rounded-full bg-cyan-400 shrink-0 animate-pulse" />
                  )}
                  <div>
                    <div className={`font-semibold text-sm ${isExpanded ? 'text-white font-bold' : 'text-slate-100'}`}>
                      {formatDay(item.date, idx)}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {formatDateLabel(item.date)}
                    </div>
                  </div>
                </div>

                {/* Weather condition icon & summary */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 px-2">
                  <WeatherIcon name={condition.iconName} className="w-6 h-6 shrink-0" />
                  <span className="text-xs md:text-sm font-medium text-slate-300 truncate hidden sm:inline">
                    {condition.label}
                  </span>
                  {item.precipitationProbabilityMax > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-cyan-400 font-medium px-1.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 shrink-0">
                      <Droplets className="w-3 h-3" />
                      <span>{item.precipitationProbabilityMax}%</span>
                    </span>
                  )}
                </div>

                {/* Min/Max Temperature Bar */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
                  <span className="text-xs md:text-sm font-semibold text-neutral-400 w-8 text-right">
                    {minT}°
                  </span>

                  {/* Relative temperature horizontal bar */}
                  <div className="w-16 md:w-28 h-2 rounded-full bg-neutral-800 relative overflow-hidden hidden xs:block">
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-400"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs md:text-sm font-bold text-white w-8 text-left">
                    {maxT}°
                  </span>

                  <div className="text-neutral-400 ml-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {/* Detailed Breakdown when row clicked (Pure Black styling) */}
              {isExpanded && (
                <div className="px-4 md:px-6 pb-4 pt-2 bg-black/95 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs border-t border-neutral-850 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-slate-100 shadow-inner">
                    <Wind className="w-4 h-4 text-teal-400 shrink-0" />
                    <div>
                      <span className="text-neutral-400 block text-[10px] font-medium">Max Wind</span>
                      <span className="font-semibold text-white">{wind.value} {wind.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-slate-100 shadow-inner">
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-neutral-400 block text-[10px] font-medium">Max UV</span>
                      <span className="font-semibold text-white">{item.uvIndexMax.toFixed(1)} ({uvRisk.label})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-slate-100 shadow-inner">
                    <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <span className="text-neutral-400 block text-[10px] font-medium">Total Rain</span>
                      <span className="font-semibold text-white">{item.precipitationSum} mm</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-slate-100 shadow-inner">
                    <div className="w-4 h-4 rounded-full bg-blue-950 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0">
                      ≈
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[10px] font-medium">Feels Like</span>
                      <span className="font-semibold text-white">
                        {convertTemp(item.apparentTemperatureMin, tempUnit)}° / {convertTemp(item.apparentTemperatureMax, tempUnit)}°
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
