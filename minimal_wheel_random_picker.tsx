import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Shuffle,
  Trash2,
  Plus,
  Minus,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Download,
  Upload,
  HelpCircle,
  Info,
  X,
  RotateCw,
  Sparkles,
  Scale,
  List,
  AlignLeft,
  UserMinus,
  Maximize2,
  Minimize2,
  Trophy,
  History,
  Settings,
  Flame,
  Crown,
  Dices,
  Utensils,
  Check,
  Copy,
  PieChart,
  Volume1,
  Music,
  Share2
} from 'lucide-react';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export interface WheelEntry {
  id: string;
  label: string;
  weight: number;
}

export type WeightMode = 'equal' | 'weighted';
export type EditorTab = 'text' | 'items' | 'history' | 'stats';
export type ThemeMode = 'light' | 'dark';
export type PointerStyle = 'classic' | 'crown' | 'flame' | 'diamond';
export type WheelSoundProfile = 'classic' | 'arcade' | 'casino' | 'wooden';

export interface Palette {
  id: string;
  name: string;
  colors: Array<{ bg: string; text: string }>;
}

export interface WinnerRecord {
  id: string;
  entry: WheelEntry;
  index: number;
  timestamp: number;
  roundNumber?: number;
}

export interface WheelConfigExport {
  version: number;
  weightMode: WeightMode;
  paletteId: string;
  entries: Array<{ label: string; weight: number }>;
  history: WinnerRecord[];
}

const STORAGE_KEY = 'gacor_wheel_state_v2';

// ==========================================
// 2. CURATED COLOR PALETTES
// ==========================================

export const WHEEL_PALETTES: Palette[] = [
  {
    id: 'vibrant',
    name: 'Vibrant Neon',
    colors: [
      { bg: '#6366F1', text: '#FFFFFF' }, // Indigo
      { bg: '#0EA5E9', text: '#FFFFFF' }, // Sky
      { bg: '#10B981', text: '#FFFFFF' }, // Emerald
      { bg: '#F59E0B', text: '#18181B' }, // Amber
      { bg: '#F43F5E', text: '#FFFFFF' }, // Rose
      { bg: '#8B5CF6', text: '#FFFFFF' }, // Violet
      { bg: '#14B8A6', text: '#FFFFFF' }, // Teal
      { bg: '#EC4899', text: '#FFFFFF' }, // Pink
      { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
      { bg: '#84CC16', text: '#18181B' }, // Lime
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    colors: [
      { bg: '#FFE600', text: '#000000' }, // Cyber Yellow
      { bg: '#00F0FF', text: '#000000' }, // Electric Cyan
      { bg: '#FF0055', text: '#FFFFFF' }, // Neon Pink
      { bg: '#7000FF', text: '#FFFFFF' }, // Deep Purple
      { bg: '#00FF66', text: '#000000' }, // Neon Green
      { bg: '#FF5500', text: '#FFFFFF' }, // Bright Orange
    ],
  },
  {
    id: 'casino_gold',
    name: 'Casino Royal',
    colors: [
      { bg: '#D4AF37', text: '#18181B' }, // Metallic Gold
      { bg: '#990000', text: '#FFFFFF' }, // Royal Crimson
      { bg: '#0A2342', text: '#FFFFFF' }, // Deep Navy
      { bg: '#1E5631', text: '#FFFFFF' }, // Velvet Emerald
      { bg: '#301934', text: '#FFFFFF' }, // Royal Purple
      { bg: '#C0C0C0', text: '#18181B' }, // Platinum
    ],
  },
  {
    id: 'kuliner_indo',
    name: 'Makan Mana?',
    colors: [
      { bg: '#DC2626', text: '#FFFFFF' }, // Red Sambal
      { bg: '#EA580C', text: '#FFFFFF' }, // Orange Rendang
      { bg: '#CA8A04', text: '#FFFFFF' }, // Kunyit Gold
      { bg: '#16A34A', text: '#FFFFFF' }, // Daun Mint
      { bg: '#0284C7', text: '#FFFFFF' }, // Es Cendol Blue
      { bg: '#7C3AED', text: '#FFFFFF' }, // Taro Violet
    ],
  },
  {
    id: 'pastel_candy',
    name: 'Pastel Dream',
    colors: [
      { bg: '#FFB3BA', text: '#333333' }, // Soft Pink
      { bg: '#FFDFBA', text: '#333333' }, // Peach
      { bg: '#FFFFBA', text: '#333333' }, // Soft Yellow
      { bg: '#BAFFC9', text: '#333333' }, // Soft Mint
      { bg: '#BAE1FF', text: '#333333' }, // Soft Blue
      { bg: '#E8AEFF', text: '#333333' }, // Soft Lavender
    ],
  },
  {
    id: 'monokai',
    name: 'Dark Hacker',
    colors: [
      { bg: '#F92672', text: '#FFFFFF' }, // Pink
      { bg: '#A6E22E', text: '#18181B' }, // Green
      { bg: '#FD971F', text: '#18181B' }, // Orange
      { bg: '#66D9EF', text: '#18181B' }, // Cyan
      { bg: '#AE81FF', text: '#FFFFFF' }, // Purple
      { bg: '#E6DB74', text: '#18181B' }, // Yellow
    ],
  },
];

// Default Preset Collections
export const SAMPLE_PRESETS = [
  {
    id: 'kuliner',
    name: '🍲 Makan Apa Hari Ini?',
    icon: Utensils,
    items: [
      'Nasi Goreng Spesial',
      'Ayam Geprek Sambal Ijo',
      'Sate Ayam Madura',
      'Bakso Urat Kuah Pedas',
      'Nasi Padang Lauk Rendang',
      'Mie Ayam Jamur',
      'Soto Ayam Lamongan',
      'Seblak Komplit',
      'Gado-Gado Betawi',
      'Martabak Manis',
    ],
  },
  {
    id: 'yes_no',
    name: '❓ Ya / Tidak / Mungkin',
    icon: Dices,
    items: ['YA! Lakukan!', 'TIDAK! Jangan!', 'Coba Lagi Nanti', 'Mungkin Saja', 'Pasti Ya', 'Ragu-ragu'],
  },
  {
    id: 'numbers_10',
    name: '🔢 Angka 1 - 10',
    icon: Scale,
    items: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  },
  {
    id: 'truth_or_dare',
    name: '🔥 Truth or Dare',
    icon: Flame,
    items: [
      'TRUTH: Siapa crush kamu saat ini?',
      'DARE: Telepon temanmu dan katakan kamu kangen!',
      'TRUTH: Pengalaman paling memalukan di sekolah?',
      'DARE: Nyanyikan lagu kesukaanmu dengan keras!',
      'TRUTH: Rahasia terbesar yang belum pernah kamu ceritakan?',
      'DARE: Biarkan grup memilih foto profil Instagram-mu!',
    ],
  },
  {
    id: 'giveaway',
    name: '🎁 Winner Raffle / Giveaway',
    icon: Trophy,
    items: ['Peserta #1', 'Peserta #2', 'Peserta #3', 'Peserta #4', 'Peserta #5', 'Peserta #6', 'Peserta #7', 'Peserta #8'],
  },
];

const DEFAULT_ENTRIES: WheelEntry[] = SAMPLE_PRESETS[0].items.map((label, idx) => ({
  id: `default-${idx + 1}`,
  label,
  weight: 1,
}));

// ==========================================
// 3. CRYPTOGRAPHIC RANDOMIZATION MODULE
// ==========================================

function getCryptoRandomFloat(): number {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] / 4294967296;
}

function getCryptoRandomInt(min: number, max: number): number {
  if (max <= min) return min;
  const range = max - min + 1;
  const float = getCryptoRandomFloat();
  return min + Math.floor(float * range);
}

function cryptoShuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = getCryptoRandomInt(0, i);
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

// ==========================================
// 4. MULTI-PROFILE WEB AUDIO SYNTHESIZER
// ==========================================

class SoundEngine {
  private ctx: AudioContext | null = null;
  public volume = 0.8;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playTick(velocityFactor = 1, profile: WheelSoundProfile = 'classic') {
    try {
      const ctx = this.getContext();
      if (!ctx || this.volume <= 0) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (profile === 'arcade') {
        osc.type = 'square';
        const baseFreq = 440 + Math.min(velocityFactor * 300, 400);
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.03);
        gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      } else if (profile === 'casino') {
        osc.type = 'sawtooth';
        const baseFreq = 800 + Math.min(velocityFactor * 200, 300);
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.018);
        gain.gain.setValueAtTime(0.1 * this.volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.018);
      } else if (profile === 'wooden') {
        osc.type = 'triangle';
        const baseFreq = 300 + Math.min(velocityFactor * 120, 180);
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.025);
        gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
      } else {
        // Classic
        osc.type = 'triangle';
        const baseFreq = 520 + Math.min(velocityFactor * 180, 260);
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.022);
        gain.gain.setValueAtTime(0.14 * this.volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.022);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Ignore audio errors
    }
  }

  public playWinFanfare() {
    try {
      const ctx = this.getContext();
      if (!ctx || this.volume <= 0) return;

      // Arpeggio Fanfare (C5, E5, G5, C6, E6)
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        const startTime = ctx.currentTime + idx * 0.08;
        osc.frequency.setValueAtTime(freq, startTime);

        const vol = (idx === notes.length - 1 ? 0.22 : 0.12) * this.volume;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.62);
      });
    } catch {
      // Ignore audio errors
    }
  }
}

const soundEngine = new SoundEngine();

// ==========================================
// 5. GEOMETRY & SEGMENT ENGINE
// ==========================================

export interface ComputedSegment {
  entry: WheelEntry;
  index: number;
  startAngle: number;
  endAngle: number;
  sweepAngle: number;
  color: { bg: string; text: string };
}

function computeWheelSegments(entries: WheelEntry[], weightMode: WeightMode, palette: Palette): ComputedSegment[] {
  const validEntries = entries.filter((e) => e.label.trim().length > 0);
  const n = validEntries.length;
  if (n === 0) return [];

  const totalWeight = validEntries.reduce(
    (acc, item) => acc + (weightMode === 'weighted' ? Math.max(0.1, Number(item.weight) || 1) : 1),
    0
  );

  let currentAngle = 0;
  const twoPi = Math.PI * 2;
  const colors = palette.colors;

  return validEntries.map((entry, idx) => {
    const w = weightMode === 'weighted' ? Math.max(0.1, Number(entry.weight) || 1) : 1;
    const sweep = (w / totalWeight) * twoPi;
    const startAngle = currentAngle;
    const endAngle = idx === n - 1 ? twoPi : currentAngle + sweep;
    currentAngle = endAngle;

    let paletteIndex = idx % colors.length;
    if (n > 1 && idx === n - 1 && paletteIndex === 0) {
      paletteIndex = 1 % colors.length;
    }

    return {
      entry,
      index: idx,
      startAngle,
      endAngle,
      sweepAngle: endAngle - startAngle,
      color: colors[paletteIndex],
    };
  });
}

function getSegmentAtPointer(rotation: number, segments: ComputedSegment[]): ComputedSegment | null {
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];

  const twoPi = Math.PI * 2;
  const pointerAngle = -Math.PI / 2;
  const normalizedAngle = (((pointerAngle - rotation) % twoPi) + twoPi) % twoPi;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (normalizedAngle >= seg.startAngle && normalizedAngle < seg.endAngle) {
      return seg;
    }
  }
  return segments[segments.length - 1];
}

function parseLinesToEntries(text: string, existingEntries: WheelEntry[]): WheelEntry[] {
  const lines = text.split(/\r?\n/);
  return lines.map((rawLine, index) => {
    const existing = existingEntries[index];
    const id = existing?.id || `entry-${Date.now()}-${index}-${getCryptoRandomInt(1000, 9999)}`;

    const weightMatch = rawLine.match(/^(.*?)\s*\|\s*(\d+(?:\.\d+)?)\s*$/);
    if (weightMatch) {
      return {
        id,
        label: weightMatch[1],
        weight: Math.max(1, Math.min(100, parseFloat(weightMatch[2]) || 1)),
      };
    }

    return {
      id,
      label: rawLine,
      weight: existing ? existing.weight : 1,
    };
  });
}

// Confetti blast helper
function triggerVictoryConfetti() {
  try {
    const count = 200;
    const defaults = {
      origin: { y: 0.65 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      void confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  } catch {
    // Ignore confetti errors
  }
}

// ==========================================
// 6. MAIN APPLICATION COMPONENT
// ==========================================

export default function App() {
  // --- App State ---
  const [entries, setEntries] = useState<WheelEntry[]>(DEFAULT_ENTRIES);
  const [weightMode, setWeightMode] = useState<WeightMode>('equal');
  const [editorTab, setEditorTab] = useState<EditorTab>('text');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [soundVolume, setSoundVolume] = useState<number>(0.8);
  const [soundProfile, setSoundProfile] = useState<WheelSoundProfile>('classic');
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('vibrant');
  const [pointerStyle, setPointerStyle] = useState<PointerStyle>('classic');
  const [spinDurationSec, setSpinDurationSec] = useState<number>(4);
  const [centerText, setCenterText] = useState<string>('SPIN');
  const [eliminationMode, setEliminationMode] = useState<boolean>(false);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [history, setHistory] = useState<WinnerRecord[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Spin & Winner state
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<WinnerRecord | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [pointerKick, setPointerKick] = useState<number>(0);
  const [ledPhase, setLedPhase] = useState<number>(0);

  // UI Dialogs
  const [activeModal, setActiveModal] = useState<'about' | 'help' | 'settings' | null>(null);
  const [confirmingClear, setConfirmingClear] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const pointerKickDecayRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ledTimerRef = useRef<number | null>(null);

  // Current active palette object
  const activePalette = useMemo(() => {
    return WHEEL_PALETTES.find((p) => p.id === selectedPaletteId) || WHEEL_PALETTES[0];
  }, [selectedPaletteId]);

  // Active computed segments
  const activeSegments = useMemo(
    () => computeWheelSegments(entries, weightMode, activePalette),
    [entries, weightMode, activePalette]
  );

  // Bulk text derived value
  const bulkTextValue = useMemo(
    () => entries.map((e) => e.label).join('\n'),
    [entries]
  );

  // Toast notification trigger
  const triggerToast = useCallback((msg: string) => {
    setStatusMessage(msg);
  }, []);

  // Synchronize sound engine volume
  useEffect(() => {
    soundEngine.volume = soundEnabled ? soundVolume : 0;
  }, [soundEnabled, soundVolume]);

  // --- LocalStorage Restoration ---
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.entries) && parsed.entries.length > 0) {
          setEntries(parsed.entries);
        }
        if (parsed.weightMode === 'equal' || parsed.weightMode === 'weighted') {
          setWeightMode(parsed.weightMode);
        }
        if (parsed.theme === 'light' || parsed.theme === 'dark') {
          setTheme(parsed.theme);
        }
        if (typeof parsed.soundEnabled === 'boolean') {
          setSoundEnabled(parsed.soundEnabled);
        }
        if (typeof parsed.soundVolume === 'number') {
          setSoundVolume(parsed.soundVolume);
        }
        if (parsed.selectedPaletteId) {
          setSelectedPaletteId(parsed.selectedPaletteId);
        }
        if (parsed.pointerStyle) {
          setPointerStyle(parsed.pointerStyle);
        }
        if (parsed.spinDurationSec) {
          setSpinDurationSec(parsed.spinDurationSec);
        }
        if (typeof parsed.centerText === 'string') {
          setCenterText(parsed.centerText);
        }
        if (typeof parsed.eliminationMode === 'boolean') {
          setEliminationMode(parsed.eliminationMode);
        }
        if (Array.isArray(parsed.history)) {
          setHistory(parsed.history);
        }
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          entries,
          weightMode,
          theme,
          soundEnabled,
          soundVolume,
          selectedPaletteId,
          pointerStyle,
          spinDurationSec,
          centerText,
          eliminationMode,
          history,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [entries, weightMode, theme, soundEnabled, soundVolume, selectedPaletteId, pointerStyle, spinDurationSec, centerText, eliminationMode, history, isHydrated]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  // --- Theme Sync ---
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // --- Outer LED Lights Animation Cycle ---
  useEffect(() => {
    if (isSpinning) {
      ledTimerRef.current = window.setInterval(() => {
        setLedPhase((prev) => (prev + 1) % 12);
      }, 70);
    } else {
      if (ledTimerRef.current !== null) {
        clearInterval(ledTimerRef.current);
        ledTimerRef.current = null;
      }
    }
    return () => {
      if (ledTimerRef.current !== null) {
        clearInterval(ledTimerRef.current);
      }
    };
  }, [isSpinning]);

  // --- High-DPI Canvas Wheel Renderer ---
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.max(220, Math.min(rect.width, rect.height));
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    if (canvas.width !== Math.floor(size * dpr) || canvas.height !== Math.floor(size * dpr)) {
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size / 2 - 20;
    const rotation = rotationRef.current;

    const isDark = theme === 'dark';
    const borderColor = isDark ? '#27272A' : '#E4E4E7';
    const surfaceColor = isDark ? '#18181B' : '#FFFFFF';
    const mutedTextColor = isDark ? '#A1A1AA' : '#71717A';

    // 1. Outer rim ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 6, 0, Math.PI * 2);
    ctx.fillStyle = surfaceColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // 2. Casino LED Dots along the outer rim
    const totalLeds = 16;
    for (let i = 0; i < totalLeds; i++) {
      const ledAngle = (i / totalLeds) * Math.PI * 2;
      const lx = cx + Math.cos(ledAngle) * (outerRadius + 3);
      const ly = cy + Math.sin(ledAngle) * (outerRadius + 3);

      const isLit = isSpinning ? (i + ledPhase) % 3 === 0 : i % 2 === 0;
      ctx.beginPath();
      ctx.arc(lx, ly, isLit ? 3.2 : 2, 0, Math.PI * 2);
      ctx.fillStyle = isLit
        ? isDark
          ? '#F59E0B'
          : '#EAB308'
        : isDark
        ? '#3F3F46'
        : '#D4D4D8';
      ctx.fill();
    }

    // 3. Empty Wheel Case
    if (activeSegments.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#141417' : '#F4F4F5';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = borderColor;
      ctx.stroke();

      ctx.fillStyle = mutedTextColor;
      ctx.font = '500 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tambah entri di kanan untuk memutar', cx, cy - 10);
      ctx.restore();
      return;
    }

    // 4. Draw Segments
    const n = activeSegments.length;
    const innerHubRadius = Math.max(34, outerRadius * 0.18);

    activeSegments.forEach((seg, idx) => {
      const start = rotation + seg.startAngle;
      const end = rotation + seg.endAngle;
      const isHighlighted = highlightedIndex === idx;

      ctx.beginPath();
      if (n === 1) {
        ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      } else {
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerRadius, start, end);
        ctx.closePath();
      }

      ctx.fillStyle = seg.color.bg;
      ctx.fill();

      // Dim non-highlighted segments on winner reveal
      if (highlightedIndex !== null && !isHighlighted) {
        ctx.fillStyle = isDark ? 'rgba(9, 9, 11, 0.45)' : 'rgba(255, 255, 255, 0.45)';
        ctx.fill();
      }

      // Segment separator lines
      if (n > 1) {
        ctx.lineWidth = n > 60 ? 0.6 : 1.25;
        ctx.strokeStyle = isDark ? '#18181B' : '#FFFFFF';
        ctx.stroke();
      }

      // Highlight winner ring
      if (isHighlighted) {
        ctx.save();
        ctx.beginPath();
        if (n === 1) {
          ctx.arc(cx, cy, outerRadius - 2, 0, Math.PI * 2);
        } else {
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, outerRadius - 1.5, start, end);
          ctx.closePath();
        }
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        ctx.restore();
      }
    });

    // 5. Draw Labels
    activeSegments.forEach((seg) => {
      const midAngle = rotation + seg.startAngle + seg.sweepAngle / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(midAngle);

      const labelRadius = outerRadius * 0.64;
      const arcHeight = seg.sweepAngle * labelRadius;
      const fontSize = Math.max(8.5, Math.min(15, arcHeight * 0.52, outerRadius * 0.068));

      if (arcHeight > 4.5) {
        ctx.font = `600 ${fontSize.toFixed(1)}px Inter, sans-serif`;
        ctx.fillStyle = seg.color.text;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const maxTextWidth = outerRadius - innerHubRadius - 22;
        let displayLabel = seg.entry.label.trim();

        if (weightMode === 'weighted' && seg.entry.weight !== 1 && n <= 40) {
          displayLabel = `${displayLabel} (${seg.entry.weight}×)`;
        }

        if (ctx.measureText(displayLabel).width > maxTextWidth) {
          const ellipsis = '…';
          let low = 0;
          let high = displayLabel.length;
          while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const candidate = displayLabel.slice(0, mid) + ellipsis;
            if (ctx.measureText(candidate).width <= maxTextWidth) {
              low = mid;
            } else {
              high = mid - 1;
            }
          }
          displayLabel = displayLabel.slice(0, Math.max(1, low)) + ellipsis;
        }

        ctx.fillText(displayLabel, outerRadius - 14, 0);
      }

      ctx.restore();
    });

    // 6. Draw Rim Pegs
    if (n > 1 && n <= 60) {
      activeSegments.forEach((seg) => {
        const pegAngle = rotation + seg.startAngle;
        const px = cx + Math.cos(pegAngle) * (outerRadius - 2);
        const py = cy + Math.sin(pegAngle) * (outerRadius - 2);

        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = surfaceColor;
        ctx.fill();
      });
    }

    ctx.restore();
  }, [activeSegments, highlightedIndex, theme, weightMode, isSpinning, ledPhase]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      drawWheel();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawWheel]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // --- Spin Engine ---
  const spinWheel = useCallback(() => {
    if (isSpinning || activeSegments.length === 0) return;

    setIsSpinning(true);
    setWinner(null);
    setShowWinnerModal(false);
    setHighlightedIndex(null);
    setConfirmingClear(false);

    // 1. Pick winner using Web Crypto
    const totalWeight = activeSegments.reduce(
      (sum, seg) => sum + (weightMode === 'weighted' ? Math.max(0.1, Number(seg.entry.weight) || 1) : 1),
      0
    );

    const randomThreshold = getCryptoRandomFloat() * totalWeight;
    let cumulative = 0;
    let chosenSegment = activeSegments[activeSegments.length - 1];

    for (let i = 0; i < activeSegments.length; i++) {
      const w = weightMode === 'weighted'
        ? Math.max(0.1, Number(activeSegments[i].entry.weight) || 1)
        : 1;
      cumulative += w;
      if (randomThreshold < cumulative) {
        chosenSegment = activeSegments[i];
        break;
      }
    }

    // 2. Landing angle inside segment
    const margin = chosenSegment.sweepAngle * 0.14;
    const innerSweep = Math.max(0.001, chosenSegment.sweepAngle - margin * 2);
    const angleInsideSegment =
      chosenSegment.startAngle + margin + getCryptoRandomFloat() * innerSweep;

    // 3. Align angle under pointer at top (-π/2)
    const twoPi = Math.PI * 2;
    const pointerAngle = -Math.PI / 2;
    const desiredMod = (((pointerAngle - angleInsideSegment) % twoPi) + twoPi) % twoPi;

    const startRotation = rotationRef.current;
    const currentMod = ((startRotation % twoPi) + twoPi) % twoPi;
    let deltaMod = desiredMod - currentMod;
    if (deltaMod <= 0) {
      deltaMod += twoPi;
    }

    const fullSpins = getCryptoRandomInt(6, 10);
    const totalDelta = fullSpins * twoPi + deltaMod;
    const targetRotation = startRotation + totalDelta;

    const duration = spinDurationSec * 1000;
    const startTime = performance.now();

    let previousSegmentIndex =
      getSegmentAtPointer(startRotation, activeSegments)?.index ?? -1;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      const accelBreakpoint = 0.08;
      let progress: number;
      const k = 5.2; // quintic friction
      const vMax = k / (1 + (k - 1) * accelBreakpoint);

      if (t < accelBreakpoint) {
        progress = 0.5 * (vMax / accelBreakpoint) * t * t;
      } else {
        const u = (t - accelBreakpoint) / (1 - accelBreakpoint);
        const posAtBreak = 0.5 * vMax * accelBreakpoint;
        progress = posAtBreak + (1 - posAtBreak) * (1 - Math.pow(1 - u, k));
      }

      const currentRotation = startRotation + totalDelta * progress;
      rotationRef.current = currentRotation;

      // Pointer tick feedback
      const currentSeg = getSegmentAtPointer(currentRotation, activeSegments);
      if (currentSeg && currentSeg.index !== previousSegmentIndex) {
        previousSegmentIndex = currentSeg.index;
        const remainingSpeed = Math.max(0.12, 1 - t);
        if (soundEnabled) {
          soundEngine.playTick(remainingSpeed, soundProfile);
        }
        pointerKickDecayRef.current = Math.min(22, 8 + remainingSpeed * 15);
        setPointerKick(pointerKickDecayRef.current);
      } else if (pointerKickDecayRef.current > 0.2) {
        pointerKickDecayRef.current *= 0.82;
        setPointerKick(pointerKickDecayRef.current);
      } else if (pointerKickDecayRef.current !== 0) {
        pointerKickDecayRef.current = 0;
        setPointerKick(0);
      }

      drawWheel();

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = targetRotation % twoPi;
        setPointerKick(0);
        setIsSpinning(false);

        const finalSeg = getSegmentAtPointer(rotationRef.current, activeSegments) || chosenSegment;
        setHighlightedIndex(finalSeg.index);

        const newRecord: WinnerRecord = {
          id: `win-${Date.now()}`,
          entry: finalSeg.entry,
          index: finalSeg.index,
          timestamp: Date.now(),
          roundNumber: eliminationMode ? roundNumber : undefined,
        };

        setWinner(newRecord);
        setHistory((prev) => [newRecord, ...prev]);
        setShowWinnerModal(true);

        if (soundEnabled) {
          soundEngine.playWinFanfare();
        }

        // Trigger confetti burst
        triggerVictoryConfetti();

        if (eliminationMode) {
          setRoundNumber((r) => r + 1);
        }

        drawWheel();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isSpinning, activeSegments, weightMode, soundEnabled, soundProfile, spinDurationSec, eliminationMode, roundNumber, drawWheel]);

  // --- Handlers ---
  const handleBulkTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isSpinning) return;
    const updated = parseLinesToEntries(e.target.value, entries);
    setEntries(updated);
    setHighlightedIndex(null);
  };

  const handleShuffle = () => {
    if (isSpinning || entries.length <= 1) return;
    setEntries((prev) => cryptoShuffle(prev));
    setHighlightedIndex(null);
    triggerToast('Daftar entri diacak!');
  };

  const handleClearAll = () => {
    if (isSpinning) return;
    setEntries([]);
    setWinner(null);
    setShowWinnerModal(false);
    setHighlightedIndex(null);
    setConfirmingClear(false);
    triggerToast('Semua entri telah dihapus');
  };

  const handleRemoveWinner = () => {
    if (!winner) return;
    const winnerId = winner.entry.id;
    setEntries((prev) => prev.filter((item) => item.id !== winnerId));
    setWinner(null);
    setShowWinnerModal(false);
    setHighlightedIndex(null);
    triggerToast(`Dihapus: "${winner.entry.label}"`);
  };

  const handleSpinAgain = () => {
    setWinner(null);
    setShowWinnerModal(false);
    setHighlightedIndex(null);
    setTimeout(() => {
      spinWheel();
    }, 16);
  };

  const handleUpdateEntryLabel = (id: string, newLabel: string) => {
    if (isSpinning) return;
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label: newLabel } : item))
    );
    setHighlightedIndex(null);
  };

  const handleUpdateEntryWeight = (id: string, deltaOrValue: number, isAbsolute = false) => {
    if (isSpinning) return;
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextWeight = isAbsolute
          ? Math.max(1, Math.min(99, Math.round(deltaOrValue) || 1))
          : Math.max(1, Math.min(99, item.weight + deltaOrValue));
        return { ...item, weight: nextWeight };
      })
    );
    setHighlightedIndex(null);
  };

  const handleDeleteSingleEntry = (id: string) => {
    if (isSpinning) return;
    setEntries((prev) => prev.filter((item) => item.id !== id));
    setHighlightedIndex(null);
  };

  const handleLoadPreset = (presetItems: string[]) => {
    if (isSpinning) return;
    const newEntries: WheelEntry[] = presetItems.map((label, idx) => ({
      id: `preset-${Date.now()}-${idx}`,
      label,
      weight: 1,
    }));
    setEntries(newEntries);
    setWinner(null);
    setHighlightedIndex(null);
    setRoundNumber(1);
    triggerToast('Preset berhasil dimuat!');
  };

  const handleExportJSON = () => {
    const payload: WheelConfigExport = {
      version: 2,
      weightMode,
      paletteId: selectedPaletteId,
      entries: entries
        .filter((e) => e.label.trim().length > 0)
        .map((e) => ({ label: e.label.trim(), weight: e.weight })),
      history,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wheel-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('Konfigurasi diekspor sebagai JSON');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(String(event.target?.result || '{}'));
        if (!Array.isArray(raw.entries)) {
          triggerToast('Format JSON salah: tidak ada array entries');
          return;
        }

        const importedEntries: WheelEntry[] = raw.entries
          .filter((item: unknown) => typeof item === 'object' && item !== null && 'label' in item)
          .map((item: { label?: unknown; weight?: unknown }, idx: number) => ({
            id: `imported-${Date.now()}-${idx}`,
            label: String(item.label || '').trim(),
            weight: Math.max(1, Math.min(99, Number(item.weight) || 1)),
          }))
          .filter((item: WheelEntry) => item.label.length > 0);

        if (raw.weightMode === 'equal' || raw.weightMode === 'weighted') {
          setWeightMode(raw.weightMode);
        }
        if (raw.paletteId && WHEEL_PALETTES.some((p) => p.id === raw.paletteId)) {
          setSelectedPaletteId(raw.paletteId);
        }
        if (Array.isArray(raw.history)) {
          setHistory(raw.history);
        }

        setEntries(importedEntries);
        setWinner(null);
        setHighlightedIndex(null);
        triggerToast(`Berhasil mengimpor ${importedEntries.length} entri`);
      } catch {
        triggerToast('Gagal membaca berkas JSON');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleCopyWinner = () => {
    if (!winner) return;
    navigator.clipboard.writeText(winner.entry.label).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    });
  };

  // Toggle Fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    }
  };

  // Keyboard shortcut: Spacebar / Enter to spin, F to fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      if (!isInputActive) {
        if (e.code === 'Space' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          spinWheel();
        }
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          toggleFullscreen();
        }
      }

      if (e.key === 'Escape') {
        if (showWinnerModal) {
          setShowWinnerModal(false);
        } else if (activeModal) {
          setActiveModal(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spinWheel, showWinnerModal, activeModal]);

  const isDark = theme === 'dark';

  // Calculate total weights & probabilities for stats tab
  const totalWeight = useMemo(() => {
    return activeSegments.reduce((sum, seg) => sum + (weightMode === 'weighted' ? seg.entry.weight : 1), 0);
  }, [activeSegments, weightMode]);

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-[#09090B] text-[#FAFAFA]' : 'bg-[#FAFAFA] text-[#18181B]'
      }`}
      style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* ==========================================
          HEADER
      ========================================== */}
      <header
        className={`h-14 border-b px-4 sm:px-6 flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#121215] border-[#27272A]' : 'bg-[#FFFFFF] border-[#E4E4E7]'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight">Wheel of Questions</span>
            <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-2xs">
              GACOR PRO
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <button
            type="button"
            onClick={() => setActiveModal('settings')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tema & Suara</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('help')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bantuan</span>
          </button>

          <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-[#27272A]' : 'bg-[#E4E4E7]'}`} />

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Fullscreen (F)' : 'Mode Fullscreen / Layar Penuh (F)'}
            aria-label="Toggle Fullscreen"
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              isDark
                ? 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Mute Suara' : 'Aktifkan Suara'}
            aria-label="Toggle Mute Sound"
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              isDark
                ? 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#6366F1]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            aria-label="Toggle Theme"
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              isDark
                ? 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </nav>
      </header>

      {/* ==========================================
          MAIN WORKSPACE
      ========================================== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT PANEL — WHEEL STAGE */}
        <section
          aria-label="Roda Acak"
          className="lg:col-span-7 flex flex-col items-center justify-center w-full"
        >
          {/* Preset Quick Loader Strip */}
          <div className="w-full max-w-[min(490px,max(220px,calc(100svh-140px)))] mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 shrink-0 mr-1">
              Presets:
            </span>
            {SAMPLE_PRESETS.map((p) => {
              const IconComp = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleLoadPreset(p.items)}
                  disabled={isSpinning}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-all shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                    isDark
                      ? 'bg-[#18181B] border-[#27272A] hover:border-[#6366F1] text-[#A1A1AA] hover:text-white'
                      : 'bg-white border-[#E4E4E7] hover:border-[#6366F1] text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  <IconComp className="w-3 h-3 shrink-0" />
                  <span>{p.name.split(' ')[1] || p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Wheel Interactive Container */}
          <div
            ref={containerRef}
            className="relative w-full max-w-[min(490px,max(220px,calc(100svh-140px)))] aspect-square flex items-center justify-center select-none"
          >
            {/* Top Pointer Indicator */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-md"
              style={{
                transform: `translateX(-50%) rotate(${-pointerKick}deg)`,
                transformOrigin: '50% 6px',
                transition: isSpinning ? 'none' : 'transform 150ms ease-out',
              }}
            >
              {pointerStyle === 'crown' ? (
                <div className="flex flex-col items-center text-amber-400">
                  <Crown className="w-7 h-7 fill-amber-400 drop-shadow-sm" />
                </div>
              ) : pointerStyle === 'flame' ? (
                <div className="flex flex-col items-center text-rose-500">
                  <Flame className="w-7 h-7 fill-rose-500 drop-shadow-sm" />
                </div>
              ) : (
                <svg
                  width="34"
                  height="38"
                  viewBox="0 0 32 36"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 34L4 10C2.6 7.2 4.6 4 7.8 4H24.2C27.4 4 29.4 7.2 28 10L16 34Z"
                    fill={isDark ? '#FAFAFA' : '#18181B'}
                    stroke={isDark ? '#18181B' : '#FFFFFF'}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                  <circle cx="16" cy="10" r="3" fill="#6366F1" />
                </svg>
              )}
            </div>

            {/* HTML5 Canvas Wheel */}
            <canvas
              ref={canvasRef}
              onClick={spinWheel}
              className={`rounded-full transition-opacity ${
                activeSegments.length > 0 && !isSpinning ? 'cursor-pointer' : 'cursor-default'
              }`}
              aria-label="Random Picker Wheel Canvas"
            />

            {/* Center Spin Hub Button */}
            <button
              type="button"
              onClick={spinWheel}
              disabled={isSpinning || activeSegments.length === 0}
              aria-label="Spin the wheel"
              className={`absolute z-20 w-18 h-18 sm:w-20 sm:h-20 rounded-full font-bold text-xs sm:text-sm tracking-wide uppercase transition-all flex flex-col items-center justify-center border-4 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] ${
                isDark
                  ? 'bg-[#18181B] text-[#FAFAFA] border-[#27272A] hover:border-[#6366F1]'
                  : 'bg-[#FFFFFF] text-[#18181B] border-[#E4E4E7] hover:border-[#6366F1]'
              } ${
                isSpinning || activeSegments.length === 0
                  ? 'opacity-70 cursor-not-allowed'
                  : 'hover:scale-108 active:scale-95 cursor-pointer'
              }`}
            >
              <span className="font-extrabold text-sm sm:text-base text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                {isSpinning ? '•••' : centerText}
              </span>
            </button>
          </div>

          {/* Winner Banner / Live Status Card */}
          <div className="w-full max-w-[min(490px,max(220px,calc(100svh-140px)))] mt-4 min-h-[92px]">
            {winner ? (
              <div
                role="status"
                aria-live="polite"
                className={`w-full rounded-xl border p-4 transition-all shadow-sm ${
                  isDark
                    ? 'bg-[#121215] border-[#27272A]'
                    : 'bg-[#FFFFFF] border-[#E4E4E7]'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-[#6366F1]">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {eliminationMode ? `ROUND ${roundNumber - 1} WINNER:` : 'HASIL UNDIAN:'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWinnerModal(true)}
                        className="text-xs text-[#6366F1] hover:underline font-semibold shrink-0 cursor-pointer"
                      >
                        Pop-up Pemenang
                      </button>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight leading-snug break-words mt-1.5">
                      {winner.entry.label}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={handleSpinAgain}
                      className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Putar Lagi</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveWinner}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isDark
                          ? 'border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#FAFAFA]'
                          : 'border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] text-[#18181B]'
                      }`}
                    >
                      <UserMinus className="w-3.5 h-3.5 text-rose-500" />
                      <span>Hapus Pemenang</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`w-full rounded-xl border px-4 py-3 flex items-center justify-between text-xs ${
                  isDark
                    ? 'bg-[#121215]/60 border-[#27272A] text-[#A1A1AA]'
                    : 'bg-[#FFFFFF] border-[#E4E4E7] text-[#71717A]'
                }`}
              >
                <span>
                  {isSpinning
                    ? 'Memutar roda...'
                    : activeSegments.length === 0
                    ? 'Tidak ada entri di roda.'
                    : `Siap memutar dari ${activeSegments.length} entri.`}
                </span>
                <span className="hidden sm:inline font-mono text-[11px] opacity-75">
                  Tekan [Space] untuk memutar
                </span>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL — ENTRY EDITOR & TABBED HUB */}
        <section
          aria-label="Entry Editor"
          className={`lg:col-span-5 w-full rounded-xl border flex flex-col ${
            isDark ? 'bg-[#121215] border-[#27272A]' : 'bg-[#FFFFFF] border-[#E4E4E7]'
          }`}
        >
          {/* Tab Navigation */}
          <div
            className={`p-3 border-b flex items-center justify-between gap-2 ${
              isDark ? 'border-[#27272A]' : 'border-[#E4E4E7]'
            }`}
          >
            <div
              className={`inline-flex rounded-lg p-0.5 border ${
                isDark ? 'bg-[#09090B] border-[#27272A]' : 'bg-[#F4F4F5] border-[#E4E4E7]'
              }`}
            >
              <button
                type="button"
                onClick={() => setEditorTab('text')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  editorTab === 'text'
                    ? isDark
                      ? 'bg-[#27272A] text-[#FAFAFA]'
                      : 'bg-[#FFFFFF] text-[#18181B] shadow-2xs'
                    : isDark
                    ? 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Teks</span>
              </button>

              <button
                type="button"
                onClick={() => setEditorTab('items')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  editorTab === 'items'
                    ? isDark
                      ? 'bg-[#27272A] text-[#FAFAFA]'
                      : 'bg-[#FFFFFF] text-[#18181B] shadow-2xs'
                    : isDark
                    ? 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Item</span>
              </button>

              <button
                type="button"
                onClick={() => setEditorTab('stats')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  editorTab === 'stats'
                    ? isDark
                      ? 'bg-[#27272A] text-[#FAFAFA]'
                      : 'bg-[#FFFFFF] text-[#18181B] shadow-2xs'
                    : isDark
                    ? 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                <span>Peluang</span>
              </button>

              <button
                type="button"
                onClick={() => setEditorTab('history')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  editorTab === 'history'
                    ? isDark
                      ? 'bg-[#27272A] text-[#FAFAFA]'
                      : 'bg-[#FFFFFF] text-[#18181B] shadow-2xs'
                    : isDark
                    ? 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                    : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Riwayat ({history.length})</span>
              </button>
            </div>

            {/* Mode Weight Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = weightMode === 'equal' ? 'weighted' : 'equal';
                setWeightMode(next);
                if (next === 'weighted') {
                  setEditorTab('items');
                }
              }}
              title="Toggle mode bobot probabilitas"
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                weightMode === 'weighted'
                  ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#6366F1]'
                  : isDark
                  ? 'border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]'
                  : 'border-[#E4E4E7] text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{weightMode === 'weighted' ? 'Bobot' : 'Sama'}</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div
            className={`px-4 py-2 border-b flex items-center justify-between gap-2 text-xs ${
              isDark ? 'bg-[#18181B]/40 border-[#27272A]' : 'bg-[#FAFAFA] border-[#E4E4E7]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShuffle}
                disabled={isSpinning || activeSegments.length <= 1}
                className={`px-2.5 py-1.5 rounded-md font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDark
                    ? 'border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#FAFAFA]'
                    : 'border-[#E4E4E7] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#18181B]'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Acak</span>
              </button>

              {!confirmingClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmingClear(true)}
                  disabled={isSpinning || entries.length === 0}
                  className={`px-2.5 py-1.5 rounded-md font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDark
                      ? 'border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#FAFAFA]'
                      : 'border-[#E4E4E7] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#18181B]'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2.5 py-1.5 rounded-md font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                  >
                    Hapus Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(false)}
                    className={`px-2 py-1.5 rounded-md font-semibold border cursor-pointer ${
                      isDark ? 'border-[#27272A] text-[#A1A1AA]' : 'border-[#E4E4E7] text-[#71717A]'
                    }`}
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>

            {/* Import / Export */}
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportJSON}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSpinning}
                title="Impor konfigurasi JSON"
                className={`p-1.5 rounded-md border transition-colors cursor-pointer disabled:opacity-40 ${
                  isDark
                    ? 'border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]'
                    : 'border-[#E4E4E7] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                disabled={activeSegments.length === 0}
                title="Ekspor konfigurasi JSON"
                className={`p-1.5 rounded-md border transition-colors cursor-pointer disabled:opacity-40 ${
                  isDark
                    ? 'border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]'
                    : 'border-[#E4E4E7] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="p-4 flex-1 flex flex-col min-h-[360px] max-h-[520px]">
            {editorTab === 'text' && (
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className={isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]'}>
                    Satu pertanyaan / entri per baris
                  </span>
                  <span className="font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                    Total: {entries.length}
                  </span>
                </div>
                <textarea
                  id="entries-textarea"
                  value={bulkTextValue}
                  onChange={handleBulkTextChange}
                  disabled={isSpinning}
                  placeholder="Ketik entri di sini (1 per baris)..."
                  className={`w-full flex-1 p-3 text-sm rounded-lg border font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-colors ${
                    isDark
                      ? 'bg-[#09090B] border-[#27272A] text-[#FAFAFA]'
                      : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#18181B]'
                  }`}
                />
              </div>
            )}

            {editorTab === 'items' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {entries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs transition-colors ${
                        isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-[#FAFAFA] border-[#E4E4E7]'
                      }`}
                    >
                      <span className="font-mono text-gray-400 w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={entry.label}
                        onChange={(e) => handleUpdateEntryLabel(entry.id, e.target.value)}
                        className={`flex-1 px-2 py-1 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-[#6366F1] ${
                          isDark
                            ? 'bg-[#09090B] border-[#27272A] text-white'
                            : 'bg-white border-[#E4E4E7] text-black'
                        }`}
                      />

                      {weightMode === 'weighted' && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateEntryWeight(entry.id, -1)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-semibold min-w-[20px] text-center font-mono">
                            {entry.weight}×
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateEntryWeight(entry.id, 1)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteSingleEntry(entry.id)}
                        className="text-gray-400 hover:text-rose-500 p-1 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editorTab === 'stats' && (
              <div className="flex flex-col flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mb-2">
                  <span className="font-semibold text-indigo-500 block mb-1">
                    📊 Kalkulator Peluang Kemenangan
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Persentase peluang dihitung secara pasti berdasarkan bobot masing-masing entri.
                  </span>
                </div>

                {activeSegments.map((seg) => {
                  const prob = ((weightMode === 'weighted' ? seg.entry.weight : 1) / totalWeight) * 100;
                  return (
                    <div
                      key={seg.entry.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-[#FAFAFA] border-[#E4E4E7]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: seg.color.bg }}
                        />
                        <span className="font-medium truncate">{seg.entry.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono font-bold">
                        <span>{prob.toFixed(1)}%</span>
                        <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${prob}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {editorTab === 'history' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {history.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400 text-xs">
                    <Trophy className="w-8 h-8 mb-2 opacity-50 text-amber-500" />
                    <span>Belum ada riwayat pemenang. Putar roda untuk memulai!</span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                    {history.map((rec) => (
                      <div
                        key={rec.id}
                        className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${
                          isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-[#FAFAFA] border-[#E4E4E7]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate text-sm">{rec.entry.label}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {new Date(rec.timestamp).toLocaleTimeString()}
                            {rec.roundNumber && ` • Round ${rec.roundNumber}`}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 shrink-0">
                          MENANG
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ==========================================
          WINNER POPUP MODAL (GACOR CELEBRATION)
      ========================================== */}
      {showWinnerModal && winner && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all scale-100 ${
              isDark ? 'bg-[#121215] border-[#27272A] text-white' : 'bg-white border-[#E4E4E7] text-black'
            }`}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wider uppercase text-indigo-500">
                <Sparkles className="w-4 h-4" />
                <span>
                  {eliminationMode ? `ROUND ${roundNumber - 1} CHAMPION` : 'SELAMAT KEPADA PEMENANG!'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Winner Card Display */}
            <div
              className={`p-6 rounded-xl border text-center mb-6 relative overflow-hidden ${
                isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-[#FAFAFA] border-[#E4E4E7]'
              }`}
            >
              <div className="inline-flex p-3 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-white mb-3 shadow-md">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black leading-tight break-words tracking-tight">
                {winner.entry.label}
              </h2>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handleCopyWinner}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isDark ? 'border-[#27272A] hover:bg-[#18181B]' : 'border-[#E4E4E7] hover:bg-gray-100'
                }`}
              >
                {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedToast ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveWinner}
                className="w-full sm:flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Hapus Pertanyaan</span>
              </button>

              <button
                type="button"
                onClick={handleSpinAgain}
                className="w-full sm:flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Putar Lagi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SETTINGS MODAL
      ========================================== */}
      {activeModal === 'settings' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
              isDark ? 'bg-[#121215] border-[#27272A] text-white' : 'bg-white border-[#E4E4E7] text-black'
            }`}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" />
                <span>Pengaturan Tema & Suara</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5 text-xs">
              {/* Palette Choice */}
              <div>
                <label className="font-semibold block mb-2 text-gray-400 uppercase tracking-wider text-[10px]">
                  Palet Warna Roda
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WHEEL_PALETTES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPaletteId(p.id)}
                      className={`p-2.5 rounded-lg border text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        selectedPaletteId === p.id
                          ? 'border-[#6366F1] bg-[#6366F1]/10 font-bold'
                          : isDark
                          ? 'border-[#27272A] bg-[#18181B]'
                          : 'border-[#E4E4E7] bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <div className="flex items-center -space-x-1 shrink-0">
                        {p.colors.slice(0, 4).map((c, i) => (
                          <span
                            key={i}
                            className="w-3.5 h-3.5 rounded-full border border-black/20"
                            style={{ backgroundColor: c.bg }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spin Duration & Pointer Style */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1 text-gray-400 uppercase tracking-wider text-[10px]">
                    Durasi Putaran ({spinDurationSec} detik)
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={spinDurationSec}
                    onChange={(e) => setSpinDurationSec(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-gray-400 uppercase tracking-wider text-[10px]">
                    Gaya Jarum Penunjuk
                  </label>
                  <select
                    value={pointerStyle}
                    onChange={(e) => setPointerStyle(e.target.value as PointerStyle)}
                    className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isDark ? 'bg-[#18181B] border-[#27272A] text-white' : 'bg-white border-[#E4E4E7]'
                    }`}
                  >
                    <option value="classic">Segitiga Klasik</option>
                    <option value="crown">Mahkota Raja 👑</option>
                    <option value="flame">Api Api 🔥</option>
                  </select>
                </div>
              </div>

              {/* Sound Settings */}
              <div className="p-3 rounded-lg border bg-indigo-500/5 border-indigo-500/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-500">Audio & Efek Suara</span>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="text-xs text-indigo-500 font-bold hover:underline cursor-pointer"
                  >
                    {soundEnabled ? 'Matikan' : 'Nyalakan'}
                  </button>
                </div>

                {soundEnabled && (
                  <>
                    <div className="flex items-center gap-3">
                      <Volume1 className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={soundVolume}
                        onChange={(e) => setSoundVolume(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                      <span className="font-mono text-gray-400 shrink-0 min-w-[32px]">
                        {Math.round(soundVolume * 100)}%
                      </span>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-gray-400 uppercase tracking-wider text-[10px]">
                        Profil Suara Putaran
                      </label>
                      <select
                        value={soundProfile}
                        onChange={(e) => setSoundProfile(e.target.value as WheelSoundProfile)}
                        className={`w-full p-2 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isDark ? 'bg-[#18181B] border-[#27272A] text-white' : 'bg-white border-[#E4E4E7]'
                        }`}
                      >
                        <option value="classic">Klasik Kayu / Peg</option>
                        <option value="arcade">Arcade 8-Bit</option>
                        <option value="casino">Casino Slot</option>
                        <option value="wooden">Ketukan Kayu Dalam</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Mode Eliminasi / Battle Royale */}
              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-amber-500 block">Mode Eliminasi (Survivor)</span>
                  <span className="text-gray-400 text-[11px]">
                    Setiap pemenang otomatis ditandai dan dicatat per round.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={eliminationMode}
                  onChange={(e) => setEliminationMode(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-xs font-semibold shadow-xl border border-gray-800 animate-bounce">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
