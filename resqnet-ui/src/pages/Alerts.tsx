import React, { useState, useEffect, useCallback, useRef } from "react";
import AlertCard from "../components/AlertCard";
import FireReportCard from "../components/FireReportCard";
import { useApi } from "../utils/api";
import type { BroadcastAlert } from "../components/map/types";
import {
  Radio, Flame, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Activity, Loader2,
  ShieldAlert, ChevronDown, ChevronRight, Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface FireReport {
  _id?:           string;
  report_id:      string;
  photo_links:    string[];
  hazard_type:    string;
  uploading_user: string;
  coordinates:    [number, number];
  severity:       "low" | "medium" | "high" | "critical";
  description?:   string;
  timestamp:      string;
  status?:        "pending_review" | "verified" | "converted_to_incident" | "rejected";
}

interface Incident {
  _id?:                   string;
  incident_id:            string;
  title:                  string;
  description?:           string;
  category:               string;
  priority:               string;
  severity:               string;
  status:                 "active" | "contained" | "resolved" | "cancelled";
  coordinates?:           [number, number];
  source_fire_report_id?: string | null;
  created_by:             { user_id: string; name?: string };
  created_at:             string;
  updated_at?:            string;
  logs?:                  { message: string; updated_by: { user_id: string }; timestamp: string }[];
  comments?:              { message: string; created_by: { user_id: string }; created_at: string }[];
}

// ── Style maps ─────────────────────────────────────────────────────────────────

const SEV: Record<string, string> = {
  low:      "bg-gray-100 text-gray-500 border-gray-300",
  medium:   "bg-amber-50 text-amber-700 border-amber-300",
  high:     "bg-red-50 text-red-600 border-red-300",
  critical: "bg-red-100 text-red-800 border-red-400 font-bold",
  urgent:   "bg-red-100 text-red-800 border-red-400 font-bold",
};

const SEV_BAR: Record<string, string> = {
  low:      "bg-gray-300",
  medium:   "bg-amber-400",
  high:     "bg-red-500",
  critical: "bg-red-700",
  urgent:   "bg-red-700",
};

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-red-50 text-red-600 border-red-200",
  contained: "bg-amber-50 text-amber-700 border-amber-200",
  resolved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-400 border-gray-200",
};

// ── Shared components ──────────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  icon:      React.ReactNode;
  title:     string;
  count?:    number;
  loading:   boolean;
  onRefresh: () => void;
  accent:    string;
}> = ({ icon, title, count, loading, onRefresh, accent }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg border ${accent}`}>{icon}</div>
      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-gray-800 font-mono">{title}</h2>
        {count !== undefined && !loading && (
          <p className="text-[11px] text-gray-400 font-mono mt-0.5">{count} record{count !== 1 ? "s" : ""}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-2">
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${loading ? "bg-gray-400" : "bg-orange-400"}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${loading ? "bg-gray-300" : "bg-orange-500"}`} />
        </span>
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{loading ? "syncing" : "live"}</span>
      </div>
    </div>
    <button
      onClick={onRefresh}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-orange-500 hover:border-orange-300 transition-all text-[11px] font-mono uppercase tracking-wider shadow-sm disabled:opacity-40"
    >
      <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
    </button>
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50">
    <Activity size={28} className="text-gray-300 mb-3" />
    <p className="text-gray-400 text-sm font-mono">No {label}</p>
    <p className="text-gray-300 text-[11px] font-mono mt-1">System nominal</p>
  </div>
);

const SkeletonTable: React.FC = () => (
  <div className="space-y-px border border-gray-200 rounded-xl overflow-hidden">
    <div className="h-10 bg-gray-50 border-b border-gray-200 animate-pulse" />
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-14 bg-white animate-pulse border-b border-gray-100 last:border-0" style={{ animationDelay: `${i * 80}ms` }} />
    ))}
  </div>
);

const SkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-44 rounded-xl bg-gray-100 border border-gray-100 animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
    ))}
  </div>
);

const Divider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-4">
    <div className="flex-1 h-px bg-gray-100" />
    <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest">{label}</span>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

// ── Incident Status Drawer ─────────────────────────────────────────────────────

const IncidentDrawer: React.FC<{
  incident:       Incident;
  onClose:        () => void;
  onStatusChange: (id: string, status: string) => void;
}> = ({ incident, onClose, onStatusChange }) => {
  const { fetchWithAuth } = useApi();
  const [updating, setUpdating] = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  const changeStatus = async (newStatus: string) => {
    setUpdating(true);
    setErr(null);
    try {
      await fetchWithAuth(`/incidents/${incident.incident_id}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      onStatusChange(incident.incident_id, newStatus);
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-base font-bold text-gray-900">{incident.title}</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{incident.incident_id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${STATUS_STYLE[incident.status] ?? STATUS_STYLE.active}`}>
              {incident.status}
            </span>
            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${SEV[incident.severity] ?? SEV.medium}`}>
              {incident.severity} severity
            </span>
            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${SEV[incident.priority] ?? SEV.medium}`}>
              {incident.priority} priority
            </span>
            <span className="px-2.5 py-1 rounded-full border text-xs bg-gray-50 text-gray-500 border-gray-200 capitalize">
              {incident.category.replace(/_/g, " ")}
            </span>
          </div>

          {incident.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{incident.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 uppercase tracking-wider mb-1">Created by</p>
              <p className="text-gray-700 font-semibold truncate">
                {incident.created_by.name ?? incident.created_by.user_id}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-400 uppercase tracking-wider mb-1">Created at</p>
              <p className="text-gray-700 font-semibold">{new Date(incident.created_at).toLocaleString()}</p>
            </div>
            {incident.coordinates && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 uppercase tracking-wider mb-1">Coordinates</p>
                <p className="text-gray-700 font-semibold">
                  [{incident.coordinates[0].toFixed(4)}, {incident.coordinates[1].toFixed(4)}]
                </p>
              </div>
            )}
            {incident.source_fire_report_id && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 uppercase tracking-wider mb-1">Source report</p>
                <p className="text-gray-700 font-semibold truncate">{incident.source_fire_report_id}</p>
              </div>
            )}
          </div>

          {incident.logs && incident.logs.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Recent activity</p>
              {incident.logs.slice(-3).map((log, i) => (
                <p key={i} className="text-[11px] text-gray-400 font-mono">
                  {new Date(log.timestamp).toLocaleString()} — {log.message}
                </p>
              ))}
            </div>
          )}

          {err && <p className="text-red-500 text-xs font-mono">{err}</p>}
        </div>

        {/* Status actions */}
        <div className="px-5 py-4 border-t bg-gray-50">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-2">Change Status</p>
          <div className="flex gap-2 flex-wrap">
            {(["active", "contained", "resolved", "cancelled"] as const)
              .filter((s) => s !== incident.status)
              .map((s) => (
                <button
                  key={s}
                  disabled={updating}
                  onClick={() => changeStatus(s)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-colors disabled:opacity-50
                    ${s === "active"    ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" : ""}
                    ${s === "contained" ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : ""}
                    ${s === "resolved"  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : ""}
                    ${s === "cancelled" ? "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200" : ""}
                  `}
                >
                  {updating && <Loader2 size={11} className="animate-spin inline mr-1" />}
                  Mark {s}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Review Modal ───────────────────────────────────────────────────────────────

interface ReviewModalProps {
  report:  FireReport;
  onClose: () => void;
  onDone:  (reportId: string, decision: string) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ report, onClose, onDone }) => {
  const { fetchWithAuth } = useApi();
  const [notes, setNotes]               = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [incTitle, setIncTitle]         = useState(`${report.hazard_type} — ${report.report_id}`);
  const [incDesc, setIncDesc]           = useState(report.description ?? "");
  const [incCategory, setIncCategory]   = useState("wildfire");
  const [incPriority, setIncPriority]   = useState("high");
  const [incSeverity, setIncSeverity]   = useState(report.severity === "critical" ? "critical" : report.severity);

  const submit = async (decision: "verify" | "verify_and_change_to_incident" | "reject") => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, any> = { decision, notes: notes || undefined };
      if (decision === "reject") {
        if (!rejectReason.trim()) { setError("Rejection reason is required."); setLoading(false); return; }
        payload.rejection_reason = rejectReason;
      }
      if (decision === "verify_and_change_to_incident") {
        payload.incident_payload = {
          title: incTitle, description: incDesc, category: incCategory,
          priority: incPriority, severity: incSeverity,
          coordinates: report.coordinates, photos: report.photo_links,
        };
      }
      await fetchWithAuth(`/fires/${report.report_id}/verify`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
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
            <h2 className="text-base font-bold text-gray-900">Review Fire Report</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{report.report_id}</p>
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
          <p className="text-gray-500"><span className="font-semibold text-gray-700">By:</span> {report.uploading_user}</p>
          <p className="text-gray-500"><span className="font-semibold text-gray-700">Coords:</span> [{report.coordinates[0].toFixed(4)}, {report.coordinates[1].toFixed(4)}]</p>
          {report.description && <p className="text-gray-500"><span className="font-semibold text-gray-700">Note:</span> {report.description}</p>}
        </div>

        <div className="px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Reviewer notes <span className="font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..."
            />
          </div>

          <div className="border border-orange-200 rounded-lg p-3 bg-orange-50 space-y-2">
            <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              Incident Details <span className="font-normal text-orange-400">(used if converting)</span>
            </p>
            <input
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white"
              placeholder="Title" value={incTitle} onChange={(e) => setIncTitle(e.target.value)}
            />
            <textarea
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm resize-none bg-white"
              rows={2} placeholder="Description" value={incDesc} onChange={(e) => setIncDesc(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 font-mono uppercase">Category</label>
                <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white" value={incCategory} onChange={(e) => setIncCategory(e.target.value)}>
                  {["wildfire","smoke","road_block","evacuation_issue","rescue_request","other"].map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-mono uppercase">Priority</label>
                <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white" value={incPriority} onChange={(e) => setIncPriority(e.target.value)}>
                  {["low","medium","high","urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-mono uppercase">Severity</label>
                <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white" value={incSeverity} onChange={(e) => setIncSeverity(e.target.value)}>
                  {["low","medium","high","critical"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Rejection reason <span className="font-normal text-gray-400">(required to reject)</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="e.g. Duplicate, insufficient evidence..."
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t bg-gray-50 flex gap-2">
          <button disabled={loading} onClick={() => submit("verify")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-colors">
            <CheckCircle2 size={13} /> Verify
          </button>
          <button disabled={loading} onClick={() => submit("verify_and_change_to_incident")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-colors">
            <Flame size={13} /> Verify + Incident
          </button>
          <button disabled={loading || !rejectReason.trim()} onClick={() => submit("reject")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-colors">
            <XCircle size={13} /> Reject
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

function Alerts() {
  const { fetchWithAuth } = useApi();
  const fireQueueRef = useRef<HTMLDivElement>(null);

  const [incidents, setIncidents]               = useState<Incident[]>([]);
  const [alerts, setAlerts]                     = useState<BroadcastAlert[]>([]);
  const [fireReports, setFireReports]           = useState<FireReport[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [alertsLoading, setAlertsLoading]       = useState(true);
  const [reportsLoading, setReportsLoading]     = useState(true);
  const [reviewTarget, setReviewTarget]         = useState<FireReport | null>(null);
  const [drawerIncident, setDrawerIncident]     = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter]         = useState<string>("all");

  // ── Fetchers ──────────────────────────────────────────────────────────────────

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
        id:          b._id ?? b.id,
        position:    b.coordinates ?? b.position,
        radius:      b.radius,
        priority:    (b.priority as string).toUpperCase() as BroadcastAlert["priority"],
        message:     b.message,
        timestamp:   b.timestamp,
        status:      b.status ?? "ACTIVE",
        description: b.description ?? null,
        createdBy:   b.created_by ?? b.createdBy ?? null,
        updatedBy:   b.updated_by ?? b.updatedBy ?? null,
        updatedAt:   b.updated_at ?? b.updatedAt ?? null,
        logs:        b.logs ?? [],
      }));
      setAlerts(normalised);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
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

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleAlertDelete = async (id: string) => {
    try {
      await fetchWithAuth(`/broadcasts/${id}`, { method: "DELETE" });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) { console.error("Delete error:", err); }
  };

  const handleAlertUpdate = async (id: string, updated: BroadcastAlert) => {
    try {
      const result = await fetchWithAuth(`/broadcasts/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:     updated.message,
          radius:      updated.radius,
          priority:    updated.priority.toLowerCase(),
          coordinates: updated.position,
          timestamp:   updated.timestamp,
        }),
      });
      setAlerts((prev) => prev.map((a) =>
        a.id === id
          ? { ...updated, id, updatedAt: result.broadcast?.updated_at ?? new Date().toISOString() }
          : a
      ));
    } catch (err) { console.error("Update error:", err); }
  };

  // ── THE FIX: notify Dashboard map to refetch after any review ────────────────
  const handleReviewDone = (reportId: string, decision: string) => {
    setReviewTarget(null);
    setFireReports((prev) => prev.filter((r) => r.report_id !== reportId));
    if (decision === "verify_and_change_to_incident") fetchIncidents();
    window.dispatchEvent(new CustomEvent("fire-report-reviewed"));
    console.log("[Alerts] dispatched fire-report-reviewed for", reportId, decision);
  };

  const handleIncidentStatusChange = (id: string, newStatus: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.incident_id === id ? { ...inc, status: newStatus as Incident["status"] } : inc
      )
    );
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const activeIncidents = incidents.filter((i) => i.status === "active").length;
  const urgentAlerts    = alerts.filter((a) => a.priority === "URGENT").length;
  const highFires       = fireReports.filter((r) => r.severity === "high" || r.severity === "critical").length;
  const anyLoading      = incidentsLoading || alertsLoading || reportsLoading;

  const filteredIncidents = statusFilter === "all"
    ? incidents
    : incidents.filter((i) => i.status === statusFilter);

  const statusCounts = ["active", "contained", "resolved", "cancelled"].reduce((acc, s) => {
    acc[s] = incidents.filter((i) => i.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto bg-white text-gray-900">

      {reviewTarget && (
        <ReviewModal report={reviewTarget} onClose={() => setReviewTarget(null)} onDone={handleReviewDone} />
      )}
      {drawerIncident && (
        <IncidentDrawer incident={drawerIncident} onClose={() => setDrawerIncident(null)} onStatusChange={handleIncidentStatusChange} />
      )}

      {/* ── Sticky top bar ─────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-orange-500" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400">ResQNet / Alerts</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <span className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border ${activeIncidents > 0 ? "bg-red-50 border-red-200 text-red-500" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              <ShieldAlert size={10} />
              {incidentsLoading ? "—" : incidents.length} incident{incidents.length !== 1 ? "s" : ""}
              {activeIncidents > 0 && <span className="font-semibold ml-1">· {activeIncidents} active</span>}
            </span>
            <span className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border ${urgentAlerts > 0 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              <Radio size={10} />
              {alertsLoading ? "—" : alerts.length} broadcast{alerts.length !== 1 ? "s" : ""}
              {urgentAlerts > 0 && <span className="font-semibold ml-1">· {urgentAlerts} urgent</span>}
            </span>
            <span className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border ${fireReports.length > 0 ? "bg-orange-50 border-orange-200 text-orange-500" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              <Flame size={10} />
              {reportsLoading ? "—" : fireReports.length} pending review{fireReports.length !== 1 ? "s" : ""}
              {highFires > 0 && <span className="font-semibold ml-1">· {highFires} high sev</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 size={11} className={`text-orange-500 ${anyLoading ? "animate-spin opacity-100" : "opacity-0"}`} />
            {fireReports.length > 0 && (
              <button
                onClick={() => fireQueueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-mono uppercase tracking-wider transition-colors shadow-sm"
              >
                <ChevronDown size={11} />
                {fireReports.length} Pending Review{fireReports.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

        {/* ── SECTION 1: SUMMARY + INCIDENTS ─────────────────────────────────── */}
        <section>
          <h1 className="text-xl font-bold text-gray-900 mb-6">Current Summary</h1>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-mono uppercase tracking-wider text-gray-400">Total Incidents</p>
                <ShieldAlert size={16} className="text-gray-300" />
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                {incidentsLoading
                  ? <span className="inline-block w-10 h-8 bg-gray-100 animate-pulse rounded" />
                  : incidents.length}
              </p>
              <div className="mt-2 h-0.5 w-full bg-gray-100 rounded-full">
                <div className="h-0.5 bg-gray-400 rounded-full w-full" />
              </div>
            </div>

            <div className="bg-white border border-red-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-mono uppercase tracking-wider text-red-400">Active</p>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <p className="text-3xl font-bold text-red-600 tabular-nums">
                {incidentsLoading
                  ? <span className="inline-block w-10 h-8 bg-red-50 animate-pulse rounded" />
                  : activeIncidents}
              </p>
              <div className="mt-2 h-0.5 w-full bg-red-100 rounded-full">
                <div
                  className="h-0.5 bg-red-400 rounded-full transition-all duration-500"
                  style={{ width: incidents.length ? `${(activeIncidents / incidents.length) * 100}%` : "0%" }}
                />
              </div>
            </div>

            <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-mono uppercase tracking-wider text-amber-500">Broadcasts</p>
                <Radio size={16} className="text-amber-300" />
              </div>
              <p className="text-3xl font-bold text-amber-600 tabular-nums">
                {alertsLoading
                  ? <span className="inline-block w-10 h-8 bg-amber-50 animate-pulse rounded" />
                  : alerts.length}
              </p>
              {urgentAlerts > 0 && (
                <p className="mt-1 text-[11px] font-mono text-amber-500">{urgentAlerts} urgent</p>
              )}
            </div>

            <div className="bg-white border border-orange-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-mono uppercase tracking-wider text-orange-400">Pending Reviews</p>
                <Flame size={16} className="text-orange-300" />
              </div>
              <p className="text-3xl font-bold text-orange-500 tabular-nums">
                {reportsLoading
                  ? <span className="inline-block w-10 h-8 bg-orange-50 animate-pulse rounded" />
                  : fireReports.length}
              </p>
              {highFires > 0 && (
                <p className="mt-1 text-[11px] font-mono text-red-500">{highFires} high severity</p>
              )}
            </div>
          </div>

          {/* Incidents table */}
          <SectionHeader
            icon={<ShieldAlert size={14} className="text-red-600" />}
            title="Current Incidents"
            count={incidents.length}
            loading={incidentsLoading}
            onRefresh={fetchIncidents}
            accent="bg-red-50 border-red-200"
          />

          {!incidentsLoading && incidents.length > 0 && (
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
              {["all", "active", "contained", "resolved", "cancelled"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-mono uppercase tracking-wider transition-all ${
                    statusFilter === f
                      ? "bg-white text-gray-800 shadow-sm font-bold"
                      : "text-gray-400 hover:text-gray-600"
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
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1.5fr_1fr_auto] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[10px] font-mono uppercase tracking-widest text-gray-400 select-none">
                <span>Name</span>
                <span>Status</span>
                <span>Severity</span>
                <span>Priority</span>
                <span>Created</span>
                <span>Category</span>
                <span />
              </div>

              {filteredIncidents.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400 font-mono">
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
                      <p className="text-sm font-semibold text-gray-800 truncate">{inc.title}</p>
                      <p className="text-[11px] text-gray-400 font-mono truncate">{inc.incident_id.slice(0, 12)}…</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold w-fit capitalize ${STATUS_STYLE[inc.status] ?? STATUS_STYLE.active}`}>
                    {inc.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold w-fit capitalize ${SEV[inc.severity] ?? SEV.medium}`}>
                    {inc.severity}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold w-fit capitalize ${SEV[inc.priority] ?? SEV.medium}`}>
                    {inc.priority}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                    <Clock size={10} className="flex-shrink-0" />
                    <span className="truncate">{new Date(inc.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-mono capitalize truncate">
                    {inc.category.replace(/_/g, " ")}
                  </span>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>

        <Divider label="broadcasts" />

        {/* ── SECTION 2: BROADCASTS ─────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={<Radio size={14} className="text-orange-500" />}
            title="Broadcast Alerts"
            count={alerts.length}
            loading={alertsLoading}
            onRefresh={fetchAlerts}
            accent="bg-orange-50 border-orange-200"
          />
          {alertsLoading && <SkeletonGrid />}
          {!alertsLoading && alerts.length === 0 && <EmptyState label="broadcast alerts" />}
          {!alertsLoading && alerts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((a) => (
                <div key={a.id} className="rounded-xl border border-gray-200 bg-white hover:border-orange-200 hover:shadow-md transition-all overflow-hidden shadow-sm">
                  <AlertCard alert={a} onDelete={handleAlertDelete} onUpdate={handleAlertUpdate} />
                </div>
              ))}
            </div>
          )}
        </section>

        <Divider label="field reports" />

        {/* ── SECTION 3: FIRE REVIEW QUEUE ──────────────────────────────────── */}
        <section ref={fireQueueRef} className="scroll-mt-16">
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
                    <div className={`text-[10px] font-mono px-2 py-0.5 rounded-md border uppercase tracking-wider mr-auto ${SEV[report.severity]}`}>
                      {report.severity}
                    </div>
                    <button
                      onClick={() => setReviewTarget(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 transition-all text-[11px] font-mono uppercase tracking-wider"
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