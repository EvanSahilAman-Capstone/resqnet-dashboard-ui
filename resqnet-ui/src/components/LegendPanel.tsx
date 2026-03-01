import React from "react";
import alertGif from "../assets/alert.gif";
import reportGif from "../assets/report.gif";
import sensorGif from "../assets/sensor.gif";

interface LegendPanelProps {
  broadcastCount: number;
  fireCount: number;
  sensorCount: number;
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
  broadcastCount,
  fireCount,
  sensorCount,
  onCycleBroadcasts,
  onCycleFires,
  onCycleSensors,
  onGoToLocation,
}) => {
  return (
    <div className="p-3 space-y-4 text-xs text-gray-700">

      {/* VISIBLE LAYERS */}
      <section>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
          ◈ Visible Layers
        </p>

        <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1 ml-1">Incidents</p>
        <button
          type="button"
          onClick={onCycleFires}
          className="flex items-center gap-3 w-full hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
        >
          <img src={reportGif} className="w-5 h-5" alt="fire" />
          <span className="flex-1 text-left">Fire Reports</span>
          <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
            {fireCount}
          </span>
        </button>

        <p className="text-[10px] font-semibold text-gray-500 uppercase mt-2 mb-1 ml-1">Broadcasts</p>
        <button
          type="button"
          onClick={onCycleBroadcasts}
          className="flex items-center gap-3 w-full hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
        >
          <img src={alertGif} className="w-5 h-5" alt="broadcast" />
          <span className="flex-1 text-left">Broadcast Alerts</span>
          <span className="bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
            {broadcastCount}
          </span>
        </button>

        <p className="text-[10px] font-semibold text-gray-500 uppercase mt-2 mb-1 ml-1">Sensors</p>
        <button
          type="button"
          onClick={onCycleSensors}
          className="flex items-center gap-3 w-full hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
        >
          <img src={sensorGif} className="w-5 h-5" alt="sensor" />
          <span className="flex-1 text-left">IoT Sensors</span>
          <span className="bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
            {sensorCount}
          </span>
        </button>
      </section>

      <hr className="border-gray-200" />

      {/* BROADCAST PRIORITY */}
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

      {/* EVACUATION ROUTE SAFETY */}
      <section>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
          ◈ Evacuation Route Safety
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

      {/* MY LOCATION */}
      <section>
        <button
          type="button"
          onClick={onGoToLocation}
          className="flex items-center gap-3 w-full hover:bg-blue-50 rounded-lg px-2 py-1.5 transition-colors text-blue-600"
        >
          <span className="text-lg">⦿</span>
          <span className="font-medium">Go to My Location</span>
        </button>
      </section>

    </div>
  );
};

export default LegendPanel;
