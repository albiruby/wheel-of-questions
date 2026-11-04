import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Check,
  Sparkles,
  Scale,
  List,
  AlignLeft,
  UserMinus
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
export type EditorTab = 'bulk' | 'list';
export type ThemeMode = 'light' | 'dark';

export interface WinnerRecord {
  entry: WheelEntry;
  index: number;
  timestamp: number;
}

export interface WheelConfigExport {
  version: number;
  weightMode: WeightMode;
  entries: Array<{ label: string; weight: number }>;
}

const STORAGE_KEY = 'minimal_wheel_state_v1';

// ==========================================
// 2. COLOR PALETTE & DESIGN TOKENS
// ==========================================

// Carefully curated modern, high-contrast segment palette with explicit accessible text contrast
const WHEEL_PALETTE = [
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
];

const DEFAULT_ENTRIES: WheelEntry[] = [
  { id: '1', label: 'What is the most memorable lesson you learned from a past failure or mistake?', weight: 1 },
  { id: '2', label: 'If you could master any skill instantly without practice, what would you choose and why?', weight: 1 },
  { id: '3', label: 'What is one habit you adopted in the last year that significantly improved your daily life?', weight: 1 },
  { id: '4', label: 'If you had unlimited resources to solve one problem in your community, where would you start?', weight: 1 },
  { id: '5', label: 'What book, movie, or conversation completely changed the way you look at the world?', weight: 1 },
  { id: '6', label: 'Describe a moment when stepping outside your comfort zone led to an unexpected reward.', weight: 1 },
  { id: '7', label: 'If you could have a one-hour conversation with your future self ten years from now, what would you ask?', weight: 1 },
  { id: '8', label: 'What is something most people around you agree on, but you secretly see differently?', weight: 1 },
];

// ==========================================
// 3. CRYPTOGRAPHIC RANDOMIZATION MODULE
// ==========================================

/**
 * Generates a cryptographically secure random float in [0, 1) using Web Crypto API.
 * Strictly avoids Math.random() as required.
 */
function getCryptoRandomFloat(): number {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  // Divide by 2^32 to get a uniform float in [0, 1)
  return array[0] / 4294967296;
}

/**
 * Generates a cryptographically secure integer in [min, max] inclusive.
 */
function getCryptoRandomInt(min: number, max: number): number {
  if (max <= min) return min;
  const range = max - min + 1;
  const float = getCryptoRandomFloat();
  return min + Math.floor(float * range);
}

/**
 * Performs a Fisher-Yates shuffle using Web Crypto API.
 */
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
// 4. WEB AUDIO MECHANICAL TICK SYNTHESIZER
// ==========================================

class SoundEngine {
  private ctx: AudioContext | null = null;

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

  public playTick(velocityFactor = 1) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Subtle wooden/mechanical peg click sound
      osc.type = 'triangle';
      const baseFreq = 520 + Math.min(velocityFactor * 180, 260);
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.022);

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.022);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.024);
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  }

  public playWinChime() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const startTime = ctx.currentTime + idx * 0.075;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.46);
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
  startAngle: number; // radians in [0, 2π)
  endAngle: number;   // radians in (0, 2π]
  sweepAngle: number; // radians
  color: { bg: string; text: string };
}

/**
 * Computes exact angular geometry for each active wheel entry.
 * Ensures adjacent segments never share the exact same color, including the wrap-around seam.
 */
function computeWheelSegments(entries: WheelEntry[], weightMode: WeightMode): ComputedSegment[] {
  const validEntries = entries.filter((e) => e.label.trim().length > 0);
  const n = validEntries.length;
  if (n === 0) return [];

  const totalWeight = validEntries.reduce(
    (acc, item) => acc + (weightMode === 'weighted' ? Math.max(0.1, Number(item.weight) || 1) : 1),
    0
  );

  let currentAngle = 0;
  const twoPi = Math.PI * 2;

  return validEntries.map((entry, idx) => {
    const w = weightMode === 'weighted' ? Math.max(0.1, Number(entry.weight) || 1) : 1;
    const sweep = (w / totalWeight) * twoPi;
    const startAngle = currentAngle;
    const endAngle = idx === n - 1 ? twoPi : currentAngle + sweep;
    currentAngle = endAngle;

    // Select color ensuring last segment doesn't collide with first segment color
    let paletteIndex = idx % WHEEL_PALETTE.length;
    if (n > 1 && idx === n - 1 && paletteIndex === 0) {
      paletteIndex = 1;
    }

    return {
      entry,
      index: idx,
      startAngle,
      endAngle,
      sweepAngle: endAngle - startAngle,
      color: WHEEL_PALETTE[paletteIndex],
    };
  });
}

/**
 * Given a wheel rotation angle (radians) and fixed pointer at top (-π/2),
 * returns the exact segment currently underneath the pointer.
 */
function getSegmentAtPointer(rotation: number, segments: ComputedSegment[]): ComputedSegment | null {
  if (segments.length === 0) return null;
  if (segments.length === 1) return segments[0];

  const twoPi = Math.PI * 2;
  const pointerAngle = -Math.PI / 2; // Top 12 o'clock position
  // Relative angle in the wheel's local coordinate space [0, 2π)
  const normalizedAngle = (((pointerAngle - rotation) % twoPi) + twoPi) % twoPi;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (normalizedAngle >= seg.startAngle && normalizedAngle < seg.endAngle) {
      return seg;
    }
  }
  return segments[segments.length - 1];
}

/**
 * Parses multiline text into WheelEntry items.
 * Supports optional "Name : Weight" syntax when users type weights directly, or preserves existing IDs/weights.
 */
function parseLinesToEntries(text: string, existingEntries: WheelEntry[]): WheelEntry[] {
  const lines = text.split(/\r?\n/);
  return lines.map((rawLine, index) => {
    const existing = existingEntries[index];
    // Preserve ID if available
    const id = existing?.id || `entry-${Date.now()}-${index}-${ getCryptoRandomInt(1000, 9999) }`;

    // Check if user wrote "Name : 3" or just "Name"
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

// ==========================================
// 6. MAIN APPLICATION COMPONENT
// ==========================================

export default function App() {
  // --- Application State ---
  const [entries, setEntries] = useState<WheelEntry[]>(DEFAULT_ENTRIES);
  const [weightMode, setWeightMode] = useState<WeightMode>('equal');
  const [editorTab, setEditorTab] = useState<EditorTab>('bulk');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Spin & Winner state
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<WinnerRecord | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [pointerKick, setPointerKick] = useState<number>(0);

  // UI Dialogs & Confirmations
  const [activeModal, setActiveModal] = useState<'about' | 'help' | null>(null);
  const [confirmingClear, setConfirmingClear] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState<string>('');
  const [newItemWeight, setNewItemWeight] = useState<number>(1);

  // Refs for Canvas & Animation Engine
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const pointerKickDecayRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active segments (non-empty lines)
  const activeSegments = useMemo(
    () => computeWheelSegments(entries, weightMode),
    [entries, weightMode]
  );

  // Bulk textarea value derived from entries
  const bulkTextValue = useMemo(
    () => entries.map((e) => e.label).join('\n'),
    [entries]
  );

  // Show temporary status toast
  const triggerToast = useCallback((msg: string) => {
    setStatusMessage(msg);
  }, []);

  // --- LocalStorage Restoration & Persistence ---
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.entries)) {
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
      }
    } catch {
      // Ignore storage access errors
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
        })
      );
    } catch {
      // Ignore quota or storage errors
    }
  }, [entries, weightMode, theme, soundEnabled, isHydrated]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  // --- Theme Synchronization ---
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // --- Canvas High-DPI Wheel Renderer ---
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.max(240, Math.min(rect.width, rect.height));
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
    // Leave padding for the top pointer and outer rim
    const outerRadius = size / 2 - 18;
    const rotation = rotationRef.current;

    const isDark = theme === 'dark';
    const borderColor = isDark ? '#27272A' : '#E4E4E7';
    const surfaceColor = isDark ? '#18181B' : '#FFFFFF';
    const mutedTextColor = isDark ? '#A1A1AA' : '#71717A';

    // Outer subtle rim ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius + 5, 0, Math.PI * 2);
    ctx.fillStyle = surfaceColor;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    // Case 0: Empty Wheel
    if (activeSegments.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#141417' : '#F4F4F5';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = borderColor;
      ctx.stroke();

      ctx.fillStyle = mutedTextColor;
      ctx.font = '500 14px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add entries on the right to spin', cx, cy - 48);
      ctx.restore();
      return;
    }

    // Draw each segment
    const n = activeSegments.length;
    const innerHubRadius = Math.max(34, outerRadius * 0.17);

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

      // Dim non-winning segments slightly when a winner is highlighted
      if (highlightedIndex !== null && !isHighlighted) {
        ctx.fillStyle = isDark ? 'rgba(9, 9, 11, 0.42)' : 'rgba(255, 255, 255, 0.38)';
        ctx.fill();
      }

      // Segment separator lines
      if (n > 1) {
        ctx.lineWidth = n > 60 ? 0.6 : 1.25;
        ctx.strokeStyle = isDark ? '#18181B' : '#FFFFFF';
        ctx.stroke();
      }

      // Highlight ring on winning segment
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
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        ctx.restore();
      }
    });

    // Draw radial segment labels
    activeSegments.forEach((seg) => {
      const midAngle = rotation + seg.startAngle + seg.sweepAngle / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(midAngle);

      // Available chord height at 65% radius determines max comfortable font size
      const labelRadius = outerRadius * 0.64;
      const arcHeight = seg.sweepAngle * labelRadius;
      const fontSize = Math.max(8.5, Math.min(15, arcHeight * 0.52, outerRadius * 0.068));

      // Skip rendering text only if segment is sub-pixel thin (> 180 segments)
      if (arcHeight > 4.5) {
        ctx.font = `500 ${fontSize.toFixed(1)}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = seg.color.text;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const maxTextWidth = outerRadius - innerHubRadius - 24;
        let displayLabel = seg.entry.label.trim();

        // Add subtle weight badge if in weighted mode and weight !== 1
        if (weightMode === 'weighted' && seg.entry.weight !== 1 && n <= 40) {
          displayLabel = `${displayLabel} (${seg.entry.weight}×)`;
        }

        // Truncate cleanly with ellipsis if needed
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

    // Draw subtle rim pegs when segment count is reasonable
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
  }, [activeSegments, highlightedIndex, theme, weightMode]);

  // Redraw whenever dependencies or container size changes
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

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // --- Spin Engine & Cryptographic Winner Synchronization ---
  const spinWheel = useCallback(() => {
    if (isSpinning || activeSegments.length === 0) return;

    setIsSpinning(true);
    setWinner(null);
    setShowWinnerModal(false);
    setHighlightedIndex(null);
    setConfirmingClear(false);

    // 1. Select winner strictly using Web Crypto API
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

    // 2. Pick a random landing offset inside the chosen segment (within central 72% to avoid borderline ambiguity)
    const margin = chosenSegment.sweepAngle * 0.14;
    const innerSweep = Math.max(0.001, chosenSegment.sweepAngle - margin * 2);
    const angleInsideSegment =
      chosenSegment.startAngle + margin + getCryptoRandomFloat() * innerSweep;

    // 3. Calculate target rotation so that `angleInsideSegment` lands directly under the top pointer (-π/2)
    const twoPi = Math.PI * 2;
    const pointerAngle = -Math.PI / 2;
    const desiredMod = (((pointerAngle - angleInsideSegment) % twoPi) + twoPi) % twoPi;

    const startRotation = rotationRef.current;
    const currentMod = ((startRotation % twoPi) + twoPi) % twoPi;
    let deltaMod = desiredMod - currentMod;
    if (deltaMod <= 0) {
      deltaMod += twoPi;
    }

    // Add 6 to 9 full rotations for satisfying momentum
    const fullSpins = getCryptoRandomInt(6, 9);
    const totalDelta = fullSpins * twoPi + deltaMod;
    const targetRotation = startRotation + totalDelta;

    // Duration between 4.4s and 5.2s
    const duration = 4400 + getCryptoRandomFloat() * 800;
    const startTime = performance.now();

    let previousSegmentIndex =
      getSegmentAtPointer(startRotation, activeSegments)?.index ?? -1;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Smooth two-stage easing: brief initial torque ramp + long quintic friction deceleration
      const accelBreakpoint = 0.09;
      let progress: number;
      const k = 5; // quintic deceleration exponent
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

      // Detect segment boundary crossing under the top pointer for mechanical tick feedback
      const currentSeg = getSegmentAtPointer(currentRotation, activeSegments);
      if (currentSeg && currentSeg.index !== previousSegmentIndex) {
        previousSegmentIndex = currentSeg.index;
        const remainingSpeed = Math.max(0.15, 1 - t);
        if (soundEnabled) {
          soundEngine.playTick(remainingSpeed);
        }
        pointerKickDecayRef.current = Math.min(20, 7 + remainingSpeed * 14);
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
        // Ensure exact final angle alignment and verify synchronized winner
        rotationRef.current = targetRotation % twoPi;
        setPointerKick(0);
        setIsSpinning(false);

        const finalSeg = getSegmentAtPointer(rotationRef.current, activeSegments) || chosenSegment;
        setHighlightedIndex(finalSeg.index);
        setWinner({
          entry: finalSeg.entry,
          index: finalSeg.index,
          timestamp: Date.now(),
        });
        setShowWinnerModal(true);

        if (soundEnabled) {
          soundEngine.playWinChime();
        }
        drawWheel();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isSpinning, activeSegments, weightMode, soundEnabled, drawWheel]);

  // --- Entry Management Handlers ---
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
    triggerToast('Entries shuffled');
  };

  const handleClearAll = () => {
    if (isSpinning) return;
    setEntries([]);
    setWinner(null);
    setShowWinnerModal(false);
    setHighlightedIndex(null);
    setConfirmingClear(false);
    triggerToast('All entries cleared');
  };

  const handleRemoveWinner = () => {
    if (!winner) return;
    const winnerId = winner.entry.id;
    setEntries((prev) => prev.filter((item) => item.id !== winnerId));
    setWinner(null);
    setShowWinnerModal(false);
    setHighlightedIndex(null);
    triggerToast('Removed selected question');
  };

  const handleSpinAgain = () => {
    setWinner(null);
    setShowWinnerModal(false);
    setHighlightedIndex(null);
    // Trigger immediate fresh spin on next microtask
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

  const handleAddSingleEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSpinning || !newItemLabel.trim()) return;
    const newEntry: WheelEntry = {
      id: `entry-${Date.now()}-${getCryptoRandomInt(1000, 9999)}`,
      label: newItemLabel.trim(),
      weight: Math.max(1, Math.min(99, Number(newItemWeight) || 1)),
    };
    setEntries((prev) => [...prev, newEntry]);
    setNewItemLabel('');
    setNewItemWeight(1);
    setHighlightedIndex(null);
  };

  const handleLoadSamplePreset = () => {
    if (isSpinning) return;
    setEntries(DEFAULT_ENTRIES);
    setWinner(null);
    setHighlightedIndex(null);
    triggerToast('Sample entries restored');
  };

  // --- JSON Import & Export ---
  const handleExportJSON = () => {
    const payload: WheelConfigExport = {
      version: 1,
      weightMode,
      entries: entries
        .filter((e) => e.label.trim().length > 0)
        .map((e) => ({ label: e.label.trim(), weight: e.weight })),
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
    triggerToast('Configuration exported as JSON');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(String(event.target?.result || '{}'));
        if (!Array.isArray(raw.entries)) {
          triggerToast('Invalid JSON format: missing entries array');
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

        setEntries(importedEntries);
        setWinner(null);
        setHighlightedIndex(null);
        triggerToast(`Imported ${importedEntries.length} entries`);
      } catch {
        triggerToast('Could not parse JSON file');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Keyboard shortcut: Ctrl/Cmd + Enter to Spin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        spinWheel();
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
  }, [spinWheel, activeModal, showWinnerModal]);

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-150 ${
        isDark
          ? 'bg-[#09090B] text-[#FAFAFA]'
          : 'bg-[#FAFAFA] text-[#18181B]'
      }`}
      style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* ==========================================
          HEADER
      ========================================== */}
      <header
        className={`h-14 border-b px-4 sm:px-6 flex items-center justify-between shrink-0 ${
          isDark
            ? 'bg-[#121215] border-[#27272A]'
            : 'bg-[#FFFFFF] border-[#E4E4E7]'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#6366F1] flex items-center justify-center text-white shadow-xs">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="2.5" />
              <line x1="12" y1="3" x2="12" y2="9.5" />
              <line x1="19.79" y1="16.5" x2="14.16" y2="13.25" />
              <line x1="4.21" y1="16.5" x2="9.84" y2="13.25" />
            </svg>
          </div>
          <span className="font-medium text-base tracking-tight">Wheel</span>
        </div>

        {/* Navigation & Utilities */}
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <button
            type="button"
            onClick={() => setActiveModal('about')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isDark
                ? 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>About</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('help')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              isDark
                ? 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help</span>
          </button>

          <div
            className={`h-4 w-[1px] mx-1 ${
              isDark ? 'bg-[#27272A]' : 'bg-[#E4E4E7]'
            }`}
          />

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            className={`p-2 rounded-md transition-colors ${
              isDark
                ? 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`p-2 rounded-md transition-colors ${
              isDark
                ? 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/60'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </nav>
      </header>

      {/* ==========================================
          MAIN TWO-COLUMN WORKSPACE
      ========================================== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT PANEL — WHEEL STAGE */}
        <section
          aria-label="Spinning Wheel"
          className="lg:col-span-7 flex flex-col items-center justify-center w-full"
        >
          {/* Wheel Interactive Container */}
          <div
            ref={containerRef}
            className="relative w-full max-w-[min(490px,max(220px,calc(100svh-140px)))] aspect-square flex items-center justify-center select-none"
          >
            {/* Fixed Top Pointer at 12 o'clock */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              style={{
                transform: `translateX(-50%) rotate(${-pointerKick}deg)`,
                transformOrigin: '50% 6px',
                transition: isSpinning ? 'none' : 'transform 150ms ease-out',
              }}
            >
              <svg
                width="32"
                height="36"
                viewBox="0 0 32 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm"
              >
                <path
                  d="M16 34L4 10C2.6 7.2 4.6 4 7.8 4H24.2C27.4 4 29.4 7.2 28 10L16 34Z"
                  fill={isDark ? '#FAFAFA' : '#18181B'}
                  stroke={isDark ? '#18181B' : '#FFFFFF'}
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <circle
                  cx="16"
                  cy="10"
                  r="3"
                  fill="#6366F1"
                />
              </svg>
            </div>

            {/* HTML5 Canvas Wheel */}
            <canvas
              ref={canvasRef}
              onClick={spinWheel}
              className={`rounded-full transition-opacity ${
                activeSegments.length > 0 && !isSpinning
                  ? 'cursor-pointer'
                  : 'cursor-default'
              }`}
              aria-label="Random Picker Wheel Canvas"
            />

            {/* Center Spin Hub Button */}
            <button
              type="button"
              onClick={spinWheel}
              disabled={isSpinning || activeSegments.length === 0}
              aria-label="Spin the wheel"
              className={`absolute z-20 w-18 h-18 sm:w-20 sm:h-20 rounded-full font-medium text-xs sm:text-sm tracking-wide uppercase transition-all flex flex-col items-center justify-center border-4 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2 ${
                isDark
                  ? 'bg-[#18181B] text-[#FAFAFA] border-[#27272A] hover:border-[#6366F1]'
                  : 'bg-[#FFFFFF] text-[#18181B] border-[#E4E4E7] hover:border-[#6366F1]'
              } ${
                isSpinning || activeSegments.length === 0
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:scale-105 active:scale-95 cursor-pointer'
              }`}
            >
              <span className="font-semibold">
                {isSpinning ? '•••' : 'Spin'}
              </span>
            </button>
          </div>

          {/* Winner Banner / Live Result Card */}
          <div className="w-full max-w-[min(490px,max(220px,calc(100svh-140px)))] mt-4 min-h-[92px]">
            {winner ? (
              <div
                role="status"
                aria-live="polite"
                className={`w-full rounded-lg border p-4 transition-all ${
                  isDark
                    ? 'bg-[#121215] border-[#27272A]'
                    : 'bg-[#FFFFFF] border-[#E4E4E7]'
                } shadow-xs`}
              >
                <div className="flex flex-col gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[#6366F1]">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>THE QUESTION IS :</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWinnerModal(true)}
                        className="text-xs text-[#6366F1] hover:underline font-medium shrink-0 cursor-pointer"
                      >
                        View Pop-up
                      </button>
                    </div>
                    <h2
                      className="text-base sm:text-lg font-medium tracking-tight leading-snug break-words mt-1.5"
                    >
                      {winner.entry.label}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={handleSpinAgain}
                      className="px-3.5 py-2 rounded-md text-xs font-medium bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Spin Again</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveWinner}
                      className={`px-3.5 py-2 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                        isDark
                          ? 'border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#FAFAFA]'
                          : 'border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#F4F4F5] text-[#18181B]'
                      }`}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`w-full rounded-lg border px-4 py-3.5 flex items-center justify-between text-xs ${
                  isDark
                    ? 'bg-[#121215]/60 border-[#27272A] text-[#A1A1AA]'
                    : 'bg-[#FFFFFF] border-[#E4E4E7] text-[#71717A]'
                }`}
              >
                <span>
                  {isSpinning
                    ? 'Spinning wheel...'
                    : activeSegments.length === 0
                    ? 'No active entries on the wheel.'
                    : `Ready to pick from ${activeSegments.length} ${
                        activeSegments.length === 1 ? 'entry' : 'entries'
                      }.`}
                </span>
                <span className="hidden sm:inline font-mono text-[11px] opacity-75">
                  ⌘ / Ctrl + Enter
                </span>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT PANEL — ENTRY EDITOR */}
        <section
          aria-label="Entry Editor"
          className={`lg:col-span-5 w-full rounded-lg border flex flex-col ${
            isDark
              ? 'bg-[#121215] border-[#27272A]'
              : 'bg-[#FFFFFF] border-[#E4E4E7]'
          }`}
        >
          {/* Panel Header */}
          <div
            className={`p-4 border-b flex items-center justify-between gap-2 ${
              isDark ? 'border-[#27272A]' : 'border-[#E4E4E7]'
            }`}
          >
            <div className="flex items-center gap-2">
              <h1 className="font-medium text-sm tracking-tight">Entries</h1>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  isDark
                    ? 'bg-[#18181B] border-[#27272A] text-[#A1A1AA]'
                    : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#71717A]'
                }`}
              >
                {activeSegments.length}
              </span>
            </div>

            {/* Editor View & Weight Mode Toggles */}
            <div className="flex items-center gap-1.5">
              <div
                className={`inline-flex rounded-md p-0.5 border ${
                  isDark
                    ? 'bg-[#09090B] border-[#27272A]'
                    : 'bg-[#F4F4F5] border-[#E4E4E7]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setEditorTab('bulk')}
                  className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                    editorTab === 'bulk'
                      ? isDark
                        ? 'bg-[#27272A] text-[#FAFAFA]'
                        : 'bg-[#FFFFFF] text-[#18181B] shadow-2xs'
                      : isDark
                      ? 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                      : 'text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  <AlignLeft className="w-3 h-3" />
                  <span>Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('list')}
                  className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                    editorTab === 'list'
                      ? isDark
                        ? 'bg-[#27272A] text-[#FAFAFA]'
                        : 'bg-[#FFFFFF] text-[#18181B] shadow-2xs'
                      : isDark
                      ? 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                      : 'text-[#71717A] hover:text-[#18181B]'
                  }`}
                >
                  <List className="w-3 h-3" />
                  <span>Items</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = weightMode === 'equal' ? 'weighted' : 'equal';
                  setWeightMode(next);
                  if (next === 'weighted') {
                    setEditorTab('list');
                  }
                }}
                title="Toggle equal vs weighted probability mode"
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1 ${
                  weightMode === 'weighted'
                    ? 'border-[#6366F1] bg-[#6366F1]/10 text-[#6366F1]'
                    : isDark
                    ? 'border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]'
                    : 'border-[#E4E4E7] text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{weightMode === 'weighted' ? 'Weighted' : 'Equal'}</span>
              </button>
            </div>
          </div>

          {/* Action Toolbar: Shuffle, Clear, Import/Export */}
          <div
            className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
              isDark
                ? 'bg-[#18181B]/40 border-[#27272A]'
                : 'bg-[#FAFAFA] border-[#E4E4E7]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShuffle}
                disabled={isSpinning || activeSegments.length <= 1}
                className={`px-2.5 py-1.5 rounded-md font-medium border transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isDark
                    ? 'border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#FAFAFA]'
                    : 'border-[#E4E4E7] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#18181B]'
                }`}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>

              {!confirmingClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmingClear(true)}
                  disabled={isSpinning || entries.length === 0}
                  className={`px-2.5 py-1.5 rounded-md font-medium border transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDark
                      ? 'border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#FAFAFA]'
                      : 'border-[#E4E4E7] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#18181B]'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2.5 py-1.5 rounded-md font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                  >
                    Confirm Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(false)}
                    className={`px-2 py-1.5 rounded-md font-medium border ${
                      isDark
                        ? 'border-[#27272A] text-[#A1A1AA]'
                        : 'border-[#E4E4E7] text-[#71717A]'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* JSON Import / Export */}
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
                title="Import JSON configuration"
                className={`p-1.5 rounded-md border transition-colors disabled:opacity-40 ${
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
                title="Export JSON configuration"
                className={`p-1.5 rounded-md border transition-colors disabled:opacity-40 ${
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
          <div className="p-4 flex-1 flex flex-col">
            {editorTab === 'bulk' ? (
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="entries-textarea"
                    className={`text-xs ${
                      isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]'
                    }`}
                  >
                    One question or entry per line
                  </label>
                  {entries.length === 0 && (
                    <button
                      type="button"
                      onClick={handleLoadSamplePreset}
                      className="text-xs text-[#6366F1] hover:underline font-medium"
                    >
                      Restore sample questions
                    </button>
                  )}
                </div>
                <textarea
                  id="entries-textarea"
                  value={bulkTextValue}
                  onChange={handleBulkTextChange}
                  disabled={isSpinning}
                  placeholder="Enter questions or names, one per line..."
                  rows={12}
                  className={`w-full flex-1 min-h-[280px] max-h-[380px] rounded-md border p-3 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[#6366F1] transition-colors ${
                    isDark
                      ? 'bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder-[#52525B]'
                      : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#18181B] placeholder-[#A1A1AA]'
                  }`}
                />
              </div>
            ) : (
              <div className="flex flex-col flex-1">
                {/* Add Individual Entry Form */}
                <form onSubmit={handleAddSingleEntry} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    disabled={isSpinning}
                    placeholder="Add a long question or entry..."
                    className={`flex-1 min-w-0 rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] ${
                      isDark
                        ? 'bg-[#09090B] border-[#27272A] text-[#FAFAFA] placeholder-[#52525B]'
                        : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#18181B] placeholder-[#A1A1AA]'
                    }`}
                  />
                  {weightMode === 'weighted' && (
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={newItemWeight}
                      onChange={(e) => setNewItemWeight(Number(e.target.value) || 1)}
                      disabled={isSpinning}
                      aria-label="Entry weight"
                      title="Weight multiplier"
                      className={`w-16 rounded-md border px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#6366F1] ${
                        isDark
                          ? 'bg-[#09090B] border-[#27272A] text-[#FAFAFA]'
                          : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#18181B]'
                      }`}
                    />
                  )}
                  <button
                    type="submit"
                    disabled={isSpinning || !newItemLabel.trim()}
                    className="px-3 py-1.5 rounded-md bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Individual Entries Scrollable List */}
                <div
                  className={`flex-1 min-h-[250px] max-h-[340px] overflow-y-auto rounded-md border divide-y ${
                    isDark
                      ? 'bg-[#09090B] border-[#27272A] divide-[#27272A]'
                      : 'bg-[#FAFAFA] border-[#E4E4E7] divide-[#E4E4E7]'
                  }`}
                >
                  {entries.length === 0 ? (
                    <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                      <p
                        className={`text-xs mb-2 ${
                          isDark ? 'text-[#71717A]' : 'text-[#A1A1AA]'
                        }`}
                      >
                        No entries yet.
                      </p>
                      <button
                        type="button"
                        onClick={handleLoadSamplePreset}
                        className="text-xs text-[#6366F1] hover:underline font-medium"
                      >
                        Load sample entries
                      </button>
                    </div>
                  ) : (
                    entries.map((item, idx) => {
                      const colorDot = WHEEL_PALETTE[idx % WHEEL_PALETTE.length].bg;
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-2 px-2.5 py-2 text-sm"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                            style={{ backgroundColor: colorDot }}
                          />
                          <textarea
                            rows={Math.min(4, Math.max(1, Math.ceil(item.label.length / 42)))}
                            value={item.label}
                            onChange={(e) =>
                              handleUpdateEntryLabel(item.id, e.target.value.replace(/\r?\n/g, ' '))
                            }
                            disabled={isSpinning}
                            aria-label={`Edit entry ${idx + 1}`}
                            className="flex-1 min-w-0 bg-transparent focus:outline-none text-sm leading-snug resize-none break-words"
                          />

                          {weightMode === 'weighted' && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateEntryWeight(item.id, -1)}
                                disabled={isSpinning || item.weight <= 1}
                                aria-label="Decrease weight"
                                className={`p-1 rounded border disabled:opacity-30 ${
                                  isDark
                                    ? 'border-[#27272A] hover:bg-[#27272A]'
                                    : 'border-[#E4E4E7] hover:bg-[#E4E4E7]/60'
                                }`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-mono">
                                {item.weight}×
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateEntryWeight(item.id, 1)}
                                disabled={isSpinning || item.weight >= 99}
                                aria-label="Increase weight"
                                className={`p-1 rounded border disabled:opacity-30 ${
                                  isDark
                                    ? 'border-[#27272A] hover:bg-[#27272A]'
                                    : 'border-[#E4E4E7] hover:bg-[#E4E4E7]/60'
                                }`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteSingleEntry(item.id)}
                            disabled={isSpinning}
                            aria-label={`Remove ${item.label}`}
                            className={`p-1 rounded transition-colors ${
                              isDark
                                ? 'text-[#71717A] hover:text-rose-400 hover:bg-[#27272A]'
                                : 'text-[#A1A1AA] hover:text-rose-600 hover:bg-[#E4E4E7]/50'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Status Toast Indicator */}
            {statusMessage && (
              <div
                role="status"
                className={`mt-3 px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 border ${
                  isDark
                    ? 'bg-[#18181B] border-[#27272A] text-[#FAFAFA]'
                    : 'bg-[#FAFAFA] border-[#E4E4E7] text-[#18181B]'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Prominent Spin Action Button */}
            <div className="mt-4 pt-3 border-t border-inherit">
              <button
                type="button"
                onClick={spinWheel}
                disabled={isSpinning || activeSegments.length === 0}
                className="w-full py-2.5 px-4 rounded-md bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Spinning...' : 'Spin Wheel'}</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ==========================================
          POP-UP MODAL: THE QUESTION IS
      ========================================== */}
      {showWinnerModal && winner && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="winner-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
          onClick={() => setShowWinnerModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg rounded-xl border p-6 sm:p-7 shadow-xl transition-all ${
              isDark
                ? 'bg-[#121215] border-[#27272A] text-[#FAFAFA]'
                : 'bg-[#FFFFFF] border-[#E4E4E7] text-[#18181B]'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#6366F1]">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span id="winner-modal-title">THE QUESTION IS :</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                aria-label="Close question pop-up"
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-[#27272A] text-[#A1A1AA]' : 'hover:bg-[#F4F4F5] text-[#71717A]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`my-6 p-4 sm:p-5 rounded-lg border max-h-[55vh] overflow-y-auto ${
                isDark
                  ? 'bg-[#18181B]/70 border-[#27272A]'
                  : 'bg-[#FAFAFA] border-[#E4E4E7]'
              }`}
            >
              <p className="text-lg sm:text-xl font-medium leading-relaxed break-words whitespace-pre-wrap">
                {winner.entry.label}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleRemoveWinner}
                className={`px-4 py-2.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isDark
                    ? 'border-[#27272A] bg-[#18181B] hover:bg-[#27272A] text-[#FAFAFA]'
                    : 'border-[#E4E4E7] bg-[#FFFFFF] hover:bg-[#F4F4F5] text-[#18181B]'
                }`}
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Remove Question</span>
              </button>
              <button
                type="button"
                onClick={handleSpinAgain}
                className="px-4 py-2.5 rounded-md text-xs font-medium bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Spin Again</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODALS: ABOUT & HELP
      ========================================== */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px]"
          onClick={() => setActiveModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-lg border p-5 shadow-lg ${
              isDark
                ? 'bg-[#121215] border-[#27272A] text-[#FAFAFA]'
                : 'bg-[#FFFFFF] border-[#E4E4E7] text-[#18181B]'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <h2 id="modal-title" className="font-medium text-base">
                {activeModal === 'about' ? 'About Wheel' : 'How to Use Wheel'}
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
                className={`p-1 rounded-md ${
                  isDark ? 'hover:bg-[#27272A]' : 'hover:bg-[#F4F4F5]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeModal === 'about' ? (
              <div
                className={`mt-4 space-y-3 text-xs leading-relaxed ${
                  isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]'
                }`}
              >
                <p>
                  <strong className={isDark ? 'text-[#FAFAFA]' : 'text-[#18181B]'}>
                    Wheel
                  </strong>{' '}
                  is a minimalist, high-precision random name picker built for speed,
                  clarity, and unbiased selection.
                </p>
                <p>
                  <strong className={isDark ? 'text-[#FAFAFA]' : 'text-[#18181B]'}>
                    True Random Selection:
                  </strong>{' '}
                  Every spin selects its winner using hardware-seeded system entropy for
                  genuinely fair and unpredictable results on every turn.
                </p>
                <p>
                  <strong className={isDark ? 'text-[#FAFAFA]' : 'text-[#18181B]'}>
                    Synchronized Physics:
                  </strong>{' '}
                  The HTML5 Canvas wheel calculates exact angular geometry for 1 to 100+
                  entries and smoothly decelerates so the physical pointer lands directly
                  on the selected entry.
                </p>
              </div>
            ) : (
              <div
                className={`mt-4 space-y-2.5 text-xs leading-relaxed ${
                  isDark ? 'text-[#A1A1AA]' : 'text-[#71717A]'
                }`}
              >
                <p>
                  <strong className={isDark ? 'text-[#FAFAFA]' : 'text-[#18181B]'}>
                    1. Enter Names:
                  </strong>{' '}
                  Use the <em>Text</em> tab to paste or type one entry per line, or switch
                  to <em>Items</em> to add, edit, or delete individual entries.
                </p>
                <p>
                  <strong className={isDark ? 'text-[#FAFAFA]' : 'text-[#18181B]'}>
                    2. Spin the Wheel:
                  </strong>{' '}
                  Click the center <strong>SPIN</strong> button, click anywhere on the
                  wheel, or press <code className="font-mono">Ctrl/⌘ + Enter</code>.
                </p>
                <p>
                  <strong className={isDark ? 'text-[#FAFAFA]' : 'text-[#18181B]'}>
                    3. Weighted Mode:
                  </strong>{' '}
                  Toggle <em>Equal / Weighted</em> at the top of the Entries panel to
                  assign custom probability multipliers to individual entries.
                </p>
                <p>
                  <strong className={isDark ? 'text-[#FAFAFA]' : 'text-[#18181B]'}>
                    4. Import &amp; Export:
                  </strong>{' '}
                  Use the upload and download icons in the toolbar to save or restore wheel
                  configurations as portable JSON files.
                </p>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}