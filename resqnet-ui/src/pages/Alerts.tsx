import React, { useState, useEffect, useCallback, useRef } from "react";
import AlertCard from "../components/AlertCard";
import FireReportCard from "../components/FireReportCard";
import { useApi } from "../utils/api";
import type { BroadcastAlert } from "../components/map/types";
import {
  Radio, Flame, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Activity, Loader2,
  ShieldAlert, ChevronDown, ChevronRight, Clock,
  BarChart3, ListFilter, MapPin, MessageSquare, Edit3,
} from "lucide-react";

interface FireReport {
  _id?: string;
  report_id: string;
  photo_links: string[];
  hazard_type: string;
  uploading_user: string;
  coordinates: [number, number];
  severity: "low" | "medium" | "high" | "critical";
  description?: string;
  timestamp: string;
  status?: "pending_review" | "verified" | "converted_to_incident" | "rejected";
}

interface Incident {
  _id?: string;
  incident_id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  severity: string;
  status: "active" | "contained" | "resolved" | "cancelled";
  coordinates?: [number, number];
  source_fire_report_id?: string | null;
  created_by?: { user_id?: string; name?: string } | null;
  created_at: string;
  updated_at?: string;
  logs?: { message: string; updated_by?: { user_id?: string; name?: string } | null; timestamp: string }[];
  comments?: { message: string; created_by?: { user_id?: string; name?: string } | null; created_at: string }[];
}

const SEV: Record<string, string> = {
  low: "bg-gray-100 text-gray-600 border-gray-300",
  medium: "bg-amber-50 text-amber-700 border-amber-300",
  high: "bg-red-50 text-red-600 border-red-300",
  critical: "bg-red-100 text-red-800 border-red-400 font-semibold",
  urgent: "bg-red-100 text-red-800 border-red-400 font-semibold",
};

const SEV_BAR: Record<string, string> = {
  low: "bg-gray-300",
  medium: "bg-amber-400",
  high: "bg-red-500",
  critical: "bg-red-700",
  urgent: "bg-red-700",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-red-50 text-red-600 border-red-200",
  contained: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-gray-100 text-gray-600 border-gray-300",
  medium: "bg-amber-50 text-amber-700 border-amber-300",
  high: "bg-orange-50 text-orange-700 border-orange-300",
  urgent: "bg-red-100 text-red-700 border-red-300",
};

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  count?: number;
  loading: boolean;
  onRefresh: () => void;
  accent: string;
}> = ({ icon, title, count, loading, onRefresh, accent }) => (
  <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
    <div className="flex items-center gap-3 min-w-0">
      <div className={`p-2 rounded-lg border ${accent}`}>{icon}</div>
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {count !== undefined && !loading && (
          <p className="text-xs text-gray-500 mt-0.5">{count} record{count !== 1 ? "s" : ""}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-2">
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${loading ? "bg-gray-400" : "bg-orange-400"}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${loading ? "bg-gray-300" : "bg-orange-500"}`} />
        </span>
        <span className="text-[10px] text-gray-400 uppercase tracking-widest">{loading ? "syncing" : "live"}</span>
      </div>
    </div>

    <button
      onClick={onRefresh}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-all text-xs shadow-sm disabled:opacity-40"
    >
      <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
    </button>
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50">
    <Activity size={28} className="text-gray-300 mb-3" />
    <p className="text-gray-500 text-sm">No {label}</p>
    <p className="text-gray-400 text-xs mt-1">System nominal</p>
  </div>
);

const SkeletonTable: React.FC = () => (
  <div className="space-y-px border border-gray-200 rounded-xl overflow-hidden">
    <div className="h-10 bg-gray-50 border-b border-gray-200 animate-pulse" />
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-14 bg-white animate-pulse border-b border-gray-100 last:border-0" />
    ))}
  </div>
);

const SkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-44 rounded-xl bg-gray-100 border border-gray-100 animate-pulse" />
    ))}
  </div>
);

const Divider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-4">
    <div className="flex-1 h-px bg-gray-100" />
    <span className="text-[10px] text-gray-300 uppercase tracking-widest">{label}</span>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

const MiniBar: React.FC<{ label: string; value: number; max: number; color: string }> = ({
  label, value, max, color,
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500 capitalize">{label}</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: max > 0 ? `${(value / max) * 100}%` : "0%" }}
      />
    </div>
  </div>
);

const IncidentDrawer: React.FC<{
  incident: Incident;
  onClose: () => void;
  onStatusChange: (id: string, status: Incident["status"]) => void;
  onIncidentPatched: (updated: Incident) => void;
}> = ({ incident, onClose, onStatusChange, onIncidentPatched }) => {
  const { fetchWithAuth } = useApi();
  const [updating, setUpdating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState(incident.title ?? "");
  const [description, setDescription] = useState(incident.description ?? "");
  const [category, setCategory] = useState(incident.category ?? "wildfire");
  const [priority, setPriority] = useState(incident.priority ?? "medium");
  const [severity, setSeverity] = useState(incident.severity ?? "medium");
  const [status, setStatus] = useState<Incident["status"]>(incident.status ?? "active");

  const safeCreator =
    incident.created_by?.name ||
    incident.created_by?.user_id ||
    "Unknown";

  const safeCoords =
    Array.isArray(incident.coordinates) && incident.coordinates.length === 2
      ? incident.coordinates
      : null;

  const handleStatusOnly = async (newStatus: Incident["status"]) => {
    setUpdating(true);
    setErr(null);
    try {
      await fetchWithAuth(`/incidents/${incident.incident_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusChange(incident.incident_id, newStatus);
      setStatus(newStatus);
    } catch (e: any) {
      setErr(e.message ?? "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const result = await fetchWithAuth(`/incidents/${incident.incident_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          severity,
          status,
        }),
      });

      const updated: Incident = {
        ...incident,
        title,
        description,
        category,
        priority,
        severity,
        status,
        updated_at: result?.updated_at ?? new Date().toISOString(),
      };

      onIncidentPatched(updated);
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Failed to save incident changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Incident Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">{incident.incident_id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 max-h-[72vh] overflow-y-auto space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${STATUS_STYLE[status] ?? STATUS_STYLE.active}`}>
              {status}
            </span>
            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${SEV[severity] ?? SEV.medium}`}>
              {severity} severity
            </span>
            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.medium}`}>
              {priority} priority
            </span>
            <span className="px-2.5 py-1 rounded-full border text-xs bg-gray-50 text-gray-600 border-gray-200 capitalize">
              {String(category || "other").replace(/_/g, " ")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {["wildfire", "smoke", "road_block", "evacuation_issue", "rescue_request", "other"].map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {["low", "medium", "high", "urgent"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {["low", "medium", "high", "critical"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Incident["status"])}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                {["active", "contained", "resolved", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Created by</p>
              <p className="text-sm font-medium text-gray-800 truncate">{safeCreator}</p>
              <p className="text-xs text-gray-400 mt-2">
                {incident.created_at ? new Date(incident.created_at).toLocaleString() : "Unknown"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Incident description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Coordinates</p>
              <p className="text-gray-800">
                {safeCoords ? `[${safeCoords[0].toFixed(4)}, ${safeCoords[1].toFixed(4)}]` : "No coordinates"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Source fire report</p>
              <p className="text-gray-800 truncate">{incident.source_fire_report_id ?? "None"}</p>
            </div>
          </div>

          {incident.logs && incident.logs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Recent activity</p>
              <div className="space-y-2">
                {incident.logs.slice(-4).reverse().map((log, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-sm text-gray-700">{log.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Unknown time"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {incident.comments && incident.comments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Comments</p>
              <div className="space-y-2">
                {incident.comments.slice(-3).reverse().map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-sm text-gray-700">{c.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {(c.created_by?.name || c.created_by?.user_id || "Unknown")} ·{" "}
                      {c.created_at ? new Date(c.created_at).toLocaleString() : "Unknown time"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {err && <p className="text-red-500 text-xs">{err}</p>}
        </div>

        <div className="px-5 py-4 border-t bg-gray-50 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Quick status actions</p>
            <div className="flex gap-2 flex-wrap">
              {(["active", "contained", "resolved", "cancelled"] as const).map((s) => (
                <button
                  key={s}
                  disabled={updating || s === status}
                  onClick={() => handleStatusOnly(s)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-colors disabled:opacity-50
                    ${s === "active" ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" : ""}
                    ${s === "contained" ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : ""}
                    ${s === "resolved" ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : ""}
                    ${s === "cancelled" ? "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200" : ""}
                  `}
                >
                  {updating && s !== status ? <Loader2 size={11} className="animate-spin inline mr-1" /> : null}
                  Mark {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors text-sm"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ReviewModalProps {
  report: FireReport;
  onClose: () => void;
  onDone: (reportId: string, decision: string) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ report, onClose, onDone }) => {
  const { fetchWithAuth } = useApi();
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incTitle, setIncTitle] = useState(`${report.hazard_type} — ${report.report_id}`);
  const [incDesc, setIncDesc] = useState(report.description ?? "");
  const [incCategory, setIncCategory] = useState("wildfire");
  const [incPriority, setIncPriority] = useState("high");
  const [incSeverity, setIncSeverity] = useState(report.severity === "critical" ? "critical" : report.severity);

  const submit = async (decision: "verify" | "verify_and_change_to_incident" | "reject") => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, any> = { decision, notes: notes || undefined };

      if (decision === "reject") {
        if (!rejectReason.trim()) {
          setError("Rejection reason is required.");
          setLoading(false);
          return;
        }
        payload.rejection_reason = rejectReason;
      }

      if (decision === "verify_and_change_to_incident") {
        payload.incident_payload = {
          title: incTitle,
          description: incDesc,
          category: incCategory,
          priority: incPriority,
          severity: incSeverity,
          coordinates: report.coordinates,
          photos: report.photo_links,
        };
      }

      await fetchWithAuth(`/fires/${report.report_id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onDone(report.report_id, decision);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Review Fire Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">{report.report_id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {report.photo_links?.[0] && (
          <div className="h-44 bg-gray-100 overflow-hidden">
            <img src={report.photo_links[0]} alt="Report" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="px-5 py-3 space-y-1 text-sm border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700 capitalize">{report.hazard_type}</span>
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs border ${SEV[report.severity]}`}>
              {report.severity.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-500"><span className="font-medium text-gray-700">By:</span> {report.uploading_user}</p>
          <p className="text-gray-500"><span className="font-medium text-gray-700">Coords:</span> [{report.coordinates[0].toFixed(4)}, {report.coordinates[1].toFixed(4)}]</p>
          {report.description && <p className="text-gray-500"><span className="font-medium text-gray-700">Note:</span> {report.description}</p>}
        </div>

        <div className="px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Reviewer notes <span className="font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes..."
            />
          </div>

          <div className="border border-orange-200 rounded-lg p-3 bg-orange-50 space-y-2">
            <p className="text-xs font-semibold text-orange-600">
              Incident Details <span className="font-normal text-orange-400">(used if converting)</span>
            </p>

            <input
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white"
              placeholder="Title"
              value={incTitle}
              onChange={(e) => setIncTitle(e.target.value)}
            />

            <textarea
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm resize-none bg-white"
              rows={2}
              placeholder="Description"
              value={incDesc}
              onChange={(e) => setIncDesc(e.target.value)}
            />

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Category</label>
                <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white" value={incCategory} onChange={(e) => setIncCategory(e.target.value)}>
                  {["wildfire", "smoke", "road_block", "evacuation_issue", "rescue_request", "other"].map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Priority</label>
                <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white" value={incPriority} onChange={(e) => setIncPriority(e.target.value)}>
                  {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase">Severity</label>
                <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white" value={incSeverity} onChange={(e) => setIncSeverity(e.target.value)}>
                  {["low", "medium", "high", "critical"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Rejection reason <span className="font-normal text-gray-400">(required to reject)</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="e.g. Duplicate, insufficient evidence..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t bg-gray-50 flex gap-2">
          <button
            disabled={loading}
            onClick={() => submit("verify")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 size={13} /> Verify
          </button>

          <button
            disabled={loading}
            onClick={() => submit("verify_and_change_to_incident")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Flame size={13} /> Verify + Incident
          </button>

          <button
            disabled={loading || !rejectReason.trim()}
            onClick={() => submit("reject")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            <XCircle size={13} /> Reject
          </button>
        </div>
      </div>
    </div>
  );
};

function Alerts() {
  const { fetchWithAuth } = useApi();

  const topRef = useRef<HTMLDivElement>(null);
  const incidentsRef = useRef<HTMLElement>(null);
  const broadcastsRef = useRef<HTMLElement>(null);
  const reportsRef = useRef<HTMLElement>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([]);
  const [fireReports, setFireReports] = useState<FireReport[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<FireReport | null>(null);
  const [drawerIncident, setDrawerIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [broadcastFilter, setBroadcastFilter] = useState<string>("all");

  const fetchIncidents = useCallback(async () => {
    try {
      setIncidentsLoading(true);
      const data = await fetchWithAuth("/incidents");
      setIncidents(Array.isArray(data) ? data : data.incidents ?? []);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
      setIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  }, [fetchWithAuth]);

  const fetchAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true);
      const data = await fetchWithAuth("/broadcasts");
      const normalised: BroadcastAlert[] = (data.broadcasts || []).map((b: any) => ({
        id: b._id ?? b.id,
        position: b.coordinates ?? b.position,
        radius: b.radius,
        priority: (b.priority as string).toUpperCase() as BroadcastAlert["priority"],
        message: b.message,
        timestamp: b.timestamp,
        status: b.status ?? "ACTIVE",
        description: b.description ?? null,
        createdBy: b.created_by ?? b.createdBy ?? null,
        updatedBy: b.updated_by ?? b.updatedBy ?? null,
        updatedAt: b.updated_at ?? b.updatedAt ?? null,
        logs: b.logs ?? [],
      }));
      setAlerts(normalised);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [fetchWithAuth]);

  const fetchFireReports = useCallback(async () => {
    try {
      setReportsLoading(true);
      const data: FireReport[] = await fetchWithAuth("/fires");
      setFireReports(data.filter((r) => !r.status || r.status === "pending_review"));
    } catch (err) {
      console.error("Failed to fetch fire reports:", err);
      setFireReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchIncidents();
    fetchAlerts();
    fetchFireReports();
  }, [fetchIncidents, fetchAlerts, fetchFireReports]);

  const handleAlertDelete = async (id: string) => {
    try {
      await fetchWithAuth(`/broadcasts/${id}`, { method: "DELETE" });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleAlertUpdate = async (id: string, updated: BroadcastAlert) => {
    try {
      const result = await fetchWithAuth(`/broadcasts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: updated.message,
          radius: updated.radius,
          priority: updated.priority.toLowerCase(),
          coordinates: updated.position,
          timestamp: updated.timestamp,
        }),
      });

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...updated, id, updatedAt: result.broadcast?.updated_at ?? new Date().toISOString() }
            : a
        )
      );
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const handleReviewDone = (reportId: string, decision: string) => {
    setReviewTarget(null);
    setFireReports((prev) => prev.filter((r) => r.report_id !== reportId));
    if (decision === "verify_and_change_to_incident") fetchIncidents();
    window.dispatchEvent(new CustomEvent("fire-report-reviewed"));
  };

  const handleIncidentStatusChange = (id: string, newStatus: Incident["status"]) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.incident_id === id ? { ...inc, status: newStatus } : inc
      )
    );
  };

  const handleIncidentPatched = (updated: Incident) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.incident_id === updated.incident_id ? updated : inc
      )
    );
  };

  const activeIncidents = incidents.filter((i) => i.status === "active").length;
  const containedIncidents = incidents.filter((i) => i.status === "contained").length;
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved").length;
  const cancelledIncidents = incidents.filter((i) => i.status === "cancelled").length;
  const urgentAlerts = alerts.filter((a) => a.priority === "URGENT").length;
  const highFires = fireReports.filter((r) => r.severity === "high" || r.severity === "critical").length;
  const anyLoading = incidentsLoading || alertsLoading || reportsLoading;

  const containedPct = incidents.length ? Math.round((containedIncidents / incidents.length) * 100) : 0;
  const resolvedPct = incidents.length ? Math.round((resolvedIncidents / incidents.length) * 100) : 0;
  const activePct = incidents.length ? Math.round((activeIncidents / incidents.length) * 100) : 0;

  const filteredIncidents =
    statusFilter === "all"
      ? incidents
      : incidents.filter((i) => i.status === statusFilter);

  const filteredBroadcasts =
    broadcastFilter === "all"
      ? alerts
      : alerts.filter((a) => String(a.priority).toLowerCase() === broadcastFilter.toLowerCase());

  const statusCounts = ["active", "contained", "resolved", "cancelled"].reduce((acc, s) => {
    acc[s] = incidents.filter((i) => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const broadcastCounts = ["LOW", "MEDIUM", "HIGH", "URGENT"].reduce((acc, p) => {
    acc[p] = alerts.filter((a) => a.priority === p).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="h-full overflow-y-auto bg-white text-gray-900" ref={topRef}>
      {reviewTarget && (
        <ReviewModal report={reviewTarget} onClose={() => setReviewTarget(null)} onDone={handleReviewDone} />
      )}

      {drawerIncident && (
        <IncidentDrawer
          incident={drawerIncident}
          onClose={() => setDrawerIncident(null)}
          onStatusChange={handleIncidentStatusChange}
          onIncidentPatched={handleIncidentPatched}
        />
      )}

      <div className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-orange-500" />
              <span className="text-[11px] uppercase tracking-widest text-gray-400">ResQNet / Alerts</span>
            </div>

            <div className="h-4 w-px bg-gray-200" />

            <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border ${activeIncidents > 0 ? "bg-red-50 border-red-200 text-red-500" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              <ShieldAlert size={10} />
              {incidentsLoading ? "—" : incidents.length} incidents
              {activeIncidents > 0 && <span className="font-semibold ml-1">· {activeIncidents} active</span>}
            </span>

            <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border ${urgentAlerts > 0 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              <Radio size={10} />
              {alertsLoading ? "—" : alerts.length} broadcasts
              {urgentAlerts > 0 && <span className="font-semibold ml-1">· {urgentAlerts} urgent</span>}
            </span>

            <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border ${fireReports.length > 0 ? "bg-orange-50 border-orange-200 text-orange-500" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              <Flame size={10} />
              {reportsLoading ? "—" : fireReports.length} pending reviews
              {highFires > 0 && <span className="font-semibold ml-1">· {highFires} high sev</span>}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Loader2 size={11} className={`text-orange-500 ${anyLoading ? "animate-spin opacity-100" : "opacity-0"}`} />

            <button
              onClick={() => incidentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50"
            >
              Incidents
            </button>

            <button
              onClick={() => broadcastsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50"
            >
              Broadcasts
            </button>

            <button
              onClick={() => reportsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs transition-colors"
            >
              Fire Reviews
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Current Summary</h1>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs uppercase tracking-wider text-gray-400">Total Incidents</p>
                <ShieldAlert size={16} className="text-gray-300" />
              </div>
              <p className="text-3xl font-semibold text-gray-900 tabular-nums">
                {incidentsLoading ? <span className="inline-block w-10 h-8 bg-gray-100 animate-pulse rounded" /> : incidents.length}
              </p>
            </div>

            <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs uppercase tracking-wider text-red-400">Active %</p>
                <BarChart3 size={16} className="text-red-300" />
              </div>
              <p className="text-3xl font-semibold text-red-600 tabular-nums">{activePct}%</p>
              <p className="mt-1 text-xs text-red-500">{activeIncidents} active</p>
            </div>

            <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs uppercase tracking-wider text-amber-500">% Contained</p>
                <Activity size={16} className="text-amber-300" />
              </div>
              <p className="text-3xl font-semibold text-amber-600 tabular-nums">{containedPct}%</p>
              <p className="mt-1 text-xs text-amber-500">{containedIncidents} contained</p>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs uppercase tracking-wider text-emerald-500">% Resolved</p>
                <CheckCircle2 size={16} className="text-emerald-300" />
              </div>
              <p className="text-3xl font-semibold text-emerald-600 tabular-nums">{resolvedPct}%</p>
              <p className="mt-1 text-xs text-emerald-500">{resolvedIncidents} resolved</p>
            </div>

            <div className="bg-white border border-orange-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs uppercase tracking-wider text-orange-400">Pending Reviews</p>
                <Flame size={16} className="text-orange-300" />
              </div>
              <p className="text-3xl font-semibold text-orange-500 tabular-nums">
                {reportsLoading ? <span className="inline-block w-10 h-8 bg-orange-50 animate-pulse rounded" /> : fireReports.length}
              </p>
              {highFires > 0 && <p className="mt-1 text-xs text-red-500">{highFires} high severity</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={14} className="text-gray-400" />
                <h3 className="text-sm font-medium text-gray-800">Incident Distribution</h3>
              </div>
              <MiniBar label="active" value={activeIncidents} max={Math.max(incidents.length, 1)} color="bg-red-500" />
              <MiniBar label="contained" value={containedIncidents} max={Math.max(incidents.length, 1)} color="bg-amber-500" />
              <MiniBar label="resolved" value={resolvedIncidents} max={Math.max(incidents.length, 1)} color="bg-emerald-500" />
              <MiniBar label="cancelled" value={cancelledIncidents} max={Math.max(incidents.length, 1)} color="bg-gray-400" />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Radio size={14} className="text-gray-400" />
                <h3 className="text-sm font-medium text-gray-800">Broadcast Priority Mix</h3>
              </div>
              <MiniBar label="low" value={broadcastCounts.LOW ?? 0} max={Math.max(alerts.length, 1)} color="bg-gray-400" />
              <MiniBar label="medium" value={broadcastCounts.MEDIUM ?? 0} max={Math.max(alerts.length, 1)} color="bg-amber-400" />
              <MiniBar label="high" value={broadcastCounts.HIGH ?? 0} max={Math.max(alerts.length, 1)} color="bg-orange-500" />
              <MiniBar label="urgent" value={broadcastCounts.URGENT ?? 0} max={Math.max(alerts.length, 1)} color="bg-red-600" />
            </div>
          </div>
        </section>

        <section ref={incidentsRef}>
          <SectionHeader
            icon={<ShieldAlert size={14} className="text-red-600" />}
            title="Current Incidents"
            count={incidents.length}
            loading={incidentsLoading}
            onRefresh={fetchIncidents}
            accent="bg-red-50 border-red-200"
          />

          {!incidentsLoading && incidents.length > 0 && (
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
              {["all", "active", "contained", "resolved", "cancelled"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs uppercase transition-all ${
                    statusFilter === f
                      ? "bg-white text-gray-800 shadow-sm font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f}
                  {f !== "all" && statusCounts[f] > 0 && (
                    <span className="ml-1 text-[10px] opacity-60">({statusCounts[f]})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {incidentsLoading && <SkeletonTable />}
          {!incidentsLoading && incidents.length === 0 && <EmptyState label="incidents on record" />}

          {!incidentsLoading && incidents.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1.5fr_1fr_auto] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-400 select-none">
                <span>Name</span>
                <span>Status</span>
                <span>Severity</span>
                <span>Priority</span>
                <span>Created</span>
                <span>Category</span>
                <span />
              </div>

              {filteredIncidents.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No {statusFilter} incidents
                </div>
              )}

              {filteredIncidents.map((inc, idx) => (
                <div
                  key={inc.incident_id}
                  onClick={() => setDrawerIncident(inc)}
                  className={`grid grid-cols-[2.5fr_1fr_1fr_1fr_1.5fr_1fr_auto] gap-3 px-4 py-3.5 items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                    idx < filteredIncidents.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-0.5 h-8 rounded-full flex-shrink-0 ${SEV_BAR[inc.severity] ?? "bg-gray-300"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{inc.title}</p>
                      <p className="text-[11px] text-gray-400 truncate">{inc.incident_id.slice(0, 12)}…</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium w-fit capitalize ${STATUS_STYLE[inc.status] ?? STATUS_STYLE.active}`}>
                    {inc.status}
                  </span>

                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium w-fit capitalize ${SEV[inc.severity] ?? SEV.medium}`}>
                    {inc.severity}
                  </span>

                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium w-fit capitalize ${PRIORITY_STYLE[inc.priority] ?? PRIORITY_STYLE.medium}`}>
                    {inc.priority}
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Clock size={10} className="flex-shrink-0" />
                    <span className="truncate">{new Date(inc.created_at).toLocaleDateString()}</span>
                  </div>

                  <span className="text-[11px] text-gray-500 capitalize truncate">
                    {String(inc.category || "other").replace(/_/g, " ")}
                  </span>

                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>

        <Divider label="broadcasts" />

        <section ref={broadcastsRef}>
          <SectionHeader
            icon={<Radio size={14} className="text-orange-500" />}
            title="Broadcast Alerts"
            count={alerts.length}
            loading={alertsLoading}
            onRefresh={fetchAlerts}
            accent="bg-orange-50 border-orange-200"
          />

          {!alertsLoading && alerts.length > 0 && (
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
              {["all", "LOW", "MEDIUM", "HIGH", "URGENT"].map((f) => (
                <button
                  key={f}
                  onClick={() => setBroadcastFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs uppercase transition-all ${
                    broadcastFilter === f
                      ? "bg-white text-gray-800 shadow-sm font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f.toLowerCase()}
                  {f !== "all" && (broadcastCounts[f] ?? 0) > 0 && (
                    <span className="ml-1 text-[10px] opacity-60">({broadcastCounts[f]})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {alertsLoading && <SkeletonTable />}
          {!alertsLoading && alerts.length === 0 && <EmptyState label="broadcast alerts" />}

          {!alertsLoading && alerts.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="grid grid-cols-[2.8fr_1fr_1fr_1fr_1.6fr_auto] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-400 select-none">
                <span>Message</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Radius</span>
                <span>Updated</span>
                <span />
              </div>

              {filteredBroadcasts.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No {broadcastFilter.toLowerCase()} broadcasts
                </div>
              )}

              {filteredBroadcasts.map((a, idx) => (
                <div
                  key={a.id}
                  className={`${idx < filteredBroadcasts.length - 1 ? "border-b border-gray-100" : ""}`}
                >
                  <div className="grid grid-cols-[2.8fr_1fr_1fr_1fr_1.6fr_auto] gap-3 px-4 py-3 items-center hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.message || "Untitled broadcast"}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {a.description || a.id}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium w-fit ${
                      a.priority === "URGENT" ? "bg-red-100 text-red-700 border-red-300" :
                      a.priority === "HIGH" ? "bg-orange-50 text-orange-700 border-orange-300" :
                      a.priority === "MEDIUM" ? "bg-amber-50 text-amber-700 border-amber-300" :
                      "bg-gray-100 text-gray-600 border-gray-300"
                    }`}>
                      {a.priority}
                    </span>

                    <span className="px-2 py-0.5 rounded-full border text-[11px] font-medium w-fit bg-orange-50 text-orange-700 border-orange-200">
                      {a.status}
                    </span>

                    <span className="text-[11px] text-gray-600">
                      {a.radius} km
                    </span>

                    <span className="text-[11px] text-gray-400">
                      {a.updatedAt
                        ? new Date(a.updatedAt).toLocaleDateString()
                        : a.timestamp
                          ? new Date(a.timestamp).toLocaleDateString()
                          : "—"}
                    </span>

                    <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                  </div>

                  <div className="px-3 pb-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden">
                      <AlertCard alert={a} onDelete={handleAlertDelete} onUpdate={handleAlertUpdate} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <Divider label="field reports" />

        <section ref={reportsRef} className="scroll-mt-16">
          <SectionHeader
            icon={<Flame size={14} className="text-red-500" />}
            title="Pending Fire Reviews"
            count={fireReports.length}
            loading={reportsLoading}
            onRefresh={fetchFireReports}
            accent="bg-red-50 border-red-200"
          />

          {reportsLoading && <SkeletonGrid />}
          {!reportsLoading && fireReports.length === 0 && <EmptyState label="pending fire reports" />}

          {!reportsLoading && fireReports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fireReports.map((report) => (
                <div key={report.report_id} className="rounded-xl border border-gray-200 bg-white hover:border-red-200 hover:shadow-md transition-all overflow-hidden shadow-sm flex flex-col">
                  <div className={`h-0.5 w-full ${SEV_BAR[report.severity] ?? "bg-gray-300"}`} />
                  <div className="flex-1">
                    <FireReportCard
                      report_id={report.report_id}
                      photo_links={report.photo_links}
                      hazard_type={report.hazard_type}
                      uploading_user={report.uploading_user}
                      coordinates={report.coordinates}
                      severity={report.severity}
                      timestamp={report.timestamp}
                      status={report.status}
                    />
                  </div>

                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center gap-2">
                    <div className={`text-[10px] px-2 py-0.5 rounded-md border uppercase tracking-wider mr-auto ${SEV[report.severity]}`}>
                      {report.severity}
                    </div>

                    <button
                      onClick={() => setReviewTarget(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 transition-all text-[11px]"
                    >
                      <CheckCircle2 size={12} /> Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Alerts;