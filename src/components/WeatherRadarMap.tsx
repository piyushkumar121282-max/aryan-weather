import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Play, Pause, RotateCcw, Layers, MapPin, Radio, Compass } from 'lucide-react';
import { GeoLocation } from '../types';

interface WeatherRadarMapProps {
  location: GeoLocation;
  isDarkMode?: boolean;
}

interface RadarFrame {
  time: number;
  path: string;
}

export const WeatherRadarMap: React.FC<WeatherRadarMapProps> = ({ location, isDarkMode = false }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);

  const [radarFrames, setRadarFrames] = useState<RadarFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedLayer, setSelectedLayer] = useState<'radar' | 'satellite'>('radar');
  const [hostUrl, setHostUrl] = useState<string>('https://tilecache.rainviewer.com');
  const [isLoadingRadar, setIsLoadingRadar] = useState<boolean>(true);

  // 1. Fetch RainViewer public API for live radar timestamps
  useEffect(() => {
    let isMounted = true;
    async function fetchRadarData() {
      try {
        setIsLoadingRadar(true);
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!res.ok) throw new Error('Radar network error');
        const data = await res.json();
        if (!isMounted) return;

        if (data.host) setHostUrl(data.host);

        if (data.radar?.past && Array.isArray(data.radar.past)) {
          const frames: RadarFrame[] = data.radar.past;
          if (data.radar?.nowcast && Array.isArray(data.radar.nowcast)) {
            frames.push(...data.radar.nowcast);
          }
          setRadarFrames(frames);
          // Set to most recent past frame
          setCurrentFrameIndex(Math.max(0, (data.radar.past.length || 1) - 1));
        }
      } catch (e) {
        console.warn('Could not load live radar frames:', e);
      } finally {
        if (isMounted) setIsLoadingRadar(false);
      }
    }

    fetchRadarData();
    const interval = setInterval(fetchRadarData, 5 * 60 * 1000); // refresh every 5 min
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [location.latitude, location.longitude],
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
      });

      // Add clean zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Add Base Tile Layer (CartoDB Positron for light, DarkMatter for dark)
      const baseTileUrl = isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(baseTileUrl, {
        maxZoom: 18,
        subdomains: 'abcd',
      }).addTo(map);

      // Custom animated location marker
      const customIcon = L.divIcon({
        className: 'custom-location-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
            <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([location.latitude, location.longitude], {
        icon: customIcon,
      }).addTo(map);

      markerRef.current = marker;
      mapInstanceRef.current = map;
    } else {
      // Update location view & marker
      const map = mapInstanceRef.current;
      map.setView([location.latitude, location.longitude], 7, { animate: true });
      if (markerRef.current) {
        markerRef.current.setLatLng([location.latitude, location.longitude]);
      }
    }
  }, [location.latitude, location.longitude, isDarkMode]);

  // 3. Update Radar Overlay Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || radarFrames.length === 0) return;

    const frame = radarFrames[currentFrameIndex];
    if (!frame) return;

    // Remove existing radar layer
    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
    }

    // RainViewer radar URL schema: host + path + /256/{z}/{x}/{y}/2/1_1.png (or 1_0 smooth)
    const colorScheme = '2'; // standard meteorology rainbow
    const smooth = '1';
    const snow = '1';
    const tileUrl = `${hostUrl}${frame.path}/256/{z}/{x}/{y}/${colorScheme}/${smooth}_${snow}.png`;

    const radarLayer = L.tileLayer(tileUrl, {
      opacity: 0.75,
      zIndex: 10,
      maxZoom: 18,
    });

    radarLayer.addTo(map);
    radarLayerRef.current = radarLayer;
  }, [currentFrameIndex, radarFrames, hostUrl]);

  // 4. Animation loop for radar sweep
  useEffect(() => {
    if (!isPlaying || radarFrames.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % radarFrames.length);
    }, 850);

    return () => clearInterval(timer);
  }, [isPlaying, radarFrames.length]);

  const activeTimeStr =
    radarFrames[currentFrameIndex]?.time
      ? new Date(radarFrames[currentFrameIndex].time * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '--:--';

  return (
    <div id="weather-radar-section" className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Live Interactive Weather Radar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time Doppler precipitation sweep & atmospheric storm tracking
            </p>
          </div>
        </div>

        {/* Playback Controls & Frame Time */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            title={isPlaying ? 'Pause radar loop' : 'Play radar loop'}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-blue-600" /> : <Play className="w-4 h-4 text-slate-600" />}
          </button>

          <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200 min-w-[54px] text-center">
            {activeTimeStr}
          </span>

          {radarFrames.length > 0 && (
            <input
              type="range"
              min={0}
              max={radarFrames.length - 1}
              value={currentFrameIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentFrameIndex(Number(e.target.value));
              }}
              className="w-20 md:w-28 h-1.5 accent-blue-600 rounded-lg cursor-pointer bg-slate-200 dark:bg-slate-700"
              title="Drag timeline"
            />
          )}

          <button
            type="button"
            onClick={() => {
              setCurrentFrameIndex(radarFrames.length - 1);
              setIsPlaying(true);
            }}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"
            title="Jump to latest live radar frame"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-950">
        <div
          ref={mapContainerRef}
          id="leaflet-radar-map"
          className="w-full h-80 md:h-96 z-0"
          style={{ minHeight: '320px' }}
        />

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-medium border border-white/10 shadow-md pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Radar: {location.name}</span>
        </div>

        {/* Precipitation Scale Legend */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[400] bg-slate-900/85 backdrop-blur-md rounded-2xl px-3.5 py-2 text-white border border-white/10 shadow-lg text-xs pointer-events-none">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-semibold text-[11px] text-slate-300">Precipitation Intensity</span>
            <span className="text-[10px] text-slate-400">dBZ</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Light</span>
            <div className="h-2.5 w-36 sm:w-48 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 via-amber-400 via-rose-500 to-purple-600" />
            <span className="text-[10px] text-slate-400">Severe</span>
          </div>
        </div>
      </div>
    </div>
  );
};
