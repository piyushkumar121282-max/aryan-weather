// Web Audio API synthesizer for interactive running songs / atmospheric tracks
// Runs entirely client-side without external dependencies, buffering, or audio copyright issues

export interface TrackInfo {
  id: string;
  name: string;
  artist: string;
  tempoBpm: number;
  description: string;
  vibe: 'energetic' | 'chill' | 'ambient';
}

export const RUNNING_TRACKS: TrackInfo[] = [
  {
    id: 'cyber-pulse',
    name: 'Midnight Velocity (Run Pace 160)',
    artist: 'Aryan Synth Wave',
    tempoBpm: 160,
    description: 'Energetic electronic synth runner with driving kick bassline for active cadences',
    vibe: 'energetic',
  },
  {
    id: 'rainy-lofi',
    name: 'Atmospheric Rain Strides',
    artist: 'Aryan Ambient Audio',
    tempoBpm: 120,
    description: 'Warm atmospheric chillhop chords layered with soothing rainfall harmonics',
    vibe: 'chill',
  },
  {
    id: 'neon-horizon',
    name: 'Solar Sprint',
    artist: 'Aryan Electronic',
    tempoBpm: 140,
    description: 'Upbeat arpeggios and rhythmic hi-hat groove for steady distance runs',
    vibe: 'energetic',
  },
];

class RunningAudioPlayer {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentTrackId: string = RUNNING_TRACKS[0].id;
  private step: number = 0;
  private intervalId: number | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;
  private listeners: Set<() => void> = new Set();

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): TrackInfo {
    return RUNNING_TRACKS.find((t) => t.id === this.currentTrackId) || RUNNING_TRACKS[0];
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public selectTrack(trackId: string) {
    const track = RUNNING_TRACKS.find((t) => t.id === trackId);
    if (!track) return;
    this.currentTrackId = trackId;
    this.step = 0;
    if (this.isPlaying) {
      this.stopSchedule();
      this.startSchedule();
    }
    this.notify();
  }

  public nextTrack() {
    const currentIndex = RUNNING_TRACKS.findIndex((t) => t.id === this.currentTrackId);
    const nextIndex = (currentIndex + 1) % RUNNING_TRACKS.length;
    this.selectTrack(RUNNING_TRACKS[nextIndex].id);
  }

  public prevTrack() {
    const currentIndex = RUNNING_TRACKS.findIndex((t) => t.id === this.currentTrackId);
    const prevIndex = (currentIndex - 1 + RUNNING_TRACKS.length) % RUNNING_TRACKS.length;
    this.selectTrack(RUNNING_TRACKS[prevIndex].id);
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    this.isPlaying = true;
    this.startSchedule();
    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    this.stopSchedule();
    this.notify();
  }

  private stopSchedule() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private startSchedule() {
    this.stopSchedule();
    const track = this.getCurrentTrack();
    // 16th-note ticks
    const stepDurationMs = (60 / track.tempoBpm / 4) * 1000;

    this.intervalId = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return;
      this.playStep(this.step, track.id);
      this.step = (this.step + 1) % 64;
    }, stepDurationMs);
  }

  // Synthesize musical elements on the fly
  private playStep(step: number, trackId: string) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Track 1: Midnight Velocity (Energetic runner 160 BPM)
    if (trackId === 'cyber-pulse') {
      // 4-on-the-floor driving kick
      if (step % 4 === 0) {
        this.triggerKick(now, 150, 42, 0.22);
      }
      // Hi-hat on off-beats
      if (step % 2 === 1) {
        this.triggerHiHat(now, 0.04, 0.08);
      }
      // Snare / clap on beat 2 and 4 (step 4, 12, 20, etc.)
      if (step % 8 === 4) {
        this.triggerSnare(now, 0.15);
      }
      // Bassline note (A minor pentatonic: A, C, D, E, G)
      const bassNotes = [110, 110, 130.81, 110, 146.83, 110, 164.81, 130.81];
      const bassFreq = bassNotes[(step >> 1) % bassNotes.length];
      if (step % 2 === 0) {
        this.triggerSynthNote(now, bassFreq, 'sawtooth', 0.12, 0.12, 450);
      }
      // Arpeggiated lead melody every 4 bars
      const leadNotes = [440, 523.25, 659.25, 587.33, 440, 659.25, 783.99, 880];
      if (step % 4 === 2) {
        const leadFreq = leadNotes[Math.floor(step / 4) % leadNotes.length];
        this.triggerSynthNote(now, leadFreq, 'sine', 0.18, 0.08, 1200);
      }
    }

    // Track 2: Atmospheric Rain Strides (Chill 120 BPM)
    else if (trackId === 'rainy-lofi') {
      // Soft kick on beats 1 and 3 (step 0 and 8)
      if (step % 16 === 0 || step % 16 === 6) {
        this.triggerKick(now, 100, 36, 0.28);
      }
      // Soft brushed rimshot / snare on beat 2 & 4
      if (step % 8 === 4) {
        this.triggerSnare(now, 0.09, true);
      }
      // Warm chords (Fmaj7 -> Em7 -> Dm7 -> Cmaj7)
      if (step % 16 === 0) {
        const chordIndex = Math.floor(step / 16) % 4;
        const chordTones = [
          [174.61, 220.0, 261.63, 329.63], // Fmaj7
          [164.81, 196.0, 246.94, 293.66], // Em7
          [146.83, 174.61, 220.0, 261.63], // Dm7
          [130.81, 164.81, 196.0, 246.94], // Cmaj7
        ][chordIndex];

        chordTones.forEach((f) => {
          this.triggerWarmChordNote(now, f, 0.8, 0.05);
        });
      }
      // Subtle rainfall noise texture on background
      if (step % 8 === 0) {
        this.triggerRainSwish(now);
      }
    }

    // Track 3: Solar Sprint (140 BPM Upbeat run)
    else {
      // Steady pumping bass drum
      if (step % 4 === 0) {
        this.triggerKick(now, 130, 48, 0.2);
      }
      if (step % 4 === 2) {
        this.triggerSnare(now, 0.12);
      }
      if (step % 2 === 1) {
        this.triggerHiHat(now, 0.05, 0.1);
      }
      // Bright major synth arp
      const arpFreqs = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 261.63, 196.0];
      const noteFreq = arpFreqs[step % arpFreqs.length];
      this.triggerSynthNote(now, noteFreq, 'triangle', 0.15, 0.1, 900);
    }
  }

  // --- Sound Generators ---

  private triggerKick(time: number, startFreq: number, endFreq: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerSnare(time: number, duration: number, isSoft = false) {
    if (!this.ctx || !this.masterGain) return;

    // Noise buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isSoft ? 'lowpass' : 'highpass';
    filter.frequency.setValueAtTime(isSoft ? 1800 : 1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isSoft ? 0.15 : 0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  private triggerHiHat(time: number, duration: number, vol = 0.08) {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  private triggerSynthNote(time: number, freq: number, type: OscillatorType, duration: number, vol: number, cutoff: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerWarmChordNote(time: number, freq: number, duration: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerRainSwish(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const duration = 0.6;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.05;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + duration);
  }
}

export const runningAudioPlayer = new RunningAudioPlayer();
