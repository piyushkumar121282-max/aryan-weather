import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X, Navigation } from 'lucide-react';
import { GeoLocation } from '../types';
import { searchLocations } from '../services/weatherApi';

interface SearchBarProps {
  onSelectLocation: (loc: GeoLocation) => void;
  onUseCurrentLocation: () => void;
  isLocating: boolean;
  currentCityName?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSelectLocation,
  onUseCurrentLocation,
  isLocating,
  currentCityName,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const list = await searchLocations(query);
        setResults(list);
        setIsOpen(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc: GeoLocation) => {
    onSelectLocation(loc);
    setQuery('');
    setIsOpen(false);
    setResults([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter' && query.trim().length >= 2) {
        // Trigger direct search if user presses enter
        searchLocations(query).then((items) => {
          if (items.length > 0) {
            handleSelect(items[0]);
          }
        });
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      } else if (results.length > 0) {
        handleSelect(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div id="weather-search-container" ref={dropdownRef} className="relative w-full max-w-2xl">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            id="location-search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={currentCityName ? `Search city or region (current: ${currentCityName})...` : "Search any city or location in the world..."}
            className="w-full pl-11 pr-10 py-3 bg-neutral-950/90 backdrop-blur-md border border-neutral-850 rounded-2xl text-white placeholder-neutral-500 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 shadow-sm transition-all"
            autoComplete="off"
          />
          {isLoading ? (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            </div>
          ) : query ? (
            <button
              id="clear-search-btn"
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-white transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        <button
          id="btn-use-my-location"
          type="button"
          onClick={onUseCurrentLocation}
          disabled={isLocating}
          title="Use current GPS location"
          className="flex items-center justify-center gap-1.5 px-3.5 py-3 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-slate-200 rounded-2xl text-sm font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <Navigation className="w-4 h-4 text-cyan-400" />
          )}
          <span className="hidden sm:inline">My Location</span>
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          id="location-search-results"
          className="absolute z-50 left-0 right-0 mt-2 bg-neutral-950/95 backdrop-blur-md rounded-2xl border border-neutral-800 shadow-2xl max-h-72 overflow-y-auto py-1 divide-y divide-neutral-850"
        >
          {results.length > 0 ? (
            results.map((item, idx) => (
              <button
                key={`${item.latitude}-${item.longitude}-${idx}`}
                id={`search-item-${idx}`}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                  selectedIndex === idx
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                    <span>{item.name}</span>
                    {item.countryCode && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                        {item.countryCode}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {[item.admin1, item.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              </button>
            ))
          ) : !isLoading && query.trim().length >= 2 ? (
            <div className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No matching locations found for "{query}". Try a different spelling.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
