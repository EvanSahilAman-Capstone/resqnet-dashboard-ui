import React from "react";
import { Flame, Radio, Cpu, Navigation, ShieldAlert } from "lucide-react";

interface LegendPanelProps {
  onCycleIncidents: () => void;
  onCycleBroadcasts: () => void;
  onCycleFires: () => void;
  onCycleSensors: () => void;
  onGoToLocation: () => void;
}

const priorityColors = [
  { label: "LOW", color: "#9CA3AF" },
  { label: "MEDIUM", color: "#FCD34D" },
  { label: "HIGH", color: "#FB923C" },
  { label: "URGENT", color: "#DC2626" },
];

const routeColors = [
  { label: "Safe (80–100)", color: "#10b981" },
  { label: "Moderate (60–79)", color: "#facc15" },
  { label: "Risky (40–59)", color: "#fb923c" },
  { label: "Danger (<40)", color: "#ef4444" },
];

const LegendPanel: React.FC<LegendPanelProps> = ({
  onCycleIncidents,
  onCycleBroadcasts,
  onCycleFires,
  onCycleSensors,
  onGoToLocation,
}) => {
  return (
    <div className="p-3 space-y-4 text-xs text-gray-700">
      <section>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
          ◈ Visible Layers
        </p>

        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1 ml-1">
          Incidents
        </p>
        <button
          type="button"
          onClick={onCycleIncidents}
          className="flex items-center gap-3 w-full hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
        >
          <ShieldAlert size={18} className="text-red-500 shrink-0" />
          <span className="flex-1 text-left">Incidents</span>
        </button>

        <p className="text-[10px] font-semibold text-gray-400 uppercase mt-2 mb-1 ml-1">
          Fire Reports
        </p>
        <button
          type="button"
          onClick={onCycleFires}
          className="flex items-center gap-3 w-full hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
        >
          <Flame size={18} className="text-orange-500 shrink-0" />
          <span className="flex-1 text-left">Fire Reports</span>
        </button>

        <p className="text-[10px] font-semibold text-gray-400 uppercase mt-2 mb-1 ml-1">
          Broadcasts
        </p>
        <button
          type="button"
          onClick={onCycleBroadcasts}
          className="flex items-center gap-3 w-full hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
        >
          <Radio size={18} className="text-orange-500 shrink-0" />
          <span className="flex-1 text-left">Broadcast Alerts</span>
        </button>

        <p className="text-[10px] font-semibold text-gray-400 uppercase mt-2 mb-1 ml-1">
          Sensors
        </p>
        <button
          type="button"
          onClick={onCycleSensors}
          className="flex items-center gap-3 w-full hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
        >
          <Cpu size={18} className="text-emerald-500 shrink-0" />
          <span className="flex-1 text-left">IoT Sensors</span>
        </button>
      </section>

      <hr className="border-gray-200" />

      <section>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
          ◈ Broadcast Priority
        </p>
        <div className="space-y-1.5 ml-1">
          {priorityColors.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
                style={{ backgroundColor: color }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-gray-200" />

      <section>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
          ◈ Route Safety
        </p>
        <div className="space-y-1.5 ml-1">
          {routeColors.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-6 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-gray-200" />

      <section>
        <button
          type="button"
          onClick={onGoToLocation}
          className="flex items-center gap-3 w-full hover:bg-blue-50 rounded-lg px-2 py-1.5 transition-colors text-blue-600"
        >
          <Navigation size={14} />
          <span className="font-medium">My Location</span>
        </button>
      </section>
    </div>
  );
};

export default LegendPanel;