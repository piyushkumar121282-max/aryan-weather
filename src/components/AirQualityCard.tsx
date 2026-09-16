import React from 'react';
import { Wind, ShieldAlert } from 'lucide-react';
import { AirQualityData } from '../types';
import { getAqiCategory } from '../utils/weatherCodes';

interface AirQualityCardProps {
  airQuality?: AirQualityData;
}

export const AirQualityCard: React.FC<AirQualityCardProps> = ({ airQuality }) => {
  if (!airQuality || (airQuality.usAqi === undefined && airQuality.europeanAqi === undefined)) {
    return null;
  }

  const aqiVal = airQuality.usAqi ?? airQuality.europeanAqi ?? 0;
  const aqiInfo = getAqiCategory(aqiVal);

  const pollutants = [
    { label: 'PM2.5', value: airQuality.pm25 !== undefined ? `${airQuality.pm25.toFixed(1)} µg/m³` : 'N/A' },
    { label: 'PM10', value: airQuality.pm10 !== undefined ? `${airQuality.pm10.toFixed(1)} µg/m³` : 'N/A' },
    { label: 'Ozone (O₃)', value: airQuality.ozone !== undefined ? `${airQuality.ozone.toFixed(1)} µg/m³` : 'N/A' },
    { label: 'NO₂', value: airQuality.nitrogenDioxide !== undefined ? `${airQuality.nitrogenDioxide.toFixed(1)} µg/m³` : 'N/A' },
  ];

  return (
    <div id="air-quality-card" className="w-full">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
        Air Quality Index (AQI)
      </h2>

      <div className="p-5 md:p-6 rounded-3xl bg-neutral-950 border border-neutral-850 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-950/40 text-emerald-400 border border-emerald-900/30">
              <Wind className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {Math.round(aqiVal)}
                </span>
                <span className="text-xs uppercase font-bold text-neutral-400">US AQI</span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${aqiInfo.colorClass}`}>
                  {aqiInfo.label}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-lg">
                {aqiInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* Pollutants grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-neutral-850">
          {pollutants.map((p) => (
            <div key={p.label} className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-[11px] text-neutral-400 block">{p.label}</span>
              <span className="text-sm font-semibold text-white">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
