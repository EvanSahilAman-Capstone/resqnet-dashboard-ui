import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, ChevronUp, MapPin, User, Hash, X } from "lucide-react";
import type { FireReport } from "../hooks/useLocalData";
import reportGif from "../assets/report.gif";
import { usePanels } from "../context/PanelContext";

interface IncidentsPanelProps {
  fires: FireReport[];
  loading: boolean;
  onFlyTo?: (lat: number, lng: number) => void;
}

const severityConfig = {
  low:    { badge: "bg-yellow-100 text-yellow-800 border border-yellow-300", label: "LOW"  },
  medium: { badge: "bg-orange-100 text-orange-800 border border-orange-300", label: "MED"  },
  high:   { badge: "bg-red-100 text-red-800 border border-red-300",          label: "HIGH" },
};

const MIN_WIDTH = 260;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 300;
const LEFT_OFFSET = 64;

const IncidentsPanel: React.FC<IncidentsPanelProps> = ({ fires, loading, onFlyTo }) => {
  const { incidentsOpen, setIncidentsOpen } = usePanels();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const resizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const filtered = fires.filter((f) =>
    f.hazard_type.toLowerCase().includes(search.toLowerCase()) ||
    f.uploading_user.toLowerCase().includes(search.toLowerCase()) ||
    f.report_id.toLowerCase().includes(search.toLowerCase()) ||
    f.severity.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const delta = e.clientX - startX.current;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta)));
    };
    const onMouseUp = () => { resizing.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (!incidentsOpen) return null;

  return (
    <div
      className="fixed top-0 z-[500] h-screen bg-white/98 backdrop-blur-sm border-r border-gray-200 shadow-2xl flex flex-col"
      style={{ left: LEFT_OFFSET, width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
        <div className="flex items-center gap-2">
          <img src={reportGif} className="w-5 h-5" alt="" />
          <span className="text-sm font-semibold text-gray-800">
            Incidents
            <span className="ml-2 text-xs font-normal text-gray-400">({fires.length})</span>
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
            placeholder="Search..."
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
          <div className="px-4 py-6 text-center text-gray-400 text-sm">No incidents found.</div>
        )}
        {!loading && filtered.map((fire) => {
          const cfg = severityConfig[fire.severity];
          const isExpanded = expandedId === fire.report_id;

          return (
            <div key={fire.report_id} className="hover:bg-gray-50 transition-colors">
              <div className="px-3 py-3 flex items-start gap-3">
                <img src={reportGif} alt="incident" className="w-7 h-7 shrink-0 mt-0.5" />

                <div className="flex-1 min-w-0">
                  {/* Row 1: hazard type + severity badge */}
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {fire.hazard_type.toUpperCase()}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Row 2: id • name + action icons inline */}
                  <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    <p className="text-xs text-gray-500 truncate flex-1 min-w-0">
                      {fire.report_id} • {fire.uploading_user}
                    </p>

                    {/* Fly-to icon */}
                    <button
                      type="button"
                      onClick={() => onFlyTo?.(fire.coordinates[0], fire.coordinates[1])}
                      title="Go to location"
                      className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                        strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                    </button>

                    {/* Expand icon */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(fire.report_id)}
                      title={isExpanded ? "Collapse" : "More info"}
                      className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {/* Row 3: timestamp */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(fire.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 bg-gray-50">
                  {fire.photo_link && (
                    <div className="rounded-xl overflow-hidden h-32 bg-gray-200">
                      <img
                        src={fire.photo_link}
                        alt="incident"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://via.placeholder.com/400x200?text=No+Image";
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <Hash size={11} className="text-gray-400 shrink-0" />
                      <span className="font-mono text-gray-500">{fire.report_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={11} className="text-gray-400 shrink-0" />
                      <span>{fire.uploading_user}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={11} className="text-gray-400 shrink-0" />
                      <span className="font-mono">
                        [{fire.coordinates[0].toFixed(4)}, {fire.coordinates[1].toFixed(4)}]
                      </span>
                    </div>
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
          <span className="text-[10px] text-gray-400">{filtered.length} incidents · scroll to view all</span>
        </div>
      )}

      {/* Width resize handle */}
      <div
        className="absolute top-0 right-0 w-[4px] h-full bg-transparent hover:bg-red-400/40 active:bg-red-400/60 transition-colors cursor-col-resize z-10"
        onMouseDown={(e) => {
          resizing.current = true;
          startX.current = e.clientX;
          startWidth.current = width;
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
};

export default IncidentsPanel;
