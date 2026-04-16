import React, { useState } from "react";
import {
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

export interface SafeZoneFormData {
  name: string;
  description?: string;
  category:
    | "shelter"
    | "medical"
    | "evacuation_point"
    | "command_post"
    | "other";
  status: "active" | "at_capacity" | "closed";
  radius_m: number;
  capacity?: number;
  contact_info?: string;
}

interface SafeZoneFormProps {
  onActivate?: (data: SafeZoneFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
  isPlacingSafeZone?: boolean;
  liveRadiusM?: number;
  onRadiusChange?: (r: number) => void;
  coordinates?: [number, number];
}

const CATEGORIES = [
  { value: "shelter", label: "Shelter" },
  { value: "medical", label: "Medical" },
  { value: "evacuation_point", label: "Evacuation Point" },
  { value: "command_post", label: "Command Post" },
  { value: "other", label: "Other" },
] as const;

const DEFAULT_FORM: SafeZoneFormData = {
  name: "",
  description: "",
  category: "shelter",
  status: "active",
  radius_m: 500,
  capacity: undefined,
  contact_info: "",
};

const SafeZoneForm: React.FC<SafeZoneFormProps> = ({
  onActivate,
  onCancel,
  loading = false,
  isPlacingSafeZone = false,
  liveRadiusM,
  onRadiusChange,
  coordinates,
}) => {
  const [form, setForm] = useState<SafeZoneFormData>(DEFAULT_FORM);
  const [nameError, setNameError] = useState(false);

  const displayRadius = liveRadiusM ?? form.radius_m;

  const update = (next: Partial<SafeZoneFormData>) => {
    const merged = { ...form, ...next };
    setForm(merged);
    if (merged.name.trim()) setNameError(false);
  };

  const handleRadiusInput = (val: number) => {
    const clamped = Math.max(50, Math.round(val));
    update({ radius_m: clamped });
    onRadiusChange?.(clamped);
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    onRadiusChange?.(DEFAULT_FORM.radius_m);
    setNameError(false);
  };

  const handleActivate = () => {
    if (!form.name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    onActivate?.(form);
  };

  return (
    <div className="space-y-3">
      {/* Name */}
      <div>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Zone name (required)"
          className={`w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 placeholder-gray-400 transition-colors
            ${
              nameError
                ? "border-red-400 focus:ring-red-300 bg-red-50"
                : "border-gray-200 focus:ring-gray-300"
            }`}
        />
        {nameError && (
          <p className="text-xs text-red-500 mt-1">
            Name required before placing.
          </p>
        )}
      </div>

      {/* Description */}
      <textarea
        value={form.description ?? ""}
        onChange={(e) => update({ description: e.target.value })}
        rows={2}
        placeholder="Description (optional)"
        className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-400 resize-none"
      />

      {/* Category */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium shrink-0">
          Type
        </span>
        <select
          value={form.category}
          onChange={(e) =>
            update({ category: e.target.value as SafeZoneFormData["category"] })
          }
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Radius */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium shrink-0">
          Radius
        </span>
        <input
          type="range"
          min="50"
          max="5000"
          step="50"
          value={displayRadius}
          onChange={(e) => handleRadiusInput(Number(e.target.value))}
          className="flex-1 h-1.5 accent-gray-900"
        />
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => handleRadiusInput(displayRadius - 50)}
            className="px-1.5 py-1 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronDown size={13} />
          </button>
          <input
            type="number"
            min="50"
            max="10000"
            step="50"
            value={displayRadius}
            onChange={(e) => handleRadiusInput(Number(e.target.value))}
            className="w-14 text-center text-xs font-mono border-none outline-none py-1"
          />
          <button
            type="button"
            onClick={() => handleRadiusInput(displayRadius + 50)}
            className="px-1.5 py-1 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronUp size={13} />
          </button>
        </div>
        <span className="text-[11px] text-gray-400 font-mono shrink-0">m</span>
      </div>

      {/* Capacity + Contact */}
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            min="1"
            value={form.capacity ?? ""}
            onChange={(e) =>
              update({
                capacity: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="Capacity"
            className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-400"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={form.contact_info ?? ""}
            onChange={(e) => update({ contact_info: e.target.value })}
            placeholder="Contact info"
            className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <AlertTriangle size={13} className="text-gray-400 shrink-0" />
        <div className="flex gap-1.5">
          {(["active", "at_capacity", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update({ status: s })}
              className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-all
                ${
                  form.status === s
                    ? s === "active"
                      ? "bg-green-100 text-green-800 border-green-400 ring-2 ring-green-300"
                      : s === "at_capacity"
                        ? "bg-yellow-100 text-yellow-800 border-yellow-400 ring-2 ring-yellow-300"
                        : "bg-gray-100 text-gray-600 border-gray-400 ring-2 ring-gray-300"
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                }`}
            >
              {s === "at_capacity" ? "AT CAP" : s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Coordinates display */}
      {coordinates && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-3 h-3 text-gray-400 shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
            />
          </svg>
          <span className="text-[11px] text-gray-500 font-mono">
            {coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}
          </span>
        </div>
      )}

      {/* Actions */}
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
          onClick={() => (isPlacingSafeZone ? onCancel?.() : handleActivate())}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all
            ${
              loading
                ? "opacity-50 cursor-not-allowed bg-gray-900 text-white"
                : isPlacingSafeZone
                  ? "bg-green-600 text-white hover:bg-green-700 ring-2 ring-green-300"
                  : "bg-gray-900 text-white hover:bg-gray-700"
            }`}
        >
          <ShieldCheck
            size={15}
            className={isPlacingSafeZone ? "animate-pulse" : ""}
          />
          <span>
            {loading
              ? "Creating..."
              : isPlacingSafeZone
                ? "Placing..."
                : "Place on Map"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default SafeZoneForm;
