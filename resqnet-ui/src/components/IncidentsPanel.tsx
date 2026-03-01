import React, { useState } from "react";
import { Search, ChevronDown, ChevronUp, MapPin, User, Hash } from "lucide-react";
import type { FireReport } from "../hooks/useLocalData";
import reportGif from "../assets/report.gif";

interface IncidentsPanelProps {
  fires: FireReport[];
  loading: boolean;
}

const severityConfig = {
  low: {
    badge: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    label: "LOW",
  },
  medium: {
    badge: "bg-orange-100 text-orange-800 border border-orange-300",
    label: "MEDIUM",
  },
  high: {
    badge: "bg-red-100 text-red-800 border border-red-300",
    label: "HIGH",
  },
};

const IncidentsPanel: React.FC<IncidentsPanelProps> = ({ fires, loading }) => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = fires.filter((f) =>
    f.hazard_type.toLowerCase().includes(search.toLowerCase()) ||
    f.uploading_user.toLowerCase().includes(search.toLowerCase()) ||
    f.report_id.toLowerCase().includes(search.toLowerCase()) ||
    f.severity.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="flex flex-col">
      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={14} className="text-gray-400 shrink-0" />
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
      <div className="divide-y divide-gray-100">
        {loading && (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">
            Loading incidents...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-gray-400 text-sm">
            No incidents found.
          </div>
        )}
        {!loading &&
          filtered.map((fire) => {
            const cfg = severityConfig[fire.severity];
            const isExpanded = expandedId === fire.report_id;

            return (
              <div key={fire.report_id} className="hover:bg-gray-50 transition-colors">
                <button
                  type="button"
                  onClick={() => toggleExpand(fire.report_id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3"
                >
                  <img src={reportGif} alt="incident" className="w-8 h-8 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {fire.hazard_type.toUpperCase()}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {fire.report_id} • {fire.uploading_user}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(fire.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="shrink-0 mt-1 text-gray-400">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 bg-gray-50">
                    {fire.photo_link && (
                      <div className="rounded-xl overflow-hidden h-36 bg-gray-200">
                        <img
                          src={fire.photo_link}
                          alt="incident"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://via.placeholder.com/400x200?text=No+Image";
                          }}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <Hash size={12} className="text-gray-400" />
                        <span className="font-medium">Report ID:</span>
                        <span className="font-mono text-gray-500">{fire.report_id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-gray-400" />
                        <span className="font-medium">Reported by:</span>
                        <span>{fire.uploading_user}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-gray-400" />
                        <span className="font-medium">Coordinates:</span>
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
    </div>
  );
};

export default IncidentsPanel;
