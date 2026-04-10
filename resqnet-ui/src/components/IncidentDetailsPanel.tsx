import React, { useState, useRef, useEffect } from "react";
import {
  X, ShieldAlert, Clock, MapPin, User, Hash, FileText,
  Activity, ChevronDown, AlertTriangle, Check, Trash2,
  MessageSquare, Pencil,
} from "lucide-react";
import type { Incident } from "../hooks/useLocalData";
import { useApi } from "../utils/api";

// ── Constants ────────────────────────────────────────────────────────────────

const SEV_STYLE: Record<string, string> = {
  low:      "bg-yellow-100 text-yellow-800 border-yellow-300",
  medium:   "bg-orange-100 text-orange-800 border-orange-300",
  high:     "bg-red-100    text-red-800    border-red-300",
  critical: "bg-red-200    text-red-900    border-red-400",
};

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-red-50   text-red-600",
  contained: "bg-green-50 text-green-700",
  resolved:  "bg-gray-100 text-gray-500",
  cancelled: "bg-gray-100 text-gray-400",
};

const SEV_COLOR: Record<string, string> = {
  low:      "#eab308",
  medium:   "#f97316",
  high:     "#ef4444",
  critical: "#7f1d1d",
};

const STATUS_SHARE: Record<string, number> = {
  active:    15,
  contained: 55,
  resolved:  90,
  cancelled: 0,
};

// ── Mini components ──────────────────────────────────────────────────────────

const BarChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  max?: number;
  unit?: string;
}> = ({ data, max, unit }) => {
  const peak = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-20 shrink-0 truncate">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round((d.value / peak) * 100)}%`, background: d.color }}
            />
          </div>
          <span className="text-[10px] font-mono text-gray-500 w-8 text-right shrink-0">
            {d.value}{unit}
          </span>
        </div>
      ))}
    </div>
  );
};

const RadialProgress: React.FC<{ pct: number; color: string; label: string }> = ({ pct, color, label }) => {
  const r    = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle cx={28} cy={28} r={r} fill="none" stroke="#f3f4f6" strokeWidth={5} />
        <circle
          cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 28 28)" className="transition-all duration-700"
        />
        <text x={28} y={33} textAnchor="middle" fontSize={11} fontWeight={600} fill={color}>
          {pct}
        </text>
      </svg>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
};

const EditField: React.FC<{
  value:    string;
  type?:    "text" | "textarea" | "select";
  options?: string[];
  onSave:   (v: string) => void;
  display?: React.ReactNode;
}> = ({ value, type = "text", options, onSave, display }) => {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);

  const commit = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 group/ef">
        <span className="text-sm text-gray-800 flex-1">{display ?? value}</span>
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="opacity-0 group-hover/ef:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
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
          autoFocus value={draft} rows={3}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 text-sm border border-red-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />
      ) : type === "select" && options ? (
        <select
          autoFocus value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 text-sm border border-red-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          autoFocus type="text" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 text-sm border border-red-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-400"
        />
      )}
      <button onClick={commit} className="p-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white mt-0.5">
        <Check size={12} />
      </button>
      <button onClick={cancel} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 mt-0.5">
        <X size={12} />
      </button>
    </div>
  );
};

const Row: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div className="mt-0.5 text-gray-400 shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      {children}
    </div>
  </div>
);

const SectionHead: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
    {icon}{label}
  </p>
);

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  incident:   Incident;
  onClose:    () => void;
  onFlyTo?:   (lat: number, lng: number) => void;
  onUpdated?: (updated: Incident) => void;
  onDeleted?: (id: string) => void;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const IncidentDetailsPanel: React.FC<Props> = ({ incident: inc, onClose, onFlyTo, onUpdated, onDeleted }) => {
  const { fetchWithAuth } = useApi();

  const [fields, setFields] = useState({
    title:       inc.title,
    description: inc.description ?? "",
    status:      inc.status,
    priority:    (inc as any).priority ?? "medium",
    category:    inc.category,
  });

  const dirty      = useRef<Set<string>>(new Set());
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [logsOpen,  setLogsOpen]  = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);
  const [newComment,  setNewComment]  = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "comments">("overview");

  const set = (key: string, val: string) => {
    dirty.current.add(key);
    setFields((prev) => ({ ...prev, [key]: val }));
  };

  const fmt = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return (
      d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      " " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  };

  const hasCoords =
    Array.isArray(inc.coordinates) &&
    inc.coordinates.length === 2 &&
    !isNaN(inc.coordinates[0]) &&
    !isNaN(inc.coordinates[1]);

  // Stats
  const containmentPct = STATUS_SHARE[fields.status] ?? 0;
  const sevColor       = SEV_COLOR[inc.severity] ?? "#6b7280";

  const activityData = (() => {
    const counts: Record<string, number> = {};
    (inc.logs ?? []).forEach((l) => {
      const day = new Date(l.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      counts[day] = (counts[day] ?? 0) + 1;
    });
    return Object.entries(counts)
      .slice(-5)
      .map(([label, value]) => ({ label, value, color: "#ef4444" }));
  })();

  // ── Save — FIXED: proper URL with slash ──────────────────────────────────
  const handleSave = async () => {
    if (dirty.current.size === 0) return;
    setSaving(true);
    try {
      const result = await fetchWithAuth(`incidents/${inc.incident_id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(fields),
      });
      dirty.current.clear();
      onUpdated?.({ ...inc, ...fields, updated_at: result?.updated_at ?? new Date().toISOString() });
    } catch (err) {
      console.error("Incident save error", err);
      window.alert("Failed to save incident.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetchWithAuth(`incidents/${inc.incident_id}`, { method: "DELETE" });
      onDeleted?.(inc.incident_id);
      onClose();
    } catch (err) {
      console.error("Incident delete error", err);
    } finally {
      setDeleting(false);
      setConfirmDel(false);
    }
  };

  // ── Post comment ─────────────────────────────────────────────────────────
  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      await fetchWithAuth(`incidents/${inc.incident_id}/comments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: newComment }),
      });
      setNewComment("");
      setCommentOpen(false);
    } catch (err) {
      console.error("Comment error", err);
    } finally {
      setPostingComment(false);
    }
  };

  const hasDirty = dirty.current.size > 0;

  return (
    <div className="fixed top-0 right-0 h-full w-[380px] bg-white border-l border-gray-200 shadow-2xl z-[9999] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert
            size={15}
            className={
              inc.severity === "critical" ? "text-red-900" :
              inc.severity === "high"     ? "text-red-500" :
              inc.severity === "medium"   ? "text-orange-500" :
                                            "text-yellow-500"
            }
          />
          <span className="font-semibold text-gray-900 text-sm">Incident Details</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEV_STYLE[inc.severity]}`}>
            {inc.severity.toUpperCase()}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[fields.status]}`}>
            {fields.status}
          </span>
          <button onClick={onClose} className="ml-1 text-gray-400 hover:text-gray-700 transition-colors p-1">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-gray-100 shrink-0">
        {(["overview", "logs", "comments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? "text-red-500 border-b-2 border-red-500"
                : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent"
            }`}
          >
            {tab}
            {tab === "logs"     && inc.logs?.length     ? ` (${inc.logs.length})`     : ""}
            {tab === "comments" && inc.comments?.length ? ` (${inc.comments.length})` : ""}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="px-4 pt-4 pb-6 space-y-4">

            {/* Containment / severity visualization */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Activity size={11} /> Status Overview
              </p>
              <div className="flex items-center justify-around">
                <RadialProgress
                  pct={containmentPct}
                  color={
                    fields.status === "contained" ? "#16a34a" :
                    fields.status === "resolved"  ? "#6b7280" : "#ef4444"
                  }
                  label="Containment"
                />
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-inner"
                    style={{ background: sevColor }}
                  >
                    {inc.severity.toUpperCase().slice(0, 3)}
                  </div>
                  <span className="text-[10px] text-gray-400">Severity</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-bold">
                    {inc.logs?.length ?? 0}
                  </div>
                  <span className="text-[10px] text-gray-400">Log Events</span>
                </div>
              </div>
            </div>

            {/* Activity bar chart */}
            {activityData.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Activity size={11} /> Activity (last 5 days)
                </p>
                <BarChart data={activityData} unit=" events" />
              </div>
            )}

            {/* Editable fields */}
            <div>
              <SectionHead icon={<FileText size={11} />} label="Details" />
              <div className="flex items-center gap-1.5 mb-3">
                <Clock size={11} className="text-gray-400" />
                <span className="text-[11px] text-gray-400">{fmt(inc.created_at)}</span>
              </div>
              <Row icon={<ShieldAlert size={13} />} label="Title">
                <EditField value={fields.title} onSave={(v) => set("title", v)} />
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
                <Row icon={<AlertTriangle size={13} />} label="Status">
                  <EditField
                    value={fields.status}
                    type="select"
                    options={["active", "contained", "resolved", "cancelled"]}
                    onSave={(v) => set("status", v)}
                    display={
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block ${STATUS_STYLE[fields.status]}`}>
                        {fields.status}
                      </span>
                    }
                  />
                </Row>
                <Row icon={<Activity size={13} />} label="Priority">
                  <EditField
                    value={fields.priority}
                    type="select"
                    options={["low", "medium", "high", "urgent"]}
                    onSave={(v) => set("priority", v)}
                    display={
                      <span className="text-[11px] font-semibold text-gray-700 capitalize">{fields.priority}</span>
                    }
                  />
                </Row>
              </div>
              <Row icon={<Hash size={13} />} label="Category">
                <EditField
                  value={fields.category}
                  type="select"
                  options={["wildfire", "smoke", "roadblock", "evacuation_issue", "rescue_request", "other"]}
                  onSave={(v) => set("category", v)}
                  display={
                    <span className="text-sm text-gray-800 capitalize">
                      {fields.category.replace(/_/g, " ")}
                    </span>
                  }
                />
              </Row>
            </div>

            {/* Location */}
            <div>
              <SectionHead icon={<MapPin size={11} />} label="Location" />
              {hasCoords ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-[11px] font-mono text-gray-600">
                    {inc.coordinates[0].toFixed(5)}, {inc.coordinates[1].toFixed(5)}
                  </span>
                  {onFlyTo && (
                    <button
                      onClick={() => onFlyTo(inc.coordinates[0], inc.coordinates[1])}
                      className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 transition-colors"
                    >
                      <MapPin size={11} /> Locate
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No coordinates.</p>
              )}
            </div>

            {/* Audit */}
            {inc.created_by && (
              <div>
                <SectionHead icon={<User size={11} />} label="Audit" />
                <Row icon={<User size={13} />} label="Created by">
                  <span className="text-sm text-gray-800">
                    {inc.created_by.name ?? inc.created_by.user_id}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">{fmt(inc.created_at)}</p>
                </Row>
                {(inc as any).source_fire_report_id && (
                  <Row icon={<Hash size={13} />} label="Source Report">
                    <span className="text-xs font-mono text-gray-500">{(inc as any).source_fire_report_id}</span>
                  </Row>
                )}
                <Row icon={<Hash size={13} />} label="Incident ID">
                  <span className="text-xs font-mono text-gray-400 break-all">{inc.incident_id}</span>
                </Row>
              </div>
            )}
          </div>
        )}

        {/* ── LOGS ── */}
        {activeTab === "logs" && (
          <div className="px-4 pt-4 pb-6">
            <button
              onClick={() => setLogsOpen((p) => !p)}
              className="flex items-center gap-1.5 w-full mb-3"
            >
              <Activity size={11} className="text-gray-400" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex-1 text-left">
                Activity Log{inc.logs?.length ? ` (${inc.logs.length})` : ""}
              </p>
              <ChevronDown
                size={12}
                className={`text-gray-400 transition-transform ${logsOpen ? "rotate-180" : ""}`}
              />
            </button>

            {logsOpen && (
              !inc.logs?.length
                ? <p className="text-xs text-gray-400 italic">No activity yet.</p>
                : <>
                    {activityData.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-3 mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Daily Events</p>
                        <BarChart data={activityData} unit=" events" />
                      </div>
                    )}
                    <div className="space-y-2">
                      {[...inc.logs].reverse().map((log, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 flex items-start gap-2">
                          <Activity size={11} className="text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-700">{log.message}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{fmt(log.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
            )}
          </div>
        )}

        {/* ── COMMENTS ── */}
        {activeTab === "comments" && (
          <div className="px-4 pt-4 pb-6">
            <div className="flex items-center justify-between mb-3">
              <SectionHead icon={<MessageSquare size={11} />} label="Comments" />
              <button
                onClick={() => setCommentOpen((p) => !p)}
                className="text-[11px] text-red-500 hover:text-red-700 font-semibold transition-colors"
              >
                Add
              </button>
            </div>

            {commentOpen && (
              <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                <textarea
                  autoFocus value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3} placeholder="Write a comment..."
                  className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCommentOpen(false); setNewComment(""); }}
                    className="flex-1 text-sm text-gray-500 hover:bg-gray-200 py-1.5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePostComment}
                    disabled={postingComment || !newComment.trim()}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold py-1.5 rounded-lg transition-colors"
                  >
                    {postingComment ? "Posting…" : "Post"}
                  </button>
                </div>
              </div>
            )}

            {!inc.comments?.length
              ? <p className="text-xs text-gray-400 italic">No comments yet.</p>
              : <div className="space-y-2">
                  {[...inc.comments].reverse().map((c, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-gray-600">
                          {c.created_by?.user_id ?? "Unknown"}
                        </span>
                        <span className="text-[10px] text-gray-400">{fmt(c.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-700">{c.message}</p>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-2 shrink-0">
        <button
          onClick={handleSave}
          disabled={saving || !hasDirty}
          className={`w-full flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-colors ${
            hasDirty
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <Check size={14} />
          {saving ? "Saving…" : hasDirty ? "Save Changes" : "No Changes"}
        </button>

        {!confirmDel ? (
          <button
            onClick={() => setConfirmDel(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:bg-red-50 py-2 rounded-xl transition-colors font-medium"
          >
            <Trash2 size={13} /> Delete Incident
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
              {deleting ? "Deleting…" : "Confirm"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentDetailsPanel;