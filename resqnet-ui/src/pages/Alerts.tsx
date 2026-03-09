import React, { useState, useEffect, useCallback } from "react";
import AlertCard from "../components/AlertCard";
import FireReportCard from "../components/FireReportCard";
import { useApi } from "../utils/api";
import type { BroadcastAlert } from "../components/map/types";
import {
  Radio, Flame, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Activity, Loader2,
} from "lucide-react";

// ── FireReport type (local — not in types.ts yet) ──────────────
interface FireReport {
  report_id:      string;
  photo_link:     string;
  hazard_type:    string;
  uploading_user: string;
  coordinates:    [number, number];
  severity:       "low" | "medium" | "high";
  timestamp:      string;
}

// ── Severity pill styles ───────────────────────────────────────
const SEV: Record<string, string> = {
  low:    "bg-gray-100 text-gray-500 border-gray-300",
  medium: "bg-amber-50 text-amber-700 border-amber-300",
  high:   "bg-red-50 text-red-600 border-red-300",
};

// ── Section header ─────────────────────────────────────────────
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
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-gray-800 font-mono">
          {title}
        </h2>
        {count !== undefined && !loading && (
          <p className="text-[11px] text-gray-400 font-mono mt-0.5">
            {count} record{count !== 1 ? "s" : ""} active
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-2">
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-50 ${loading ? "bg-gray-400" : "bg-orange-400"}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${loading ? "bg-gray-300" : "bg-orange-500"}`} />
        </span>
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
          {loading ? "syncing" : "live"}
        </span>
      </div>
    </div>
    <button
      onClick={onRefresh}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-orange-500 hover:border-orange-300 transition-all text-[11px] font-mono uppercase tracking-wider shadow-sm disabled:opacity-40"
    >
      <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
      Refresh
    </button>
  </div>
);

// ── Empty state ────────────────────────────────────────────────
const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50">
    <Activity size={28} className="text-gray-300 mb-3" />
    <p className="text-gray-400 text-sm font-mono">No {label} on record</p>
    <p className="text-gray-300 text-[11px] font-mono mt-1">System nominal</p>
  </div>
);

// ── Skeleton loader ────────────────────────────────────────────
const SkeletonGrid: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="h-44 rounded-xl bg-gray-100 border border-gray-100 animate-pulse"
        style={{ animationDelay: `${i * 120}ms` }}
      />
    ))}
  </div>
);

// ── Main page ──────────────────────────────────────────────────
function Alerts() {
  const { fetchWithAuth } = useApi();
  const [alerts, setAlerts]                 = useState<BroadcastAlert[]>([]);
  const [fireReports, setFireReports]       = useState<FireReport[]>([]);
  const [loading, setLoading]               = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);

  // ── Fetchers ─────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth("/broadcasts");
      // API returns snake_case — normalise to BroadcastAlert shape
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
      setLoading(false);
    }
  }, [fetchWithAuth]);

  const fetchFireReports = useCallback(async () => {
    try {
      setReportsLoading(true);
      const data = await fetchWithAuth("/fires");
      setFireReports(data || []);
    } catch (err) {
      console.error("Failed to fetch fire reports:", err);
    } finally {
      setReportsLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchAlerts();
    fetchFireReports();
  }, [fetchAlerts, fetchFireReports]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await fetchWithAuth(`/broadcasts/${id}`, { method: "DELETE" });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleUpdate = async (id: string, updated: BroadcastAlert) => {
    try {
      const result = await fetchWithAuth(`/broadcasts/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:     updated.message,
          radius:      updated.radius,
          priority:    updated.priority.toLowerCase(),
          coordinates: updated.position,
          timestamp:   updated.timestamp,
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

  const handleDeleteReport = (reportId: string) => {
    setFireReports((prev) => prev.filter((r) => r.report_id !== reportId));
  };

  const handleVerifyReport = (reportId: string) => {
    console.log("Verified report:", reportId);
  };

  // ── Stats ─────────────────────────────────────────────────────
  const urgentCount = alerts.filter((a) => a.priority === "URGENT").length;
  const highFires   = fireReports.filter((r) => r.severity === "high").length;

  return (
    // ↓ KEY FIX: overflow-y-auto + h-full instead of min-h-screen
    // Assumes this page is rendered inside a layout that fills the viewport.
    // If this IS the root, use: className="h-screen overflow-y-auto"
    <div className="h-full overflow-y-auto bg-white text-gray-900">

      {/* ── Sticky command bar ───────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-orange-500" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400">
                ResQNet / Alerts
              </span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border ${
                urgentCount > 0
                  ? "bg-red-50 border-red-200 text-red-500"
                  : "bg-gray-50 border-gray-200 text-gray-400"
              }`}>
                <Radio size={10} />
                {loading ? "—" : alerts.length} broadcasts
                {urgentCount > 0 && (
                  <span className="ml-1 font-semibold">· {urgentCount} urgent</span>
                )}
              </span>
              <span className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border ${
                highFires > 0
                  ? "bg-orange-50 border-orange-200 text-orange-500"
                  : "bg-gray-50 border-gray-200 text-gray-400"
              }`}>
                <Flame size={10} />
                {reportsLoading ? "—" : fireReports.length} reports
                {highFires > 0 && (
                  <span className="ml-1 font-semibold">· {highFires} high sev</span>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Loader2
              size={11}
              className={`text-orange-500 transition-opacity ${
                (loading || reportsLoading) ? "animate-spin opacity-100" : "opacity-0"
              }`}
            />
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              {(loading || reportsLoading) ? "syncing..." : "all systems nominal"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

        {/* Broadcast Alerts */}
        <section>
          <SectionHeader
            icon={<Radio size={14} className="text-orange-500" />}
            title="Broadcast Alerts"
            count={alerts.length}
            loading={loading}
            onRefresh={fetchAlerts}
            accent="bg-orange-50 border-orange-200"
          />
          {loading && <SkeletonGrid />}
          {!loading && alerts.length === 0 && <EmptyState label="broadcast alerts" />}
          {!loading && alerts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-gray-200 bg-white hover:border-orange-200 hover:shadow-md transition-all overflow-hidden shadow-sm"
                >
                  <AlertCard
                    alert={a}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest">
            field reports
          </span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Fire Reports */}
        <section>
          <SectionHeader
            icon={<Flame size={14} className="text-red-500" />}
            title="Fire Reports — Verification Queue"
            count={fireReports.length}
            loading={reportsLoading}
            onRefresh={fetchFireReports}
            accent="bg-red-50 border-red-200"
          />
          {reportsLoading && <SkeletonGrid />}
          {!reportsLoading && fireReports.length === 0 && <EmptyState label="fire reports" />}
          {!reportsLoading && fireReports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fireReports.map((report) => (
                <div
                  key={report.report_id}
                  className="rounded-xl border border-gray-200 bg-white hover:border-red-200 hover:shadow-md transition-all overflow-hidden shadow-sm flex flex-col"
                >
                  <div className={`h-0.5 w-full ${
                    report.severity === "high"   ? "bg-red-500" :
                    report.severity === "medium" ? "bg-amber-400" :
                                                   "bg-gray-300"
                  }`} />
                  <div className="flex-1">
                    <FireReportCard
                      report_id={report.report_id}
                      photo_link={report.photo_link}
                      hazard_type={report.hazard_type}
                      uploading_user={report.uploading_user}
                      coordinates={report.coordinates}
                      severity={report.severity}
                      timestamp={report.timestamp}
                    />
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center gap-2">
                    <div className={`text-[10px] font-mono px-2 py-0.5 rounded-md border uppercase tracking-wider mr-auto ${SEV[report.severity]}`}>
                      {report.severity}
                    </div>
                    <button
                      onClick={() => handleVerifyReport(report.report_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 transition-all text-[11px] font-mono uppercase tracking-wider"
                    >
                      <CheckCircle2 size={12} /> Verify
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report.report_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300 transition-all text-[11px] font-mono uppercase tracking-wider"
                    >
                      <XCircle size={12} /> Reject
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
