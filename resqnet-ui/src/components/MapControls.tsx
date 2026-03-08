import React, { useState, useRef, useEffect } from "react";
import { Flame, Radio, Compass, List, Plus, ChevronRight } from "lucide-react";
import DraggableWindow from "./DraggableWindow";
import LegendPanel from "./LegendPanel";
import BroadcastAlertsPanel from "./BroadcastAlertsPanel";
import BroadcastDetailPanel from "./BroadcastDetailPanel";
import BroadcastForm from "./BroadcastForm";
import NotificationBell from "./notifications/NotificationBell";
import type { BroadcastAlert } from "../components/map";
import type { FireReport } from "../hooks/useLocalData";
import type { BroadcastMessage } from "./BroadcastForm";
import { usePanels } from "../context/PanelContext";

interface MapControlsProps {
  fires:               FireReport[];
  isPlacingAlert:      boolean;
  broadcastAlerts:     BroadcastAlert[];
  sensorCount:         number;
  onBroadcastSubmit:   (data: BroadcastMessage) => void;
  onBroadcastChange:   (data: BroadcastMessage) => void;
  onBroadcastCancel:   () => void;
  broadcastLoading:    boolean;
  onCycleBroadcasts:   () => void;
  onCycleFires:        () => void;
  onCycleSensors:      () => void;
  onGoToLocation:      () => void;
  onFlyTo:             (lat: number, lng: number) => void;
  liveRadiusKm?:       number;
  onRadiusChange?:     (r: number) => void;
  alertCoordinates?:   [number, number];
  onBroadcastSaved?:   (updated: BroadcastAlert) => void;   // ← NEW
  onBroadcastDeleted?: (id: string) => void;                // ← NEW
  onBroadcastDetail?:  (alert: BroadcastAlert) => void;     // ← exposed for Map to call
  selectedBroadcast?:  BroadcastAlert | null;               // ← controlled from outside (Map click)
  onDetailClose?:      () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  fires, isPlacingAlert, broadcastAlerts, sensorCount,
  onBroadcastSubmit, onBroadcastChange, onBroadcastCancel,
  broadcastLoading, onCycleBroadcasts, onCycleFires,
  onCycleSensors, onGoToLocation, onFlyTo,
  liveRadiusKm, onRadiusChange, alertCoordinates,
  onBroadcastSaved, onBroadcastDeleted,
  selectedBroadcast, onDetailClose,
}) => {
  const {
    openPanels, togglePanel, closePanel,
    broadcastSub, setBroadcastSub,
    setIncidentsOpen, incidentsOpen,
  } = usePanels();

  // internal detail state — used when opened from the alerts list
  const [internalSelected, setInternalSelected] = useState<BroadcastAlert | null>(null);

  // prefer external (map marker click) over internal (list click)
  const detailAlert = selectedBroadcast ?? internalSelected;

  const handleDetailClose = () => {
    setInternalSelected(null);
    onDetailClose?.();
  };

  const latestFormData    = useRef<BroadcastMessage | null>(null);
  const [showBroadcastMenu, setShowBroadcastMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowBroadcastMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openBroadcastSub = (sub: "list" | "create") => {
    setBroadcastSub(sub);
    if (!openPanels.has("broadcast")) togglePanel("broadcast");
    setShowBroadcastMenu(false);
  };

  return (
    <>
      {/* ── Top-right icon bar ─────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 px-2 py-1.5">

        <div className="flex items-center px-1">
          <NotificationBell onFlyTo={onFlyTo} />
        </div>

        <div className="w-px h-6 bg-gray-200 mx-0.5" />

        {/* Incidents */}
        <button
          type="button"
          onClick={() => setIncidentsOpen(!incidentsOpen)}
          title="Incidents"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-xs font-medium
            ${incidentsOpen ? "bg-red-100 text-red-700" : "text-gray-600 hover:bg-red-50 hover:text-red-600"}`}
        >
          <Flame size={18} />
          <span className="text-[10px]">Incidents</span>
        </button>

        {/* Broadcast with submenu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowBroadcastMenu((p) => !p)}
            title="Broadcast"
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-xs font-medium
              ${openPanels.has("broadcast") ? "bg-orange-100 text-orange-700" : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"}`}
          >
            <Radio size={18} />
            <span className="text-[10px]">Broadcast</span>
          </button>

          {showBroadcastMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white/98 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[1000]">
              <button
                type="button"
                onClick={() => openBroadcastSub("list")}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
              >
                <List size={15} />
                <span>Broadcast Alerts</span>
                <ChevronRight size={13} className="ml-auto text-gray-400" />
              </button>
              <div className="border-t border-gray-100" />
              <button
                type="button"
                onClick={() => openBroadcastSub("create")}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
              >
                <Plus size={15} />
                <span>Create Broadcast</span>
                <ChevronRight size={13} className="ml-auto text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <button
          type="button"
          onClick={() => togglePanel("legend")}
          title="Legend"
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-xs font-medium
            ${openPanels.has("legend") ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"}`}
        >
          <Compass size={18} />
          <span className="text-[10px]">Legend</span>
        </button>
      </div>

      {/* ── Broadcast Alerts List ──────────────────────────────── */}
      {openPanels.has("broadcast") && broadcastSub === "list" && (
        <DraggableWindow
          id="broadcast_list"
          title="Broadcast Alerts"
          onClose={() => closePanel("broadcast")}
          defaultPosition={{ x: 500, y: 70 }}
          defaultSize={{ w: 320, h: 480 }}
        >
          <BroadcastAlertsPanel
            alerts={broadcastAlerts}
            onFlyTo={onFlyTo}
            onMoreInfo={(alert) => setInternalSelected(alert)}  // ← opens panel
          />
        </DraggableWindow>
      )}

      {/* ── Create Broadcast window ────────────────────────────── */}
      {openPanels.has("broadcast") && broadcastSub === "create" && (
        <DraggableWindow
          id="broadcast_create"
          title="Create Broadcast"
          onClose={() => { onBroadcastCancel(); closePanel("broadcast"); }}
          defaultPosition={{ x: 500, y: 70 }}
          defaultSize={{ w: 300, h: "auto" as any }}
        >
          <div className="p-4">
            <BroadcastForm
              onSubmit={onBroadcastSubmit}
              onChange={(data) => { latestFormData.current = data; onBroadcastChange(data); }}
              onCancel={() => { onBroadcastCancel(); closePanel("broadcast"); }}
              onActivate={() => { if (latestFormData.current) onBroadcastSubmit(latestFormData.current); }}
              loading={broadcastLoading}
              liveRadiusKm={liveRadiusKm}
              onRadiusChange={onRadiusChange}
              isPlacingAlert={isPlacingAlert}
              coordinates={alertCoordinates}
            />
          </div>
        </DraggableWindow>
      )}

      {/* ── Legend window ──────────────────────────────────────── */}
      {openPanels.has("legend") && (
        <DraggableWindow
          id="legend"
          title="Legend"
          onClose={() => closePanel("legend")}
          defaultPosition={{ x: 900, y: 70 }}
          defaultSize={{ w: 260, h: 420 }}
        >
          <LegendPanel
            broadcastCount={broadcastAlerts.length}
            fireCount={fires.length}
            sensorCount={sensorCount}
            onCycleBroadcasts={onCycleBroadcasts}
            onCycleFires={onCycleFires}
            onCycleSensors={onCycleSensors}
            onGoToLocation={onGoToLocation}
          />
        </DraggableWindow>
      )}

      {/* ── Broadcast Detail Panel (slides in from right) ──────── */}
      {detailAlert && (
        <BroadcastDetailPanel
          alert={detailAlert}
          onClose={handleDetailClose}
          onFlyTo={onFlyTo}
          onSaved={(updated) => {
            onBroadcastSaved?.(updated);
            handleDetailClose();
          }}
          onDeleted={(id) => {
            onBroadcastDeleted?.(id);
            handleDetailClose();
          }}
        />
      )}
    </>
  );
};

export default MapControls;
