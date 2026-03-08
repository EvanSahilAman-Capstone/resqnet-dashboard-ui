import React, { useState, useRef } from "react";
import {
  X, Radio, Clock, MapPin, User,
  Pencil, Check, Trash2, AlertTriangle,
  FileText, Map, Activity, ChevronDown,
} from "lucide-react";
import type { BroadcastAlert } from "./map/types";
import { useApi } from "../utils/api";

// ── Constants ──────────────────────────────────────────────────
const PRIORITY_OPTS = ["low", "medium", "high", "urgent"] as const;
const STATUS_OPTS   = ["ACTIVE", "UPDATED", "RESOLVED"] as const;

const PRIORITY_STYLE: Record<string, string> = {
  LOW:    "bg-gray-100 text-gray-600 border-gray-300",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-300",
  HIGH:   "bg-orange-100 text-orange-700 border-orange-300",
  URGENT: "bg-red-100 text-red-700 border-red-300",
};
const STATUS_STYLE: Record<string, string> = {
  ACTIVE:   "bg-green-100 text-green-700",
  UPDATED:  "bg-blue-100 text-blue-700",
  RESOLVED: "bg-gray-100 text-gray-500",
};

// ── Nav sections ───────────────────────────────────────────────
const NAV = [
  { id: "details", icon: FileText, label: "Details"  },
  { id: "mapping", icon: Map,      label: "Location" },
  { id: "audit",   icon: User,     label: "Audit"    },
  { id: "logs",    icon: Activity, label: "Logs"     },
];

// ── Inline editable field ──────────────────────────────────────
interface EditFieldProps {
  value:    string | number;
  type?:    "text" | "number" | "textarea" | "select";
  options?: readonly string[];
  onSave:   (val: string) => void;
  display?: React.ReactNode;
  step?:    string;
  min?:     number;
}

const EditField: React.FC<EditFieldProps> = ({
  value, type = "text", options, onSave, display, step, min,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(value));

  const commit = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(String(value)); setEditing(false); };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 group/field">
        <span className="text-sm text-gray-800 flex-1">{display ?? value}</span>
        <button
          onClick={() => { setDraft(String(value)); setEditing(true); }}
          className="opacity-0 group-hover/field:opacity-100 p-1 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-all"
        >
          <Pencil size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5">
      {type === "textarea" ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="flex-1 text-sm border border-orange-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800 resize-none"
        />
      ) : type === "select" && options ? (
        <select
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 text-sm border border-orange-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800 bg-white"
        >
          {options.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
        </select>
      ) : (
        <input
          autoFocus
          type={type}
          step={step}
          min={min}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 text-sm border border-orange-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800"
        />
      )}
      <button
        onClick={commit}
        className="p-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors mt-0.5"
      >
        <Check size={12} />
      </button>
      <button
        onClick={cancel}
        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors mt-0.5"
      >
        <X size={12} />
      </button>
    </div>
  );
};

// ── Row wrapper ────────────────────────────────────────────────
const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div className="mt-0.5 text-gray-400 shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      {children}
    </div>
  </div>
);

// ── Props ──────────────────────────────────────────────────────
interface Props {
  alert:     BroadcastAlert;
  onClose:   () => void;
  onSaved:   (updated: BroadcastAlert) => void;
  onDeleted: (id: string) => void;
  onFlyTo?:  (lat: number, lng: number) => void;
}

// ── Main component ─────────────────────────────────────────────
const BroadcastDetailPanel: React.FC<Props> = ({
  alert: broadcastAlert, onClose, onSaved, onDeleted, onFlyTo,
}) => {
  const { fetchWithAuth } = useApi();

  const [fields, setFields] = useState({
    message:     broadcastAlert.message,
    description: broadcastAlert.description ?? "",
    priority:    broadcastAlert.priority.toLowerCase(),
    status:      broadcastAlert.status ?? "ACTIVE",
    radius:      String(broadcastAlert.radius),
    lat:         String(broadcastAlert.position[0]),
    lng:         String(broadcastAlert.position[1]),
  });

  const dirty = useRef<Set<string>>(new Set());

  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [logsOpen,   setLogsOpen]   = useState(true);
  const [activeNav,  setActiveNav]  = useState("details");

  // ── Section refs ───────────────────────────────────────────
  const sectionRefs: Record<string, React.RefObject<HTMLDivElement | null>> = {
    details: useRef<HTMLDivElement>(null),
    mapping: useRef<HTMLDivElement>(null),
    audit:   useRef<HTMLDivElement>(null),
    logs:    useRef<HTMLDivElement>(null),
  };

  const scrollTo = (id: string) => {
    setActiveNav(id);
    sectionRefs[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const set = (key: string, val: string) => {
    dirty.current.add(key);
    setFields((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (dirty.current.size === 0) return;
    setSaving(true);
    try {
      const body = {
        message:     fields.message,
        description: fields.description || null,
        priority:    fields.priority,
        status:      fields.status,
        radius:      parseFloat(fields.radius),
        coordinates: [parseFloat(fields.lat), parseFloat(fields.lng)] as [number, number],
        timestamp:   broadcastAlert.timestamp ?? new Date().toISOString(),
      };
      const result = await fetchWithAuth(`/broadcasts/${broadcastAlert.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      dirty.current.clear();
      onSaved({
        ...broadcastAlert,
        message:     fields.message,
        description: fields.description,
        priority:    fields.priority.toUpperCase() as BroadcastAlert["priority"],
        status:      fields.status as BroadcastAlert["status"],
        radius:      parseFloat(fields.radius),
        position:    [parseFloat(fields.lat), parseFloat(fields.lng)],
        updatedAt:   result.broadcast?.updated_at ?? new Date().toISOString(),
      });
    } catch (err) {
      console.error("Save error:", err);
      window.alert("Failed to save broadcast.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetchWithAuth(`/broadcasts/${broadcastAlert.id}`, { method: "DELETE" });
      onDeleted(broadcastAlert.id);
      onClose();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
      setConfirmDel(false);
    }
  };

  const fmt = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  };

  const hasDirty = dirty.current.size > 0;

  return (
    <div className="fixed top-0 right-0 h-full w-[360px] bg-white border-l border-gray-200 shadow-2xl z-[9998] flex flex-col">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <Radio size={15} className="text-orange-500" />
          <span className="font-semibold text-gray-900 text-sm">Broadcast Details</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[fields.status]}`}>
            {fields.status}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[fields.priority.toUpperCase()]}`}>
            {fields.priority.toUpperCase()}
          </span>
          <button
            onClick={onClose}
            className="ml-1 text-gray-400 hover:text-gray-700 transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Side nav tabs ─────────────────────────────────────── */}
      <div className="flex border-b border-gray-100 shrink-0">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            title={label}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-semibold uppercase tracking-wide transition-colors
              ${activeNav === id
                ? "text-orange-500 border-b-2 border-orange-500"
                : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent"
              }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── DETAILS ─────────────────────────────────────────── */}
        <div ref={sectionRefs.details} className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <FileText size={11} /> Details
          </p>

          <div className="flex items-center gap-1.5 mb-3">
            <Clock size={11} className="text-gray-400" />
            <span className="text-[11px] text-gray-400">{fmt(broadcastAlert.timestamp)}</span>
          </div>

          <Row icon={<Radio size={13} />} label="Message">
            <EditField
              value={fields.message}
              onSave={(v) => set("message", v)}
            />
          </Row>

          <Row icon={<FileText size={13} />} label="Description">
            <EditField
              value={fields.description}
              type="textarea"
              onSave={(v) => set("description", v)}
              display={
                fields.description
                  ? <span className="text-sm text-gray-800">{fields.description}</span>
                  : <span className="text-sm text-gray-400 italic">None</span>
              }
            />
          </Row>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <Row icon={<AlertTriangle size={13} />} label="Priority">
              <EditField
                value={fields.priority}
                type="select"
                options={PRIORITY_OPTS}
                onSave={(v) => set("priority", v)}
                display={
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-block ${PRIORITY_STYLE[fields.priority.toUpperCase()]}`}>
                    {fields.priority.toUpperCase()}
                  </span>
                }
              />
            </Row>
            <Row icon={<Activity size={13} />} label="Status">
              <EditField
                value={fields.status}
                type="select"
                options={STATUS_OPTS}
                onSave={(v) => set("status", v)}
                display={
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block ${STATUS_STYLE[fields.status]}`}>
                    {fields.status}
                  </span>
                }
              />
            </Row>
          </div>

          <Row icon={<Radio size={13} />} label="Radius">
            <EditField
              value={fields.radius}
              type="number"
              step="0.1"
              min={0.1}
              onSave={(v) => set("radius", v)}
              display={<span className="text-sm text-gray-800">{fields.radius} km</span>}
            />
          </Row>
        </div>

        <div className="border-t border-gray-100 mx-4" />

        {/* ── MAPPING ─────────────────────────────────────────── */}
        <div ref={sectionRefs.mapping} className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Map size={11} /> Location
          </p>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-400 font-mono">
              {parseFloat(fields.lat).toFixed(5)}, {parseFloat(fields.lng).toFixed(5)}
            </span>
            {onFlyTo && (
              <button
                onClick={() => onFlyTo(parseFloat(fields.lat), parseFloat(fields.lng))}
                className="flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-700 transition-colors"
              >
                <MapPin size={11} />
                Locate
              </button>
            )}
          </div>

          <Row icon={<MapPin size={13} />} label="Latitude">
            <EditField
              value={fields.lat}
              type="number"
              step="any"
              onSave={(v) => set("lat", v)}
              display={<span className="text-sm text-gray-800 font-mono">{fields.lat}</span>}
            />
          </Row>
          <Row icon={<MapPin size={13} />} label="Longitude">
            <EditField
              value={fields.lng}
              type="number"
              step="any"
              onSave={(v) => set("lng", v)}
              display={<span className="text-sm text-gray-800 font-mono">{fields.lng}</span>}
            />
          </Row>
        </div>

        <div className="border-t border-gray-100 mx-4" />

        {/* ── AUDIT ───────────────────────────────────────────── */}
        <div ref={sectionRefs.audit} className="px-4 pt-4 pb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <User size={11} /> Audit
          </p>

          {broadcastAlert.createdBy && (
            <Row icon={<User size={13} />} label="Created by">
              <span className="text-sm text-gray-800 font-mono break-all">
                {broadcastAlert.createdBy.name ?? broadcastAlert.createdBy.email ?? broadcastAlert.createdBy.user_id}
              </span>
            </Row>
          )}
          {broadcastAlert.updatedBy && (
            <Row icon={<User size={13} />} label="Updated by">
              <div>
                <span className="text-sm text-gray-800 font-mono break-all">
                  {broadcastAlert.updatedBy.name ?? broadcastAlert.updatedBy.email ?? broadcastAlert.updatedBy.user_id}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">{fmt(broadcastAlert.updatedAt)}</p>
              </div>
            </Row>
          )}
          {!broadcastAlert.createdBy && !broadcastAlert.updatedBy && (
            <p className="text-xs text-gray-400 italic py-1">No audit data.</p>
          )}
        </div>

        <div className="border-t border-gray-100 mx-4" />

        {/* ── LOGS ────────────────────────────────────────────── */}
        <div ref={sectionRefs.logs} className="px-4 pt-4 pb-6">
          <button
            onClick={() => setLogsOpen((p) => !p)}
            className="flex items-center gap-1.5 w-full mb-2"
          >
            <Activity size={11} className="text-gray-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-1 text-left">
              Activity Log{broadcastAlert.logs?.length ? ` (${broadcastAlert.logs.length})` : ""}
            </p>
            <ChevronDown
              size={12}
              className={`text-gray-400 transition-transform ${logsOpen ? "rotate-180" : ""}`}
            />
          </button>

          {logsOpen && (
            !broadcastAlert.logs?.length ? (
              <p className="text-xs text-gray-400 italic">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {broadcastAlert.logs.map((log, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 flex items-start gap-2">
                    <Activity size={11} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-700">{log.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{fmt(log.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-2 shrink-0">
        <button
          onClick={handleSave}
          disabled={saving || !hasDirty}
          className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-colors
            ${hasDirty
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
        >
          <Check size={14} />
          {saving ? "Saving..." : hasDirty ? "Save Changes" : "No Changes"}
        </button>

        {!confirmDel ? (
          <button
            onClick={() => setConfirmDel(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:bg-red-50 py-2 rounded-xl transition-colors font-medium"
          >
            <Trash2 size={13} />
            Delete
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDel(false)}
              className="flex-1 text-sm text-gray-500 hover:bg-gray-100 py-2 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
            >
              <AlertTriangle size={13} />
              {deleting ? "Deleting..." : "Confirm"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BroadcastDetailPanel;
