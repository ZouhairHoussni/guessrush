export type SoundEventName =
  | "button_click"
  | "ready_on"
  | "ready_off"
  | "card_added"
  | "card_deleted"
  | "duplicate_error"
  | "phase_change"
  | "turn_start"
  | "correct"
  | "skip"
  | "countdown_tick"
  | "countdown_warning"
  | "time_up"
  | "round_complete"
  | "leader_change"
  | "winner_reveal";

export type SoundRole = "player" | "host" | "display";

interface PlaySoundOptions {
  role?: SoundRole;
  volume?: number;
}

type SoundListener = (muted: boolean) => void;

const muteStorageKey = "guessrush:sound-muted";
const defaultVolume = 0.3;
const roleVolume: Record<SoundRole, number> = {
  player: 0.58,
  host: 0.82,
  display: 1,
};

function readStoredMute(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(muteStorageKey) === "true";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getAudioConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const audioWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return window.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

class SoundManager {
  private context: AudioContext | null = null;
  private fileSounds: Partial<Record<SoundEventName, string>> = {};
  private listeners = new Set<SoundListener>();
  private muted = readStoredMute();
  private unlocked = false;

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(muteStorageKey, String(muted));
    }
    this.listeners.forEach((listener) => listener(muted));
  }

  toggleMuted(): void {
    this.setMuted(!this.muted);
  }

  subscribe(listener: SoundListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  registerFileSound(eventName: SoundEventName, publicPath: string): void {
    this.fileSounds[eventName] = publicPath;
  }

  async unlock(): Promise<void> {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      await context.resume().catch(() => undefined);
    }
    this.unlocked = context.state === "running";
  }

  play(eventName: SoundEventName, options: PlaySoundOptions = {}): void {
    if (this.muted) {
      return;
    }

    const role = options.role ?? "player";
    const volume = clamp(defaultVolume * roleVolume[role] * (options.volume ?? 1), 0, 0.8);
    const fileSound = this.fileSounds[eventName];
    if (fileSound) {
      this.playFile(fileSound, volume, eventName);
      return;
    }

    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended" && !this.unlocked) {
      void context.resume().then(() => {
        this.unlocked = context.state === "running";
        this.playGenerated(context, eventName, volume);
      });
      return;
    }

    this.playGenerated(context, eventName, volume);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }
    const AudioConstructor = getAudioConstructor();
    if (!AudioConstructor) {
      return null;
    }
    this.context = new AudioConstructor();
    return this.context;
  }

  private playFile(publicPath: string, volume: number, fallback: SoundEventName): void {
    if (typeof Audio === "undefined") {
      const context = this.ensureContext();
      if (context) {
        this.playGenerated(context, fallback, volume);
      }
      return;
    }
    const audio = new Audio(publicPath);
    audio.volume = volume;
    void audio.play().catch(() => {
      const context = this.ensureContext();
      if (context) {
        this.playGenerated(context, fallback, volume);
      }
    });
  }

  private playGenerated(
    context: AudioContext,
    eventName: SoundEventName,
    volume: number,
  ): void {
    const start = context.currentTime + 0.006;
    switch (eventName) {
      case "button_click":
        this.tone(context, start, 220, 0.045, volume * 0.52, "triangle");
        break;
      case "ready_on":
        this.sequence(context, start, [523, 659], 0.07, volume * 0.62, "sine");
        break;
      case "ready_off":
        this.tone(context, start, 196, 0.06, volume * 0.42, "triangle");
        break;
      case "card_added":
        this.noise(context, start, 0.065, volume * 0.16);
        this.tone(context, start + 0.035, 392, 0.07, volume * 0.44, "triangle");
        break;
      case "card_deleted":
        this.tone(context, start, 180, 0.055, volume * 0.42, "triangle");
        break;
      case "duplicate_error":
        this.sequence(context, start, [120, 108], 0.075, volume * 0.42, "sawtooth");
        break;
      case "phase_change":
        this.sequence(context, start, [330, 494], 0.075, volume * 0.44, "sine");
        break;
      case "turn_start":
        this.sequence(context, start, [392, 523, 659], 0.055, volume * 0.54, "sine");
        break;
      case "correct":
        this.sequence(context, start, [659, 880], 0.075, volume * 0.68, "sine");
        break;
      case "skip":
        this.noise(context, start, 0.045, volume * 0.12);
        this.tone(context, start, 260, 0.055, volume * 0.35, "triangle");
        break;
      case "countdown_tick":
        this.tone(context, start, 760, 0.035, volume * 0.26, "square");
        break;
      case "countdown_warning":
        this.tone(context, start, 980, 0.04, volume * 0.34, "square");
        break;
      case "time_up":
        this.sequence(context, start, [196, 155], 0.12, volume * 0.52, "sawtooth");
        break;
      case "round_complete":
        this.sequence(context, start, [440, 554, 659, 880], 0.07, volume * 0.55, "sine");
        break;
      case "leader_change":
        this.sequence(context, start, [740, 988], 0.055, volume * 0.45, "sine");
        break;
      case "winner_reveal":
        this.sequence(context, start, [392, 523, 659, 784, 1046], 0.095, volume * 0.62, "sine");
        break;
    }
  }

  private sequence(
    context: AudioContext,
    start: number,
    frequencies: number[],
    stepDuration: number,
    gain: number,
    type: OscillatorType,
  ): void {
    frequencies.forEach((frequency, index) => {
      this.tone(context, start + index * stepDuration * 0.86, frequency, stepDuration, gain, type);
    });
  }

  private tone(
    context: AudioContext,
    start: number,
    frequency: number,
    duration: number,
    gain: number,
    type: OscillatorType,
  ): void {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }

  private noise(context: AudioContext, start: number, duration: number, gain: number): void {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      const envelope = 1 - index / frameCount;
      output[index] = (Math.random() * 2 - 1) * envelope;
    }
    const source = context.createBufferSource();
    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(gain, start);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.start(start);
    source.stop(start + duration);
  }
}

export const soundManager = new SoundManager();
