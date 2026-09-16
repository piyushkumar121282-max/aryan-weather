import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Droplets } from 'lucide-react';
import { HourlyForecastItem, TempUnit, WindUnit } from '../types';
import { convertTemp, convertWind } from '../services/weatherApi';
import { getWeatherCondition } from '../utils/weatherCodes';
import { WeatherIcon } from './WeatherIcon';

interface HourlyForecastProps {
  hourly: HourlyForecastItem[];
  tempUnit: TempUnit;
  windUnit: WindUnit;
  timezone: string;
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({
  hourly,
  tempUnit,
  windUnit,
  timezone,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const formatHour = (isoString: string, index: number) => {
    if (index === 0) return 'Now';
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: true,
      }).format(new Date(isoString));
    } catch {
      return isoString.split('T')[1]?.slice(0, 5) || '';
    }
  };

  return (
    <div id="hourly-forecast-container" className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          24-Hour Forecast
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-slate-300 hover:bg-neutral-800 transition-colors shadow-2xs"
            title="Scroll earlier hours"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-slate-300 hover:bg-neutral-800 transition-colors shadow-2xs"
            title="Scroll later hours"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex items-stretch gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-700"
      >
        {hourly.map((item, idx) => {
          const condition = getWeatherCondition(item.weatherCode, item.isDay);
          const temp = convertTemp(item.temperature, tempUnit);
          const wind = convertWind(item.windSpeed, windUnit);
          const isCurrent = idx === 0;

          return (
            <div
              key={item.time}
              id={`hourly-item-${idx}`}
              className={`flex flex-col items-center justify-between p-3.5 rounded-2xl min-w-[96px] border text-center transition-all ${
                isCurrent
                  ? 'bg-cyan-950/40 border-cyan-700/60 shadow-xs'
                  : 'bg-neutral-950 border-neutral-850 shadow-2xs hover:border-neutral-700'
              }`}
            >
              {/* Hour time */}
              <span className={`text-xs font-semibold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {formatHour(item.time, idx)}
              </span>

              {/* Weather icon */}
              <div className="my-2.5">
                <WeatherIcon name={condition.iconName} className="w-7 h-7" />
              </div>

              {/* Temperature */}
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {temp}°
              </span>

              {/* Precipitation chance if present */}
              {item.precipitationProbability > 0 ? (
                <div className="flex items-center gap-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 mt-1">
                  <Droplets className="w-3 h-3" />
                  <span>{item.precipitationProbability}%</span>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  {wind.value} {wind.unit}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
