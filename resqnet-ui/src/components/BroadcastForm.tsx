import React, { useState } from 'react';
import { Circle, Square, PenLine, AlertTriangle, ChevronUp, ChevronDown, Radio, RotateCcw } from 'lucide-react';

export interface BroadcastMessage {
  message:     string;
  radius:      number;
  priority:    'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  coordinates: [number, number];
}

export type DrawMode = 'circle' | 'square' | 'freehand';

interface BroadcastFormProps {
  onSubmit:          (data: BroadcastMessage) => void;
  onChange?:         (data: BroadcastMessage) => void;
  onDrawModeChange?: (mode: DrawMode) => void;
  onActivate?:       () => void;
  onCancel?:         () => void;
  loading?:          boolean;
  liveRadiusKm?:     number;
  onRadiusChange?:   (r: number) => void;
  isPlacingAlert?:   boolean;
  coordinates?:      [number, number];
}

const PRIORITY_COLORS: Record<BroadcastMessage['priority'], string> = {
  LOW:    'bg-gray-300 text-gray-800',
  MEDIUM: 'bg-yellow-400 text-yellow-900',
  HIGH:   'bg-orange-500 text-white',
  URGENT: 'bg-red-600 text-white',
};

const PRIORITY_ACTIVE: Record<BroadcastMessage['priority'], string> = {
  LOW:    'ring-2 ring-offset-1 ring-gray-500',
  MEDIUM: 'ring-2 ring-offset-1 ring-yellow-500',
  HIGH:   'ring-2 ring-offset-1 ring-orange-500',
  URGENT: 'ring-2 ring-offset-1 ring-red-600',
};

const DEFAULT_FORM: BroadcastMessage = {
  message:     '',
  radius:      1,
  priority:    'MEDIUM',
  coordinates: [0, 0],
};

const BroadcastForm: React.FC<BroadcastFormProps> = ({
  onSubmit,
  onChange,
  onDrawModeChange,
  onActivate,
  onCancel,
  loading = false,
  liveRadiusKm,
  onRadiusChange,
  isPlacingAlert = false,
  coordinates,
}) => {
  const [broadcast, setBroadcast]     = useState<BroadcastMessage>(DEFAULT_FORM);
  const [drawMode, setDrawMode]       = useState<DrawMode>('circle');
  const [messageError, setMessageError] = useState(false);

  const displayRadius = liveRadiusKm ?? broadcast.radius;

  const updateBroadcast = (next: BroadcastMessage) => {
    setBroadcast(next);
    onChange?.(next);
    if (next.message.trim()) setMessageError(false);
  };

  const handleReset = () => {
    setBroadcast(DEFAULT_FORM);
    onChange?.(DEFAULT_FORM);
    onRadiusChange?.(DEFAULT_FORM.radius);
    setMessageError(false);
  };

  const handlePriority = (priority: BroadcastMessage['priority']) =>
    updateBroadcast({ ...broadcast, priority });

  const handleRadiusInput = (val: number) => {
    const clamped = Math.max(0.1, Math.round(val * 10) / 10);
    updateBroadcast({ ...broadcast, radius: clamped });
    onRadiusChange?.(clamped);
  };

  const handleDrawMode = (mode: DrawMode) => {
    setDrawMode(mode);
    onDrawModeChange?.(mode);
  };

  const handleActivate = () => {
    if (!broadcast.message.trim()) { setMessageError(true); return; }
    setMessageError(false);
    onActivate?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.message.trim()) { setMessageError(true); return; }

    const coords: [number, number] = coordinates ?? [0, 0];

    onSubmit({
      ...broadcast,
      radius:      displayRadius,
      coordinates: coords,
      priority:    broadcast.priority.toLowerCase() as any,  // LOW → low for backend
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* ── Draw mode ── */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Mode</span>
        {([
          { mode: 'circle'   as DrawMode, Icon: Circle,  label: 'Circle'    },
          { mode: 'square'   as DrawMode, Icon: Square,  label: 'Rectangle' },
          { mode: 'freehand' as DrawMode, Icon: PenLine, label: 'Freehand'  },
        ] as const).map(({ mode, Icon, label }) => (
          <button
            key={mode}
            type="button"
            title={label}
            onClick={() => handleDrawMode(mode)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all
              ${drawMode === mode
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'
              }`}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {/* ── Message ── */}
      <div>
        <textarea
          name="message"
          value={broadcast.message}
          onChange={(e) => updateBroadcast({ ...broadcast, message: e.target.value })}
          rows={2}
          placeholder="Alert message..."
          className={`w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 placeholder-gray-400 resize-none transition-colors
            ${messageError
              ? 'border-red-400 focus:ring-red-300 bg-red-50'
              : 'border-gray-200 focus:ring-gray-300'
            }`}
        />
        {messageError && (
          <p className="text-xs text-red-500 mt-1">Message required before placing.</p>
        )}
      </div>

      {/* ── Coordinates display (read-only) ── */}
      {coordinates && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-gray-400 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <span className="text-[11px] text-gray-500 font-mono">
            {coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}
          </span>
        </div>
      )}

      {/* ── Radius ── */}
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0.1"
          max="50"
          step="0.1"
          value={displayRadius}
          onChange={(e) => handleRadiusInput(Number(e.target.value))}
          className="flex-1 h-1.5 accent-gray-900"
        />
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => handleRadiusInput(displayRadius - 0.1)}
            className="px-1.5 py-1 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronDown size={13} />
          </button>
          <input
            type="number"
            min="0.1"
            max="50"
            step="0.1"
            value={displayRadius.toFixed(1)}
            onChange={(e) => handleRadiusInput(Number(e.target.value))}
            className="w-12 text-center text-xs font-mono border-none outline-none py-1"
          />
          <button
            type="button"
            onClick={() => handleRadiusInput(displayRadius + 0.1)}
            className="px-1.5 py-1 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronUp size={13} />
          </button>
        </div>
        <span className="text-[11px] text-gray-400 font-mono shrink-0">km</span>
      </div>

      {/* ── Priority dots ── */}
      <div className="flex items-center gap-2">
        <AlertTriangle size={13} className="text-gray-400 shrink-0" />
        <div className="flex gap-2">
          {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
            <button
              key={p}
              type="button"
              title={p}
              onClick={() => handlePriority(p)}
              className={`w-6 h-6 rounded-full transition-all ${PRIORITY_COLORS[p]}
                ${broadcast.priority === p
                  ? PRIORITY_ACTIVE[p] + ' scale-110'
                  : 'opacity-50 hover:opacity-80'
                }`}
            />
          ))}
        </div>
        <span className="text-[11px] text-gray-400 ml-auto">{broadcast.priority}</span>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleReset}
          title="Reset form"
          className="w-9 h-9 rounded-lg border border-gray-200 text-gray-400 flex items-center justify-center hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0"
        >
          <RotateCcw size={14} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (isPlacingAlert) {
              onCancel?.();
            } else {
              handleActivate();
            }
          }}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all
            ${loading
              ? 'opacity-50 cursor-not-allowed bg-gray-900 text-white'
              : isPlacingAlert
                ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300'
                : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}
        >
          <Radio size={15} className={isPlacingAlert ? 'animate-pulse' : ''} />
          <span>
            {loading ? 'Sending...' : isPlacingAlert ? 'Placing...' : 'Place on Map'}
          </span>
        </button>
      </div>

    </form>
  );
};

export default BroadcastForm;
