import React from "react";
import type { BroadcastAlert } from "../components/map";
import alertGif from "../assets/alert.gif";
import { Clock, MapPin, Radio, ChevronDown, Info } from "lucide-react";

interface BroadcastAlertsPanelProps {
  alerts:      BroadcastAlert[];
  onFlyTo?:    (lat: number, lng: number) => void;
  onMoreInfo?: (alert: BroadcastAlert) => void;  // ← NEW
}

const priorityConfig = {
  LOW:    { badge: "bg-gray-100 text-gray-700 border border-gray-300",       label: "LOW"    },
  MEDIUM: { badge: "bg-yellow-100 text-yellow-800 border border-yellow-300", label: "MED"    },
  HIGH:   { badge: "bg-orange-100 text-orange-800 border border-orange-300", label: "HIGH"   },
  URGENT: { badge: "bg-red-100 text-red-800 border border-red-300",          label: "URGENT" },
};

const BroadcastAlertsPanel: React.FC<BroadcastAlertsPanelProps> = ({
  alerts, onFlyTo, onMoreInfo
}) => {
  return (
    <div className="divide-y divide-gray-100">
      {alerts.length === 0 && (
        <div className="px-4 py-6 text-center text-gray-400 text-sm">No broadcasts yet.</div>
      )}
      {alerts.map((alert) => {
        const cfg = priorityConfig[alert.priority] ?? priorityConfig["LOW"];
        const ts  = alert.timestamp ? new Date(alert.timestamp) : null;

        return (
          <div key={alert.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <img src={alertGif} alt="alert" className="w-7 h-7 shrink-0 mt-0.5" />

              <div className="flex-1 min-w-0">
                {/* Row 1: message + badge */}
                <div className="flex items-center justify-between gap-1">
                  <p className="font-semibold text-gray-800 text-sm truncate">{alert.message}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Row 2: coords + radius + fly-to */}
                <div className="flex items-center gap-1.5 mt-1 min-w-0">
                  <MapPin size={11} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500 font-mono truncate flex-1 min-w-0">
                    {alert.position[0].toFixed(4)}, {alert.position[1].toFixed(4)}
                  </span>
                  <Radio size={11} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500 shrink-0">{alert.radius}km</span>

                  <button
                    type="button"
                    onClick={() => onFlyTo?.(alert.position[0], alert.position[1])}
                    title="Go to location"
                    className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-500 transition-colors ml-auto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                      strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                  </button>
                </div>

                {/* Row 3: timestamp + More Info */}
                <div className="flex items-center justify-between mt-0.5">
                  {ts ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock size={11} className="shrink-0" />
                      <span>
                        {ts.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}
                        {ts.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  ) : <span />}

                  {onMoreInfo && (
                    <button
                      onClick={() => onMoreInfo(alert)}
                      className="flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-700 font-medium transition-colors"
                    >
                      <Info size={11} />
                      More Info
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {alerts.length > 4 && (
        <div className="px-4 py-2 flex items-center justify-center gap-1 text-[10px] text-gray-400 bg-gray-50">
          <ChevronDown size={11} />
          <span>{alerts.length} broadcasts · scroll to view all</span>
        </div>
      )}
    </div>
  );
};

export default BroadcastAlertsPanel;
