import React from 'react';
import { Star, StarOff } from 'lucide-react';
import { GeoLocation } from '../types';
import { DEFAULT_CITIES } from '../services/weatherApi';

interface LocationChipsProps {
  currentLocation: GeoLocation;
  onSelectCity: (loc: GeoLocation) => void;
  favorites: GeoLocation[];
  onToggleFavorite: (loc: GeoLocation) => void;
}

export const LocationChips: React.FC<LocationChipsProps> = ({
  currentLocation,
  onSelectCity,
  favorites,
  onToggleFavorite,
}) => {
  const isCurrentFav = favorites.some(
    (f) =>
      Math.abs(f.latitude - currentLocation.latitude) < 0.05 &&
      Math.abs(f.longitude - currentLocation.longitude) < 0.05
  );

  return (
    <div id="location-quick-chips" className="w-full flex items-center justify-between gap-2 overflow-x-auto py-1 scrollbar-none">
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        <span className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mr-1 shrink-0">
          Popular:
        </span>
        {DEFAULT_CITIES.map((city) => {
          const isActive =
            Math.abs(city.latitude - currentLocation.latitude) < 0.05 &&
            Math.abs(city.longitude - currentLocation.longitude) < 0.05;

          return (
            <button
              key={city.name}
              id={`chip-${city.name.toLowerCase().replace(/\s+/g, '-')}`}
              type="button"
              onClick={() => onSelectCity(city)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                  : 'bg-neutral-900 text-slate-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      <button
        id="btn-toggle-favorite"
        type="button"
        onClick={() => onToggleFavorite(currentLocation)}
        title={isCurrentFav ? 'Remove from saved locations' : 'Save to favorite locations'}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors shrink-0 ${
          isCurrentFav
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
            : 'bg-neutral-900 text-slate-300 border-neutral-800 hover:text-amber-400 hover:bg-neutral-800'
        }`}
      >
        {isCurrentFav ? (
          <>
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Saved</span>
          </>
        ) : (
          <>
            <Star className="w-3.5 h-3.5" />
            <span>Save Location</span>
          </>
        )}
      </button>
    </div>
  );
};
