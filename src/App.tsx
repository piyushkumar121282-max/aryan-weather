import React, { useState, useEffect, useCallback } from 'react';
import {
  CloudSun,
  AlertCircle,
  RefreshCw,
  Sun,
  Moon,
  Bookmark,
  MapPin,
  Sparkles,
  Radio,
  Smartphone,
} from 'lucide-react';
import { GeoLocation, FullWeatherData, TempUnit, WindUnit } from './types';
import { fetchWeatherData, DEFAULT_CITIES } from './services/weatherApi';
import { SearchBar } from './components/SearchBar';
import { LocationChips } from './components/LocationChips';
import { CurrentWeather } from './components/CurrentWeather';
import { WeatherMetrics } from './components/WeatherMetrics';
import { HourlyForecast } from './components/HourlyForecast';
import { DailyForecast } from './components/DailyForecast';
import { AirQualityCard } from './components/AirQualityCard';
import { RealisticAtmosphere } from './components/RealisticAtmosphere';
import { WeatherRadarMap } from './components/WeatherRadarMap';
import { RunningMusicPlayer } from './components/RunningMusicPlayer';
import { SiriVoiceControl } from './components/SiriVoiceControl';
import { InstallAppModal } from './components/InstallAppModal';

const STORAGE_FAVS_KEY = 'aryan_weather_favorites';
const STORAGE_LOCATION_KEY = 'aryan_weather_last_location';
const STORAGE_TEMP_UNIT_KEY = 'aryan_weather_temp_unit';
const STORAGE_WIND_UNIT_KEY = 'aryan_weather_wind_unit';
const STORAGE_THEME_KEY = 'aryan_weather_theme';
const STORAGE_ATMOSPHERE_KEY = 'aryan_weather_atmosphere_fx';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState<GeoLocation>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LOCATION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_CITIES[0]; // Default: Tokyo
  });

  const [weather, setWeather] = useState<FullWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tempUnit, setTempUnit] = useState<TempUnit>(() => {
    return (localStorage.getItem(STORAGE_TEMP_UNIT_KEY) as TempUnit) || 'C';
  });

  const [windUnit, setWindUnit] = useState<WindUnit>(() => {
    return (localStorage.getItem(STORAGE_WIND_UNIT_KEY) as WindUnit) || 'km/h';
  });

  const [favorites, setFavorites] = useState<GeoLocation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FAVS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved) return saved === 'dark';
    return true; // Default to pure black dark mode
  });

  const [isRealisticAtmosphere, setIsRealisticAtmosphere] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_ATMOSPHERE_KEY);
    return saved !== 'false';
  });

  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  const handleToggleAtmosphere = () => {
    setIsRealisticAtmosphere((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_ATMOSPHERE_KEY, String(next));
      return next;
    });
  };

  // Apply dark mode class to root document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  // Load weather whenever location changes
  const loadWeather = useCallback(async (loc: GeoLocation, isSilentRefresh = false) => {
    if (isSilentRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const data = await fetchWeatherData(loc);
      setWeather(data);
      try {
        localStorage.setItem(STORAGE_LOCATION_KEY, JSON.stringify(loc));
      } catch (err) {
        console.error(err);
      }
    } catch (err: any) {
      console.error('Failed to load weather:', err);
      setErrorMessage(err.message || 'Unable to retrieve real-time weather data. Please verify your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(currentLocation);
  }, [currentLocation, loadWeather]);

  // Handle unit changes
  const handleTempUnitChange = (unit: TempUnit) => {
    setTempUnit(unit);
    localStorage.setItem(STORAGE_TEMP_UNIT_KEY, unit);
  };

  const handleWindUnitChange = (unit: WindUnit) => {
    setWindUnit(unit);
    localStorage.setItem(STORAGE_WIND_UNIT_KEY, unit);
  };

  // Toggle favorite location
  const handleToggleFavorite = (loc: GeoLocation) => {
    setFavorites((prev) => {
      const exists = prev.some(
        (f) => Math.abs(f.latitude - loc.latitude) < 0.05 && Math.abs(f.longitude - loc.longitude) < 0.05
      );
      let updated: GeoLocation[];
      if (exists) {
        updated = prev.filter(
          (f) => !(Math.abs(f.latitude - loc.latitude) < 0.05 && Math.abs(f.longitude - loc.longitude) < 0.05)
        );
      } else {
        updated = [...prev, loc];
      }
      try {
        localStorage.setItem(STORAGE_FAVS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // Use browser geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let detectedName = 'Current Location';
        let detectedCountry = '';

        try {
          // Attempt reverse geocoding via Open-Meteo or free nominatim
          const revRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            detectedName =
              revData.address?.city ||
              revData.address?.town ||
              revData.address?.village ||
              revData.address?.county ||
              'Current Location';
            detectedCountry = revData.address?.country || '';
          }
        } catch (e) {
          console.log('Reverse geocode fallback:', e);
        }

        const newLoc: GeoLocation = {
          name: detectedName,
          country: detectedCountry,
          latitude,
          longitude,
        };

        setCurrentLocation(newLoc);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage('Location permission was denied. You can still search for any city in the search bar.');
        } else {
          setErrorMessage('Unable to obtain your GPS coordinates. Please search manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 transition-colors selection:bg-blue-500 selection:text-white relative">
      {/* Realistic atmospheric simulation overlay */}
      {weather && <RealisticAtmosphere current={weather.current} enabled={isRealisticAtmosphere} />}

      {/* Top Navigation Bar */}
      <header id="app-header" className="sticky top-0 z-40 w-full bg-black/85 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">Aryan Weather</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 ml-1.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                Live
              </span>
            </div>
          </div>

          {/* Unit Switchers, Realistic Atmosphere Toggle, Siri, Install App, and Theme Toggle */}
          <div className="flex items-center gap-2">
            {/* Install App on Phone button */}
            <button
              id="btn-install-app-header"
              type="button"
              onClick={() => setIsInstallModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:text-white transition-all text-xs font-semibold shadow-2xs group"
              title="Install app on phone (PWA)"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden">Install</span>
            </button>

            {/* Siri Voice Control Quick Trigger */}
            <button
              id="btn-header-siri-trigger"
              type="button"
              onClick={() => {
                const btn = document.getElementById('btn-siri-voice-trigger');
                if (btn) btn.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900 text-slate-200 hover:text-white hover:border-cyan-500/50 transition-all text-xs font-semibold shadow-2xs group"
              title="Activate Siri Voice Control (Shortcut: Ctrl + V)"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-cyan-400 via-fuchsia-400 to-indigo-400 animate-pulse" />
              <span className="bg-gradient-to-r from-cyan-300 via-white to-pink-300 bg-clip-text text-transparent">
                Hey Siri
              </span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 rounded bg-neutral-800 text-[10px] font-mono text-cyan-300 border border-neutral-700 ml-0.5">
                Ctrl+V
              </kbd>
            </button>

            {/* Realistic Atmosphere Simulation Toggle */}
            <button
              id="btn-toggle-atmosphere-fx"
              type="button"
              onClick={handleToggleAtmosphere}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-2xs ${
                isRealisticAtmosphere
                  ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
              title={isRealisticAtmosphere ? 'Atmospheric FX: Enabled (Click to disable)' : 'Atmospheric FX: Disabled (Click to enable)'}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRealisticAtmosphere ? 'text-amber-400 animate-spin-slow' : ''}`} />
              <span className="hidden md:inline">Atmosphere FX</span>
            </button>

            {/* Temperature Unit Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold">
              <button
                id="btn-unit-c"
                type="button"
                onClick={() => handleTempUnitChange('C')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  tempUnit === 'C'
                    ? 'bg-black text-cyan-400 shadow-2xs border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                °C
              </button>
              <button
                id="btn-unit-f"
                type="button"
                onClick={() => handleTempUnitChange('F')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  tempUnit === 'F'
                    ? 'bg-black text-cyan-400 shadow-2xs border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                °F
              </button>
            </div>

            {/* Wind Unit Toggle */}
            <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold">
              <button
                id="btn-unit-kmh"
                type="button"
                onClick={() => handleWindUnitChange('km/h')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  windUnit === 'km/h'
                    ? 'bg-black text-cyan-400 shadow-2xs border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                km/h
              </button>
              <button
                id="btn-unit-mph"
                type="button"
                onClick={() => handleWindUnitChange('mph')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  windUnit === 'mph'
                    ? 'bg-black text-cyan-400 shadow-2xs border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                mph
              </button>
            </div>

            {/* Dark/Light mode toggle */}
            <button
              id="btn-theme-toggle"
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-slate-300 hover:bg-neutral-800 transition-colors shadow-2xs"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
        {/* Search Bar Section */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <SearchBar
            onSelectLocation={(loc) => setCurrentLocation(loc)}
            onUseCurrentLocation={handleUseCurrentLocation}
            isLocating={isLocating}
            currentCityName={currentLocation.name}
          />

          {/* Quick city presets & Saved favorites */}
          <LocationChips
            currentLocation={currentLocation}
            onSelectCity={(loc) => setCurrentLocation(loc)}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>

        {/* Saved Favorites List (if user saved any) */}
        {favorites.length > 0 && (
          <div id="favorites-bar" className="flex items-center gap-1.5 overflow-x-auto py-1 px-1">
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-500 mr-1 shrink-0">
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Places:</span>
            </div>
            {favorites.map((fav) => (
              <button
                key={`${fav.latitude}-${fav.longitude}`}
                type="button"
                onClick={() => setCurrentLocation(fav)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                  Math.abs(fav.latitude - currentLocation.latitude) < 0.05 &&
                  Math.abs(fav.longitude - currentLocation.longitude) < 0.05
                    ? 'bg-amber-500 text-black border-amber-500 font-semibold'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                <MapPin className="w-3 h-3" />
                <span>{fav.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div id="weather-error-alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-800 dark:text-rose-200">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div className="flex-1 text-sm">
              <span className="font-semibold block mb-0.5">Weather Information Alert</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => loadWeather(currentLocation)}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !weather ? (
          <div id="weather-loading-skeleton" className="w-full space-y-6 animate-pulse">
            <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800/60" />
              ))}
            </div>
            <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />
            <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800/60" />
          </div>
        ) : weather ? (
          <div className="space-y-6">
            {/* Hero Current Weather */}
            <CurrentWeather
              weather={weather}
              tempUnit={tempUnit}
              onRefresh={() => loadWeather(currentLocation, true)}
              isRefreshing={isRefreshing}
            />

            {/* Running Song & Cadence Audio Player */}
            <RunningMusicPlayer />

            {/* Key Meteorological Parameters Grid */}
            <WeatherMetrics weather={weather} windUnit={windUnit} />

            {/* 24-Hour Forecast */}
            <HourlyForecast
              hourly={weather.hourly}
              tempUnit={tempUnit}
              windUnit={windUnit}
              timezone={weather.timezone}
            />

            {/* Live Interactive Weather Radar & Storm Movement */}
            <WeatherRadarMap location={currentLocation} isDarkMode={isDarkMode} />

            {/* 7-Day Extended Forecast */}
            <DailyForecast
              daily={weather.daily}
              tempUnit={tempUnit}
              windUnit={windUnit}
              timezone={weather.timezone}
            />

            {/* Air Quality Index Card */}
            <AirQualityCard airQuality={weather.airQuality} />
          </div>
        ) : null}
      </main>

      {/* Siri Voice Control Assistant */}
      <SiriVoiceControl
        currentLocation={currentLocation}
        weather={weather}
        tempUnit={tempUnit}
        windUnit={windUnit}
        onUseCurrentLocation={handleUseCurrentLocation}
        onSelectLocation={setCurrentLocation}
        onToggleAtmosphere={handleToggleAtmosphere}
        onTempUnitChange={handleTempUnitChange}
        isLocating={isLocating}
      />

      {/* Phone PWA Installation Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}

