import React, { useState } from "react";
import {
  Radio, MapPin, Pencil, Check, X,
  Trash2, AlertTriangle, Clock,
} from "lucide-react";
import type { BroadcastAlert } from "./map/types";

// ── Priority styles ────────────────────────────────────────────
const PRIORITY_STYLE: Record<string, string> = {
  LOW:    "bg-gray-100 text-gray-500 border-gray-300",
  MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-300",
  HIGH:   "bg-orange-50 text-orange-600 border-orange-300",
  URGENT: "bg-red-50 text-red-600 border-red-300",
};

const PRIORITY_DOT: Record<string, string> = {
  LOW:    "bg-gray-400",
  MEDIUM: "bg-yellow-400",
  HIGH:   "bg-orange-500",
  URGENT: "bg-red-500",
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:   "bg-emerald-50 text-emerald-600",
  UPDATED:  "bg-blue-50 text-blue-600",
  RESOLVED: "bg-gray-100 text-gray-400",
};

const PRIORITY_OPTS = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

// ── Props ──────────────────────────────────────────────────────
interface AlertCardProps {
  alert:    BroadcastAlert;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updated: BroadcastAlert) => void;
}

// ── Component ──────────────────────────────────────────────────
const AlertCard: React.FC<AlertCardProps> = ({ alert, onDelete, onUpdate }) => {
  const [editing, setEditing]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [form, setForm]           = useState({
    message:  alert.message,
    radius:   alert.radius,
    priority: alert.priority,
  });

  const priorityKey = alert.priority.toUpperCase();

  const handleSave = () => {
    onUpdate(alert.id, {
      ...alert,
      message:  form.message,
      radius:   form.radius,
      priority: form.priority as BroadcastAlert["priority"],
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({
      message:  alert.message,
      radius:   alert.radius,
      priority: alert.priority,
    });
    setEditing(false);
  };

  const fmt = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  };

  // ── Edit mode ────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="p-4 space-y-3">
        {/* Priority stripe */}
        <div className={`h-0.5 w-full rounded-full mb-1 ${PRIORITY_DOT[form.priority.toUpperCase()] ?? "bg-gray-300"}`} />

        <div>
          <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-1">
            Message
          </label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={3}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-800 resize-none bg-gray-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-1">
              Radius (km)
            </label>
            <input
              type="number"
              step="0.1"
              min={0.1}
              value={form.radius}
              onChange={(e) => setForm({ ...form, radius: parseFloat(e.target.value) })}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-800 font-mono bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-1">
              Priority
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as BroadcastAlert["priority"] })}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-800 bg-gray-50"
            >
              {PRIORITY_OPTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-mono uppercase tracking-wider transition-colors"
          >
            <Check size={12} /> Save
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 text-[11px] font-mono uppercase tracking-wider transition-colors"
          >
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── View mode ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Priority severity stripe */}
      <div className={`h-0.5 w-full ${PRIORITY_DOT[priorityKey] ?? "bg-gray-300"}`} />

      <div className="p-4 flex-1 space-y-3">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${PRIORITY_STYLE[priorityKey] ?? PRIORITY_STYLE.MEDIUM}`}>
              {alert.priority}
            </span>
            {alert.status && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase tracking-wider ${STATUS_STYLE[alert.status]}`}>
                {alert.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
            <Clock size={10} />
            {fmt(alert.timestamp)}
          </div>
        </div>

        {/* Message */}
        <div className="flex items-start gap-2">
          <Radio size={13} className="text-orange-500 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-800 font-medium leading-snug">{alert.message}</p>
        </div>

        {/* Description */}
        {alert.description && (
          <p className="text-xs text-gray-500 leading-relaxed pl-5">
            {alert.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 pl-5">
          <span className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
            <Radio size={10} className="text-gray-300" />
            {alert.radius} km
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
            <MapPin size={10} className="text-gray-300" />
            {alert.position[0].toFixed(3)}, {alert.position[1].toFixed(3)}
          </span>
        </div>

        {/* Updated by */}
        {alert.updatedBy && (
          <div className="pl-5 flex items-center gap-1.5">
            <div className="h-3 w-px bg-gray-200" />
            <p className="text-[10px] text-gray-400 font-mono">
              Updated by {alert.updatedBy.name ?? alert.updatedBy.email ?? "unknown"}
              {alert.updatedAt ? ` · ${fmt(alert.updatedAt)}` : ""}
            </p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center gap-2">
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-all text-[11px] font-mono uppercase tracking-wider shadow-sm"
        >
          <Pencil size={11} /> Edit
        </button>

        {!confirmDel ? (
          <button
            onClick={() => setConfirmDel(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-all text-[11px] font-mono uppercase tracking-wider shadow-sm"
          >
            <Trash2 size={11} /> Delete
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] text-red-500 font-mono mr-1 flex items-center gap-1">
              <AlertTriangle size={10} /> Confirm?
            </span>
            <button
              onClick={() => onDelete(alert.id)}
              className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 text-[11px] font-mono uppercase tracking-wider transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-500 hover:bg-gray-200 text-[11px] font-mono uppercase tracking-wider transition-colors"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertCard;
