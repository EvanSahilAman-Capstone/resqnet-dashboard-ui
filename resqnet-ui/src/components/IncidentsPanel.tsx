import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, ChevronUp, MapPin, User, Hash, X, ShieldAlert } from "lucide-react";
import type { Incident } from "../hooks/useLocalData";
import { usePanels } from "../context/PanelContext";
import { useApi } from "../utils/api";

interface IncidentsPanelProps {
  onFlyTo?: (lat: number, lng: number) => void;
}

const SEV_BADGE: Record<string, string> = {
  low:      "bg-yellow-100 text-yellow-800 border border-yellow-300",
  medium:   "bg-orange-100 text-orange-800 border border-orange-300",
  high:     "bg-red-100    text-red-800    border border-red-300",
  critical: "bg-red-200    text-red-900    border border-red-400",
};

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-red-50   text-red-600   border border-red-200",
  contained: "bg-green-50 text-green-700 border border-green-200",
  resolved:  "bg-gray-100 text-gray-500  border border-gray-200",
  cancelled: "bg-gray-100 text-gray-400  border border-gray-200",
};

const MIN_WIDTH     = 260;
const MAX_WIDTH     = 560;
const DEFAULT_WIDTH = 300;
const LEFT_OFFSET   = 64;

const IncidentsPanel: React.FC<IncidentsPanelProps> = ({ onFlyTo }) => {
  const { incidentsOpen, setIncidentsOpen } = usePanels();
  const { fetchWithAuth } = useApi();

  const [incidents, setIncidents]   = useState<Incident[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [width, setWidth]           = useState(DEFAULT_WIDTH);

  const resizing   = useRef(false);
  const startX     = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    if (!incidentsOpen) return;
    let cancelled = false;
    setLoading(true);
    fetchWithAuth("/incidents")
      .then((data: any) => {
        if (!cancelled)
          setIncidents(Array.isArray(data) ? data : (data.incidents ?? []));
      })
      .catch(() => { if (!cancelled) setIncidents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [incidentsOpen, fetchWithAuth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const delta = e.clientX - startX.current;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta)));
    };
    const onMouseUp = () => { resizing.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, []);

  const filtered = incidents.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()) ||
    i.severity.toLowerCase().includes(search.toLowerCase()) ||
    i.status.toLowerCase().includes(search.toLowerCase()) ||
    i.incident_id.toLowerCase().includes(search.toLowerCase())
  );

  if (!incidentsOpen) return null;

  return (
    <div
      className="fixed top-0 z-[500] h-screen bg-white/98 backdrop-blur-sm border-r border-gray-200 shadow-2xl flex flex-col"
      style={{ left: LEFT_OFFSET, width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-500" />
          <span className="text-sm font-semibold text-gray-800">
            Incidents
            <span className="ml-2 text-xs font-normal text-gray-400">({incidents.length})</span>
          </span>
        </div>
        <button
          onClick={() => setIncidentsOpen(false)}
          className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {loading && (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">Loading...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-8 flex flex-col items-center gap-2 text-gray-400">
            <ShieldAlert size={28} className="text-gray-300" />
            <p className="text-sm">No incidents found</p>
          </div>
        )}

        {!loading && filtered.map((inc) => {
          const isExpanded  = expandedId === inc.incident_id;
          const sevBadge    = SEV_BADGE[inc.severity]  ?? SEV_BADGE.high;
          const statusBadge = STATUS_BADGE[inc.status] ?? STATUS_BADGE.active;
          const hasCoords   =
            Array.isArray(inc.coordinates) &&
            inc.coordinates.length === 2 &&
            !isNaN(inc.coordinates[0]) &&
            !isNaN(inc.coordinates[1]);

          return (
            <div key={inc.incident_id} className="hover:bg-gray-50 transition-colors">
              <div className="px-3 py-3 flex items-start gap-3">
                {/* Severity-coloured shield icon */}
                <div className="shrink-0 mt-0.5">
                  <ShieldAlert
                    size={18}
                    className={
                      inc.status === "contained"    ? "text-green-600"  :
                      inc.severity === "critical"   ? "text-red-800"    :
                      inc.severity === "high"       ? "text-red-500"    :
                      inc.severity === "medium"     ? "text-orange-500" :
                                                      "text-gray-400"
                    }
                  />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Row 1: title + severity badge */}
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{inc.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${sevBadge}`}>
                      {inc.severity.toUpperCase()}
                    </span>
                  </div>

                  {/* Row 2: status pill + category */}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${statusBadge}`}>
                      {inc.status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono capitalize">
                      {inc.category.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Row 3: short id + actions */}
                  <div className="flex items-center gap-1.5 mt-1 min-w-0">
                    <p className="text-xs text-gray-400 font-mono truncate flex-1 min-w-0">
                      {inc.incident_id.slice(0, 12)}…
                    </p>

                    {hasCoords && (
                      <button
                        type="button"
                        onClick={() => onFlyTo?.(inc.coordinates[0], inc.coordinates[1])}
                        title="Fly to location"
                        className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 transition-colors"
                      >
                        <MapPin size={11} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : inc.incident_id)}
                      title={isExpanded ? "Collapse" : "More info"}
                      className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {/* Row 4: timestamp */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(inc.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 bg-gray-50 border-t border-gray-100">
                  <div className="space-y-1.5 text-xs text-gray-600 pt-2">

                    <div className="flex items-center gap-2">
                      <Hash size={11} className="text-gray-400 shrink-0" />
                      <span className="font-mono text-gray-500 break-all">{inc.incident_id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User size={11} className="text-gray-400 shrink-0" />
                      <span>{inc.created_by.name ?? inc.created_by.user_id}</span>
                    </div>

                    {hasCoords && (
                      <div className="flex items-center gap-2">
                        <MapPin size={11} className="text-gray-400 shrink-0" />
                        <span className="font-mono">
                          [{inc.coordinates[0].toFixed(4)}, {inc.coordinates[1].toFixed(4)}]
                        </span>
                      </div>
                    )}

                    {inc.description && (
                      <p className="text-gray-500 italic border-l-2 border-gray-200 pl-2">
                        {inc.description}
                      </p>
                    )}

                    {inc.source_fire_report_id && (
                      <p className="text-gray-400 font-mono text-[10px]">
                        Source report: {inc.source_fire_report_id}
                      </p>
                    )}

                    {inc.logs?.length > 0 && (
                      <div className="border-t border-gray-100 pt-1.5 space-y-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          Activity
                        </p>
                        {inc.logs.slice(-3).map((log, i) => (
                          <p key={i} className="text-[11px] text-gray-400">
                            {new Date(log.timestamp).toLocaleString()} — {log.message}
                          </p>
                        ))}
                      </div>
                    )}

                    {inc.comments?.length > 0 && (
                      <div className="border-t border-gray-100 pt-1.5 space-y-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          Comments
                        </p>
                        {inc.comments.slice(-2).map((c, i) => (
                          <p key={i} className="text-[11px] text-gray-400">
                            <span className="font-semibold text-gray-500">
                              {c.created_by.user_id}:
                            </span>{" "}
                            {c.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll hint */}
      {filtered.length > 5 && (
        <div className="shrink-0 px-4 py-1.5 border-t border-gray-100 bg-gray-50/80 text-center">
          <span className="text-[10px] text-gray-400">
            {filtered.length} incidents · scroll to view all
          </span>
        </div>
      )}

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-[4px] h-full bg-transparent hover:bg-red-400/40 active:bg-red-400/60 transition-colors cursor-col-resize z-10"
        onMouseDown={(e) => {
          resizing.current   = true;
          startX.current     = e.clientX;
          startWidth.current = width;
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
};

export default IncidentsPanel;