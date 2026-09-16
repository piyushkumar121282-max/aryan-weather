import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  MapPin,
  Play,
  Compass,
  CornerDownLeft,
  Power,
  Command,
} from 'lucide-react';
import { GeoLocation, FullWeatherData, TempUnit, WindUnit } from '../types';
import { getWeatherCondition } from '../utils/weatherCodes';
import { searchLocations } from '../services/weatherApi';
import { runningAudioPlayer } from '../services/runningAudio';

interface SiriVoiceControlProps {
  currentLocation: GeoLocation;
  weather: FullWeatherData | null;
  tempUnit: TempUnit;
  windUnit: WindUnit;
  onUseCurrentLocation: () => void;
  onSelectLocation: (loc: GeoLocation) => void;
  onToggleAtmosphere?: () => void;
  onTempUnitChange: (unit: TempUnit) => void;
  isLocating?: boolean;
}

// Siri Dual-Chime Sound Generator using Web Audio API
function playSiriChime(type: 'open' | 'close' | 'done') {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.connect(ctx.destination);

    if (type === 'open') {
      // Siri awake double beep: high crisp ascending chime
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.09); // A4 -> D5

      osc2.frequency.setValueAtTime(587.33, now + 0.09);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.22); // D5 -> A5

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);

      osc1.start(now);
      osc1.stop(now + 0.1);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.25);
    } else {
      // Gentle confirmation descent
      osc1.frequency.setValueAtTime(783.99, now);
      osc1.frequency.exponentialRampToValueAtTime(523.25, now + 0.18);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc1.start(now);
      osc1.stop(now + 0.22);
    }
  } catch (e) {
    // Audio contexts might be blocked until user gesture, safely ignore
  }
}

export const SiriVoiceControl: React.FC<SiriVoiceControlProps> = ({
  currentLocation,
  weather,
  tempUnit,
  windUnit,
  onUseCurrentLocation,
  onSelectLocation,
  onToggleAtmosphere,
  onTempUnitChange,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [siriResponse, setSiriResponse] = useState<string>(
    'Hi, I am Siri. Ask me for the weather at your current location, search any city, or control your running music.'
  );
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [, setIsRecognizingSupported] = useState<boolean>(true);

  // Power button hold state (2 seconds hold gesture on mobile)
  const [powerHoldProgress, setPowerHoldProgress] = useState<number>(0);
  const [isHoldingPower, setIsHoldingPower] = useState<boolean>(false);
  const [powerHoldTip, setPowerHoldTip] = useState<string | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const holdStartTimeRef = useRef<number>(0);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isRecognitionActiveRef = useRef<boolean>(false);
  const handleVoiceCommandRef = useRef<((cmd: string) => Promise<void>) | null>(null);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Siri Speech Speak helper
  const speakText = useCallback(
    (text: string) => {
      if (voiceMuted || !synthRef.current) return;

      try {
        synthRef.current.cancel(); // Stop any pending speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.02;
        utterance.pitch = 1.05;

        // Prefer high-quality natural voices if available
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Siri') ||
              v.name.includes('Samantha') ||
              v.name.includes('Karen') ||
              v.name.includes('Google US English') ||
              v.name.includes('Natural'))
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    },
    [voiceMuted]
  );

  // Process Voice or Typed Command
  const handleVoiceCommand = useCallback(
    async (rawCommand: string) => {
      const text = rawCommand.toLowerCase().trim();
      if (!text) return;

      if (recognitionRef.current && isRecognitionActiveRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          try {
            recognitionRef.current.abort();
          } catch (err) {}
        }
      }
      isRecognitionActiveRef.current = false;
      setIsListening(false);
      playSiriChime('done');

      // 1. Current Location Weather queries
      if (
        text.includes('current location') ||
        text.includes('here') ||
        text.includes('my location') ||
        text.includes('where i am') ||
        text.includes('where am i') ||
        text.includes('what is the weather') ||
        text.includes("what's the weather") ||
        text.includes('how is the weather') ||
        text.includes('forecast today') ||
        text.includes('temperature right now')
      ) {
        setSiriResponse(`Detecting GPS and fetching live weather for your current location...`);
        onUseCurrentLocation();

        // Read current location weather once loaded or available
        setTimeout(() => {
          if (weather) {
            const cond = getWeatherCondition(weather.current.weatherCode, weather.current.isDay);
            const tUnit = tempUnit === 'C' ? 'degrees Celsius' : 'degrees Fahrenheit';
            const wUnit =
              windUnit === 'km/h'
                ? 'kilometers per hour'
                : windUnit === 'mph'
                ? 'miles per hour'
                : 'meters per second';
            const response = `Currently in ${currentLocation.name}, it is ${weather.current.temperature} ${tUnit} and ${cond.label}, with wind speeds at ${weather.current.windSpeed} ${wUnit}.`;
            setSiriResponse(response);
            speakText(response);
          } else {
            const resp = 'Locating your current coordinates and retrieving real-time weather.';
            setSiriResponse(resp);
            speakText(resp);
          }
        }, 1500);
        return;
      }

      // 2. Weather in a specific city (e.g., "weather in Tokyo", "how is Paris")
      if (text.includes('weather in ') || text.includes('in ') || text.includes('temperature in ')) {
        const match = text
          .replace(/.*(?:weather in|in|temperature in|forecast for)\s+/i, '')
          .trim();
        if (match) {
          setSiriResponse(`Checking the weather for ${match}...`);
          try {
            const results = await searchLocations(match);
            if (results.length > 0) {
              const target = results[0];
              onSelectLocation(target);
              const resp = `Here is the current weather forecast for ${target.name}, ${target.country}.`;
              setSiriResponse(resp);
              speakText(resp);
            } else {
              const resp = `I couldn't find any location named "${match}". Try asking again with a city name.`;
              setSiriResponse(resp);
              speakText(resp);
            }
          } catch (e) {
            const resp = `Sorry, I encountered an issue searching for ${match}.`;
            setSiriResponse(resp);
            speakText(resp);
          }
          return;
        }
      }

      // 3. Running Music Controls
      if (
        text.includes('play music') ||
        text.includes('play song') ||
        text.includes('start running song') ||
        text.includes('start music') ||
        text.includes('play running track')
      ) {
        runningAudioPlayer.play();
        const track = runningAudioPlayer.getCurrentTrack();
        const resp = `Playing ${track.name} at ${track.tempoBpm} BPM.`;
        setSiriResponse(resp);
        speakText(resp);
        return;
      }

      if (
        text.includes('stop music') ||
        text.includes('pause music') ||
        text.includes('stop song') ||
        text.includes('pause song') ||
        text.includes('pause')
      ) {
        runningAudioPlayer.pause();
        const resp = 'Paused your running music.';
        setSiriResponse(resp);
        speakText(resp);
        return;
      }

      if (text.includes('next song') || text.includes('next track') || text.includes('skip')) {
        runningAudioPlayer.nextTrack();
        const track = runningAudioPlayer.getCurrentTrack();
        const resp = `Skipped to ${track.name}.`;
        setSiriResponse(resp);
        speakText(resp);
        return;
      }

      // 4. Units & Settings
      if (text.includes('fahrenheit')) {
        onTempUnitChange('F');
        const resp = 'Switched temperature units to Fahrenheit.';
        setSiriResponse(resp);
        speakText(resp);
        return;
      }

      if (text.includes('celsius')) {
        onTempUnitChange('C');
        const resp = 'Switched temperature units to Celsius.';
        setSiriResponse(resp);
        speakText(resp);
        return;
      }

      if (text.includes('atmosphere') || text.includes('rain effect') || text.includes('effects')) {
        if (onToggleAtmosphere) onToggleAtmosphere();
        const resp = 'Toggled realistic atmosphere visual simulation.';
        setSiriResponse(resp);
        speakText(resp);
        return;
      }

      // 5. Default Fallback
      const fallbackResp = `I heard "${rawCommand}". Try saying "What's the weather at current location?", "Weather in Tokyo", or "Play running song".`;
      setSiriResponse(fallbackResp);
      speakText(fallbackResp);
    },
    [currentLocation.name, onSelectLocation, onTempUnitChange, onToggleAtmosphere, onUseCurrentLocation, speakText, tempUnit, weather, windUnit]
  );

  // Keep latest handleVoiceCommand reference for recognition listener
  useEffect(() => {
    handleVoiceCommandRef.current = handleVoiceCommand;
  }, [handleVoiceCommand]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        try {
          recognitionRef.current.abort();
        } catch (err) {}
      }
    }
    isRecognitionActiveRef.current = false;
    setIsListening(false);
  }, []);

  // Initialize Speech Recognition once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsRecognizingSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isRecognitionActiveRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setTranscript(text);

        if (event.results[current].isFinal) {
          handleVoiceCommandRef.current?.(text);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        isRecognitionActiveRef.current = false;
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSiriResponse('Microphone access was denied. You can also type your command below.');
        } else if (event.error === 'no-speech') {
          setSiriResponse("I didn't hear anything. Tap the Siri orb and try again.");
        }
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition initialization error:', e);
      setIsRecognizingSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      isRecognitionActiveRef.current = false;
    };
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch (e) {}
    }
    playSiriChime('open');
    setTranscript('');
    setSiriResponse('Listening...');

    if (!recognitionRef.current) {
      setSiriResponse('Voice recognition is not supported in this browser. Please type your command.');
      return;
    }

    // Guard against calling start() when recognition is already active
    if (isRecognitionActiveRef.current) {
      return;
    }

    try {
      isRecognitionActiveRef.current = true;
      recognitionRef.current.start();
    } catch (err: any) {
      console.warn('Speech recognition start error safely handled:', err);
      if (err.name === 'InvalidStateError') {
        // Recognition was already started; synchronize state
        isRecognitionActiveRef.current = true;
        setIsListening(true);
      } else {
        isRecognitionActiveRef.current = false;
        setIsListening(false);
      }
    }
  }, []);

  const openSiri = useCallback(() => {
    setIsOpen(true);
    startListening();
  }, [startListening]);

  const closeSiri = useCallback(() => {
    setIsOpen(false);
    stopListening();
    if (synthRef.current) synthRef.current.cancel();
  }, [stopListening]);

  // Keyboard shortcut listener: Ctrl + V or Cmd + V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+V or Cmd+V
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        const target = e.target as HTMLElement;
        const isEditable =
          target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

        // If not actively typing in an input field, trigger Siri!
        if (!isEditable) {
          e.preventDefault();
          if (isOpen) {
            closeSiri();
          } else {
            openSiri();
          }
        }
      } else if (e.key === 'Escape' && isOpen) {
        closeSiri();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSiri, isOpen, openSiri]);

  // Handle Mobile Power Button 2-Second Long Press Gesture
  const handlePowerButtonDown = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsHoldingPower(true);
    setPowerHoldTip(null);
    holdStartTimeRef.current = Date.now();
    setPowerHoldProgress(0);

    // Provide light initial tactile bump
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(25);
      } catch (e) {}
    }

    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setPowerHoldProgress(progress);

      if (progress >= 100) {
        // Complete 2 seconds hold: trigger iPhone Siri!
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        setIsHoldingPower(false);
        setPowerHoldProgress(0);

        // Authentic iPhone Taptic double vibration feedback
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate([40, 50, 40]);
          } catch (e) {}
        }

        openSiri();
      }
    }, 30);
  };

  const handlePowerButtonUp = () => {
    if (!isHoldingPower) return;
    const elapsed = Date.now() - holdStartTimeRef.current;
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = null;
    setIsHoldingPower(false);
    setPowerHoldProgress(0);

    // If released before 2 seconds, show iPhone guide hint
    if (elapsed < 1900 && !isOpen) {
      setPowerHoldTip('Hold for 2 seconds to activate Siri (or press Ctrl+V)');
      setTimeout(() => setPowerHoldTip(null), 3000);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setTranscript(manualText);
    handleVoiceCommand(manualText);
    setManualText('');
  };

  return (
    <>
      {/* iOS 18 Siri Screen-Edge Iridescent Glowing Rim when Active */}
      {isOpen && (
        <div
          id="ios-siri-screen-glow"
          className="fixed inset-0 pointer-events-none z-40 transition-opacity duration-500 animate-pulse"
          style={{
            boxShadow:
              'inset 0 0 65px rgba(56, 189, 248, 0.45), inset 0 0 110px rgba(217, 70, 239, 0.35), inset 0 0 140px rgba(99, 102, 241, 0.35)',
          }}
        />
      )}

      {/* iPhone Side / Power Button Simulation (Right Screen Edge) */}
      <div
        id="iphone-power-button-container"
        className="fixed right-0 top-1/3 -translate-y-1/2 z-50 flex items-center select-none"
      >
        {/* Helper Tooltip on Touch/Hold */}
        {powerHoldTip && (
          <div className="absolute right-14 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-neutral-900/95 border border-neutral-700 text-slate-200 text-xs shadow-2xl backdrop-blur-md whitespace-nowrap animate-in fade-in zoom-in-95">
            {powerHoldTip}
          </div>
        )}

        {/* The Physical Button Simulation */}
        <div
          className="relative group flex items-center"
          title="iPhone Side Button: Press and hold for 2s to activate Siri (or Ctrl+V on PC)"
        >
          {/* Progress Ring Indicator while holding */}
          {isHoldingPower && (
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-neutral-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-cyan-400 transition-all"
                  strokeDasharray={`${powerHoldProgress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[9px] font-mono font-bold text-white">
                {Math.max(0, 2 - Math.floor((powerHoldProgress / 100) * 2))}s
              </span>
            </div>
          )}

          {/* Side button bar tab */}
          <button
            id="btn-iphone-power-hold"
            type="button"
            onMouseDown={handlePowerButtonDown}
            onMouseUp={handlePowerButtonUp}
            onMouseLeave={handlePowerButtonUp}
            onTouchStart={handlePowerButtonDown}
            onTouchEnd={handlePowerButtonUp}
            className={`w-3.5 h-16 sm:h-20 rounded-l-md transition-all flex items-center justify-center cursor-pointer shadow-lg active:scale-95 ${
              isHoldingPower
                ? 'bg-gradient-to-b from-cyan-400 via-fuchsia-500 to-indigo-500 shadow-cyan-500/50 scale-105 w-4'
                : 'bg-neutral-800 hover:bg-neutral-700 border-l border-y border-neutral-600'
            }`}
          >
            <Power className="w-2.5 h-2.5 text-neutral-400 rotate-90" />
          </button>
        </div>
      </div>

      {/* Floating Siri Trigger Pill (Bottom Right) with Keyboard Shortcut Badge */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        <button
          id="btn-siri-voice-trigger"
          type="button"
          onClick={() => (isOpen ? closeSiri() : openSiri())}
          className="relative group flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-black/90 text-white border border-neutral-700 shadow-2xl backdrop-blur-xl hover:border-cyan-500/70 transition-all active:scale-95"
          title="Siri Voice Control (Shortcut: Ctrl + V or hold side button for 2s)"
        >
          {/* Pulsing Siri glowing orb icon */}
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full blur-sm transition-all duration-700 ${
                isListening || isSpeaking
                  ? 'bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-indigo-500 animate-spin-slow opacity-100 scale-125'
                  : 'bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 opacity-70 group-hover:opacity-100'
              }`}
            />
            <div className="relative w-6 h-6 rounded-full bg-black flex items-center justify-center border border-white/20">
              <Mic
                className={`w-3.5 h-3.5 transition-colors ${
                  isListening ? 'text-cyan-400 animate-pulse' : 'text-white'
                }`}
              />
            </div>
          </div>

          <div className="flex flex-col text-left pr-1">
            <span className="text-xs font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-neutral-400 bg-clip-text text-transparent">
              Siri
            </span>
            <span className="text-[10px] text-neutral-400 font-medium flex items-center gap-1">
              <span className="px-1 py-0.2 rounded bg-neutral-800 text-[9px] font-mono text-cyan-300 border border-neutral-700">
                Ctrl+V
              </span>
            </span>
          </div>
        </button>
      </div>

      {/* iPhone Genuine Siri Pop-Up (Bottom Sheet / Floating Orb) */}
      {isOpen && (
        <div
          id="siri-iphone-popup-container"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSiri();
          }}
        >
          {/* Bottom Card / Floating Island */}
          <div className="w-full max-w-lg bg-neutral-950/95 border border-neutral-800/90 rounded-3xl sm:rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden text-slate-100 flex flex-col items-center text-center animate-in slide-in-from-bottom-6 duration-300">
            {/* Ambient Multi-color Glowing Halo */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-500/25 via-fuchsia-500/25 to-blue-600/25 blur-3xl pointer-events-none" />

            {/* iPhone Top Pull Bar Indicator */}
            <div className="w-12 h-1 rounded-full bg-neutral-700/80 mb-3 sm:hidden" />

            {/* Top Bar with Status & Shortcuts Hint */}
            <div className="w-full flex items-center justify-between mb-2 relative z-10">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-semibold text-neutral-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Siri Assistant</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 ml-1 rounded bg-neutral-800 text-[10px] font-mono text-neutral-400 border border-neutral-700">
                  Ctrl+V
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVoiceMuted(!voiceMuted)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                  title={voiceMuted ? 'Unmute voice' : 'Mute voice'}
                >
                  {voiceMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-neutral-300" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeSiri}
                  className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
                  title="Close Siri"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Center Animated iOS Siri Glowing Orb */}
            <div
              className="relative my-4 flex items-center justify-center cursor-pointer group"
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Click to stop listening' : 'Click to speak'}
            >
              {/* Outer pulsing chromatic aura */}
              <div
                className={`absolute w-36 h-36 rounded-full transition-all duration-1000 ${
                  isListening || isSpeaking
                    ? 'bg-gradient-to-tr from-cyan-500/40 via-fuchsia-500/40 to-blue-500/40 blur-xl animate-pulse'
                    : 'bg-blue-600/10 blur-lg'
                }`}
              />
              <div
                className={`w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-cyan-400 via-pink-500 via-indigo-500 to-blue-400 shadow-2xl transition-all duration-500 ${
                  isListening ? 'scale-110 rotate-180 animate-spin-slow' : 'group-hover:scale-105'
                }`}
              >
                <div className="w-full h-full rounded-full bg-neutral-950 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                  {/* Fluid sound wave bars if listening */}
                  {isListening ? (
                    <div className="flex items-center gap-1 h-8">
                      <span className="w-1.5 bg-cyan-400 rounded-full animate-bounce h-6" />
                      <span className="w-1.5 bg-pink-400 rounded-full animate-bounce delay-75 h-8" />
                      <span className="w-1.5 bg-indigo-400 rounded-full animate-bounce delay-150 h-5" />
                      <span className="w-1.5 bg-cyan-300 rounded-full animate-bounce delay-200 h-7" />
                    </div>
                  ) : (
                    <Mic className="w-9 h-9 text-white transition-colors group-hover:text-cyan-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Status & Live Transcription */}
            <div className="min-h-[64px] max-w-md my-1 flex flex-col items-center justify-center">
              {isListening ? (
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Listening for your voice...</span>
                </div>
              ) : null}

              {transcript ? (
                <p className="text-xs font-mono text-neutral-400 italic mt-1 px-4 truncate max-w-full">
                  "{transcript}"
                </p>
              ) : null}

              {/* Siri Spoken Response */}
              <div className="mt-1 text-sm md:text-base font-medium text-slate-100 leading-relaxed px-2">
                {siriResponse}
              </div>
            </div>

            {/* Quick Action Voice Buttons */}
            <div className="w-full mt-3 pt-3 border-t border-neutral-900 flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleVoiceCommand("what's the weather at current location")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-200 hover:text-white transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Current Location Weather</span>
              </button>

              <button
                type="button"
                onClick={() => handleVoiceCommand('play running song')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-200 hover:text-white transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Play Running Song</span>
              </button>

              <button
                type="button"
                onClick={() => handleVoiceCommand('weather in tokyo')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-200 hover:text-white transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>Weather in Tokyo</span>
              </button>
            </div>

            {/* Keyboard and Mobile Gesture Hint in Footer of Card */}
            <div className="w-full mt-2 text-[10px] text-neutral-500 flex items-center justify-center gap-3">
              <span className="flex items-center gap-1">
                <Command className="w-3 h-3 text-neutral-400" />
                <span>PC: Ctrl+V</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Power className="w-3 h-3 text-neutral-400" />
                <span>Mobile: Hold Side Button 2s</span>
              </span>
            </div>

            {/* Typed Fallback Input */}
            <form onSubmit={handleManualSubmit} className="w-full mt-3 flex items-center gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Or type a command (e.g., 'Weather at my location')"
                className="flex-1 px-4 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="p-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                title="Send command"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
