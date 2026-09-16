import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Music,
  Flame,
  Activity,
  ListMusic,
} from 'lucide-react';
import { runningAudioPlayer, RUNNING_TRACKS, TrackInfo } from '../services/runningAudio';

export const RunningMusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(runningAudioPlayer.getIsPlaying());
  const [currentTrack, setCurrentTrack] = useState<TrackInfo>(runningAudioPlayer.getCurrentTrack());
  const [volume, setVolume] = useState<number>(runningAudioPlayer.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = runningAudioPlayer.subscribe(() => {
      setIsPlaying(runningAudioPlayer.getIsPlaying());
      setCurrentTrack(runningAudioPlayer.getCurrentTrack());
      setVolume(runningAudioPlayer.getVolume());
    });
    return unsubscribe;
  }, []);

  const handleTogglePlay = () => {
    runningAudioPlayer.togglePlay();
  };

  const handleNext = () => {
    runningAudioPlayer.nextTrack();
  };

  const handlePrev = () => {
    runningAudioPlayer.prevTrack();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0) setIsMuted(false);
    runningAudioPlayer.setVolume(val);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      runningAudioPlayer.setVolume(volume || 0.5);
    } else {
      setIsMuted(true);
      runningAudioPlayer.setVolume(0);
    }
  };

  return (
    <div
      id="running-music-player"
      className="w-full rounded-3xl bg-neutral-900 border border-neutral-800 p-4 md:p-5 shadow-2xl relative overflow-hidden"
    >
      {/* Subtle audio visualizer / glow indicator */}
      <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl from-blue-600/10 via-indigo-600/5 to-transparent pointer-events-none rounded-tr-3xl" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        {/* Track Details */}
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isPlaying
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              <Music className={`w-6 h-6 ${isPlaying ? 'animate-bounce' : ''}`} />
            </div>
            {isPlaying && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Flame className="w-3 h-3 text-blue-400" />
                Running Track
              </span>
              <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                {currentTrack.tempoBpm} BPM
              </span>
            </div>
            <h3 className="font-semibold text-base text-white truncate mt-0.5">
              {currentTrack.name}
            </h3>
            <p className="text-xs text-neutral-400 truncate">
              {currentTrack.artist} • {currentTrack.description}
            </p>
          </div>
        </div>

        {/* Playback Controls & Playlist Toggle */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
          {/* Previous */}
          <button
            type="button"
            onClick={handlePrev}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Previous Running Song"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
            title={isPlaying ? 'Pause Running Song' : 'Start Running Song'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={handleNext}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Next Running Song"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Volume slider */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-800">
            <button
              type="button"
              onClick={handleToggleMute}
              className="text-neutral-400 hover:text-white p-1 rounded-lg"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-18 md:w-24 h-1.5 accent-blue-500 bg-neutral-700 rounded-lg cursor-pointer"
              title="Volume control"
            />
          </div>

          {/* Playlist list toggle */}
          <button
            type="button"
            onClick={() => setShowPlaylist(!showPlaylist)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showPlaylist
                ? 'bg-neutral-800 text-blue-400 border-neutral-700'
                : 'text-neutral-400 hover:text-white border-neutral-800 hover:bg-neutral-800'
            }`}
            title="View Playlist"
          >
            <ListMusic className="w-4 h-4" />
            <span className="hidden lg:inline">Tracks</span>
          </button>
        </div>
      </div>

      {/* Expandable playlist selector */}
      {showPlaylist && (
        <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-1.5">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 px-1 mb-2">
            Select Cadence / Song
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {RUNNING_TRACKS.map((track) => {
              const isSelected = track.id === currentTrack.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => {
                    runningAudioPlayer.selectTrack(track.id);
                    if (!isPlaying) runningAudioPlayer.play();
                  }}
                  className={`text-left p-2.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-sm'
                      : 'bg-neutral-800/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{track.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-300">
                      {track.tempoBpm} BPM
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {track.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
