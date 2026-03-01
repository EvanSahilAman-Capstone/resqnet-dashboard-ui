import React, { useState } from "react";
import { Flame, Radio, Map } from "lucide-react";
import DraggableWindow from "./DraggableWindow";
import IncidentsPanel from "./IncidentsPanel";
import LegendPanel from "./LegendPanel";
import BroadcastForm from "./BroadcastForm";
import type { FireReport } from "../hooks/useLocalData";
import type { BroadcastMessage } from "./BroadcastForm";

interface MapControlsProps {
  fires: FireReport[];
  loading: boolean;
  isPlacingAlert: boolean;
  broadcastCount: number;
  sensorCount: number;
  onBroadcastSubmit: (data: BroadcastMessage) => void;
  onBroadcastChange: (data: BroadcastMessage) => void;
  broadcastLoading: boolean;
  onCycleBroadcasts: () => void;
  onCycleFires: () => void;
  onCycleSensors: () => void;
  onGoToLocation: () => void;
}

type Panel = "incidents" | "broadcast" | "legend";

const MapControls: React.FC<MapControlsProps> = ({
  fires,
  loading,
  isPlacingAlert,
  broadcastCount,
  sensorCount,
  onBroadcastSubmit,
  onBroadcastChange,
  broadcastLoading,
  onCycleBroadcasts,
  onCycleFires,
  onCycleSensors,
  onGoToLocation,
}) => {
  const [openPanels, setOpenPanels] = useState<Set<Panel>>(new Set());

  const toggle = (panel: Panel) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        next.add(panel);
      }
      return next;
    });
  };

  const close = (panel: Panel) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      next.delete(panel);
      return next;
    });
  };

  const buttons = [
    {
      id: "incidents" as Panel,
      icon: <Flame size={18} />,
      label: "Incidents",
      activeClass: "bg-red-100 text-red-700",
      inactiveClass: "text-gray-600 hover:bg-red-50 hover:text-red-600",
    },
    {
      id: "broadcast" as Panel,
      icon: <Radio size={18} />,
      label: "Broadcast",
      activeClass: "bg-orange-100 text-orange-700",
      inactiveClass: "text-gray-600 hover:bg-orange-50 hover:text-orange-600",
    },
    {
      id: "legend" as Panel,
      icon: <Map size={18} />,
      label: "Legend",
      activeClass: "bg-blue-100 text-blue-700",
      inactiveClass: "text-gray-600 hover:bg-blue-50 hover:text-blue-600",
    },
  ];

  return (
    <>
      {/* Top-right icon buttons */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 px-2 py-1.5">
        {buttons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => toggle(btn.id)}
            title={btn.label}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-xs font-medium
              ${openPanels.has(btn.id) ? btn.activeClass : btn.inactiveClass}`}
          >
            {btn.icon}
            <span className="text-[10px]">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Incidents Window */}
      {openPanels.has("incidents") && (
        <DraggableWindow
          title={`Incidents (${fires.length})`}
          onClose={() => close("incidents")}
          initialPosition={{ x: 80, y: 70 }}
          width="w-96"
        >
          <IncidentsPanel fires={fires} loading={loading} />
        </DraggableWindow>
      )}

      {/* Broadcast Window */}
      {openPanels.has("broadcast") && (
        <DraggableWindow
          title="Broadcast Alert"
          onClose={() => close("broadcast")}
          initialPosition={{ x: 500, y: 70 }}
          width="w-80"
        >
          <div className="p-4">
            {isPlacingAlert && (
              <div className="mb-3 p-2 bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold">
                Click on the map to place alert location
              </div>
            )}
            <BroadcastForm
              onSubmit={onBroadcastSubmit}
              onChange={onBroadcastChange}
              loading={broadcastLoading}
            />
          </div>
        </DraggableWindow>
      )}

      {/* Legend Window */}
      {openPanels.has("legend") && (
        <DraggableWindow
          title="Legend"
          onClose={() => close("legend")}
          initialPosition={{ x: 900, y: 70 }}
          width="w-64"
        >
          <LegendPanel
            broadcastCount={broadcastCount}
            fireCount={fires.length}
            sensorCount={sensorCount}
            onCycleBroadcasts={onCycleBroadcasts}
            onCycleFires={onCycleFires}
            onCycleSensors={onCycleSensors}
            onGoToLocation={onGoToLocation}
          />
        </DraggableWindow>
      )}
    </>
  );
};

export default MapControls;
