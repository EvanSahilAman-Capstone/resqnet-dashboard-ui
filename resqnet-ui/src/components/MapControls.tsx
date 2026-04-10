import React, { useState, useRef, useEffect } from "react";
import {
  Flame, Radio, Compass, List, Plus, ChevronRight,
  Settings, ShieldCheck, FileText, MapPin,
} from "lucide-react";
import DraggableWindow from "./DraggableWindow";
import LegendPanel from "./LegendPanel";
import BroadcastAlertsPanel from "./BroadcastAlertsPanel";
import BroadcastDetailPanel from "./BroadcastDetailPanel";
import BroadcastForm from "./BroadcastForm";
import SafeZoneForm from "./SafeZoneForm";
import LayersPanel from "./map/LayersPanel";
import NotificationBell from "./notifications/NotificationBell";
import type { BroadcastAlert, SafeZone } from "../components/map";
import type { FireReport } from "../hooks/useLocalData";
import type { BroadcastMessage } from "./BroadcastForm";
import type { SafeZoneFormData } from "./SafeZoneForm";
import { usePanels } from "../context/PanelContext";

interface MapControlsProps {
  fires:                    FireReport[];
  isPlacingAlert:           boolean;
  broadcastAlerts:          BroadcastAlert[];
  safeZones:                SafeZone[];
  sensorCount:              number;
  onBroadcastSubmit:        (data: BroadcastMessage) => void;
  onBroadcastChange:        (data: BroadcastMessage) => void;
  onBroadcastCancel:        () => void;
  broadcastLoading:         boolean;
  onCycleBroadcasts:        () => void;
  onCycleFires:             () => void;
  onCycleSensors:           () => void;
  onGoToLocation:           () => void;
  onFlyTo:                  (lat: number, lng: number) => void;
  liveRadiusKm?:            number;
  onRadiusChange?:          (r: number) => void;
  alertCoordinates?:        [number, number];
  onBroadcastSaved?:        (updated: BroadcastAlert) => void;
  onBroadcastDeleted?:      (id: string) => void;
  onBroadcastDetail?:       (alert: BroadcastAlert) => void;
  selectedBroadcast?:       BroadcastAlert | null;
  onDetailClose?:           () => void;
  // Safe zone props
  isPlacingSafeZone:        boolean;
  safeZoneLoading:          boolean;
  safeZoneRadiusM:          number;
  safeZoneCoords?:          [number, number];
  onSafeZoneActivate:       (data: SafeZoneFormData) => void;
  onSafeZoneCancelPlace:    () => void;
  onSafeZoneRadiusChange:   (r: number) => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  fires, isPlacingAlert, broadcastAlerts, safeZones, sensorCount,
  onBroadcastSubmit, onBroadcastChange, onBroadcastCancel,
  broadcastLoading, onCycleBroadcasts, onCycleFires,
  onCycleSensors, onGoToLocation, onFlyTo,
  liveRadiusKm, onRadiusChange, alertCoordinates,
  onBroadcastSaved, onBroadcastDeleted,
  selectedBroadcast, onDetailClose,
  isPlacingSafeZone, safeZoneLoading, safeZoneRadiusM,
  safeZoneCoords, onSafeZoneActivate, onSafeZoneCancelPlace,
  onSafeZoneRadiusChange,
}) => {
  const {
    openPanels, togglePanel, closePanel,
    broadcastSub, setBroadcastSub,
    setIncidentsOpen, incidentsOpen,
    layerToggles, setLayerToggle,
    customOverlayFile, setCustomOverlayFile,
  } = usePanels();

  const [internalSelected, setInternalSelected] = useState<BroadcastAlert | null>(null);
  const detailAlert       = selectedBroadcast ?? internalSelected;
  const handleDetailClose = () => { setInternalSelected(null); onDetailClose?.(); };

  const latestFormData = useRef<BroadcastMessage | null>(null);

  // ── Per-button submenus ───────────────────────────────────────────────────
  const [showBroadcastMenu, setShowBroadcastMenu] = useState(false);
  const [showSafeZoneMenu,  setShowSafeZoneMenu]  = useState(false);
  const [safeZoneSub,       setSafeZoneSub]       = useState<'list' | 'create'>('list');

  const broadcastMenuRef = useRef<HTMLDivElement>(null);
  const safeZoneMenuRef  = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (broadcastMenuRef.current && !broadcastMenuRef.current.contains(e.target as Node))
        setShowBroadcastMenu(false);
      if (safeZoneMenuRef.current && !safeZoneMenuRef.current.contains(e.target as Node))
        setShowSafeZoneMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openBroadcastSub = (sub: "list" | "create") => {
    setBroadcastSub(sub);
    if (!openPanels.has("broadcast")) togglePanel("broadcast");
    setShowBroadcastMenu(false);
  };

  const openSafeZoneSub = (sub: "list" | "create") => {
    setSafeZoneSub(sub);
    if (!openPanels.has("safezones")) togglePanel("safezones");
    setShowSafeZoneMenu(false);
  };

  // ── Shared button style ───────────────────────────────────────────────────
  const iconBtn = (active: boolean, activeClass: string, hoverClass: string) =>
    `flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
      active ? activeClass : `text-gray-500 ${hoverClass}`
    }`;

  return (
    <>
      {/* ── Top-right icon bar ─────────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 px-2 py-1.5">

        <NotificationBell onFlyTo={onFlyTo} />

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Incidents */}
        <button
          type="button"
          onClick={() => setIncidentsOpen(!incidentsOpen)}
          title="Incidents"
          className={iconBtn(incidentsOpen, "bg-red-100 text-red-700", "hover:bg-red-50 hover:text-red-600")}
        >
          <Flame size={17} />
        </button>

        {/* Reports */}
        <button
          type="button"
          onClick={() => togglePanel("reports")}
          title="Fire Reports"
          className={iconBtn(openPanels.has("reports"), "bg-amber-100 text-amber-700", "hover:bg-amber-50 hover:text-amber-600")}
        >
          <FileText size={17} />
        </button>

        {/* Broadcast with submenu */}
        <div className="relative" ref={broadcastMenuRef}>
          <button
            type="button"
            onClick={() => setShowBroadcastMenu((p) => !p)}
            title="Broadcast"
            className={iconBtn(openPanels.has("broadcast"), "bg-orange-100 text-orange-700", "hover:bg-orange-50 hover:text-orange-600")}
          >
            <Radio size={17} />
          </button>

          {showBroadcastMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white/98 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[1000]">
              <button type="button" onClick={() => openBroadcastSub("list")}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                <List size={14} />
                <span>View Alerts</span>
                <ChevronRight size={12} className="ml-auto text-gray-400" />
              </button>
              <div className="border-t border-gray-100" />
              <button type="button" onClick={() => openBroadcastSub("create")}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
                <Plus size={14} />
                <span>Create Broadcast</span>
                <ChevronRight size={12} className="ml-auto text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {/* Safe Zones with submenu */}
        <div className="relative" ref={safeZoneMenuRef}>
          <button
            type="button"
            onClick={() => setShowSafeZoneMenu((p) => !p)}
            title="Safe Zones"
            className={iconBtn(openPanels.has("safezones"), "bg-green-100 text-green-700", "hover:bg-green-50 hover:text-green-600")}
          >
            <ShieldCheck size={17} />
          </button>

          {showSafeZoneMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white/98 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[1000]">
              <button type="button" onClick={() => openSafeZoneSub("list")}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">
                <List size={14} />
                <span>View Safe Zones</span>
                <ChevronRight size={12} className="ml-auto text-gray-400" />
              </button>
              <div className="border-t border-gray-100" />
              <button type="button" onClick={() => openSafeZoneSub("create")}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors">
                <Plus size={14} />
                <span>Create Safe Zone</span>
                <ChevronRight size={12} className="ml-auto text-gray-400" />
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <button
          type="button"
          onClick={() => togglePanel("legend")}
          title="Legend"
          className={iconBtn(openPanels.has("legend"), "bg-blue-100 text-blue-700", "hover:bg-blue-50 hover:text-blue-600")}
        >
          <Compass size={17} />
        </button>

        {/* Layers */}
        <button
          type="button"
          onClick={() => togglePanel("layers")}
          title="Map Layers"
          className={iconBtn(openPanels.has("layers"), "bg-gray-100 text-gray-800", "hover:bg-gray-100 hover:text-gray-800")}
        >
          <Settings size={17} />
        </button>
      </div>

      {/* ── Broadcast Alerts List ──────────────────────────────────────────── */}
      {openPanels.has("broadcast") && broadcastSub === "list" && (
        <DraggableWindow id="broadcast_list" title="Broadcast Alerts"
          onClose={() => closePanel("broadcast")}
          defaultPosition={{ x: 500, y: 70 }} defaultSize={{ w: 320, h: 480 }}>
          <BroadcastAlertsPanel
            alerts={broadcastAlerts}
            onFlyTo={onFlyTo}
            onMoreInfo={(alert) => setInternalSelected(alert)}
          />
        </DraggableWindow>
      )}

      {/* ── Create Broadcast ───────────────────────────────────────────────── */}
      {openPanels.has("broadcast") && broadcastSub === "create" && (
        <DraggableWindow id="broadcast_create" title="Create Broadcast"
          onClose={() => { onBroadcastCancel(); closePanel("broadcast"); }}
          defaultPosition={{ x: 500, y: 70 }} defaultSize={{ w: 300, h: "auto" as any }}>
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

      {/* ── Safe Zones List ────────────────────────────────────────────────── */}
      {openPanels.has("safezones") && safeZoneSub === "list" && (
        <DraggableWindow id="safezones_list" title="Safe Zones"
          onClose={() => closePanel("safezones")}
          defaultPosition={{ x: 500, y: 70 }} defaultSize={{ w: 320, h: 480 }}>
          <div className="flex flex-col h-full overflow-y-auto divide-y divide-gray-100">
            {safeZones.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                <ShieldCheck size={28} className="text-gray-300" />
                <p className="text-sm">No safe zones yet</p>
              </div>
            )}
            {safeZones.map((z) => {
              const coords   = z.coordinates as [number, number] | undefined;
              const hasCoords = Array.isArray(coords) && coords.length === 2;
              const statusClass =
                z.status === 'active'      ? 'bg-green-100 text-green-800 border border-green-300' :
                z.status === 'at_capacity' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                             'bg-gray-100 text-gray-500 border border-gray-200';
              const statusLabel =
                z.status === 'active'      ? 'ACTIVE' :
                z.status === 'at_capacity' ? 'AT CAP' : 'CLOSED';
              return (
                <div key={z.safe_zone_id} className="px-3 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-2">
                    <ShieldCheck size={16} className="text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{z.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-gray-400 font-mono capitalize">
                          {z.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-gray-400">· {z.radius_m}m</span>
                        {z.capacity && (
                          <span className="text-[10px] text-gray-400">· cap {z.capacity}</span>
                        )}
                      </div>
                      {z.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{z.description}</p>
                      )}
                      {hasCoords && (
                        <button
                          type="button"
                          onClick={() => onFlyTo(coords[1], coords[0])}
                          className="mt-1 flex items-center gap-1 text-[11px] text-gray-400 hover:text-green-600 transition-colors"
                        >
                          <MapPin size={10} />
                          <span className="font-mono">{coords[1].toFixed(4)}, {coords[0].toFixed(4)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DraggableWindow>
      )}

      {/* ── Create Safe Zone ───────────────────────────────────────────────── */}
      {openPanels.has("safezones") && safeZoneSub === "create" && (
        <DraggableWindow id="safezones_create" title="Create Safe Zone"
          onClose={() => { onSafeZoneCancelPlace(); closePanel("safezones"); }}
          defaultPosition={{ x: 500, y: 70 }} defaultSize={{ w: 300, h: "auto" as any }}>
          <div className="p-4">
            <SafeZoneForm
              onActivate={(data) => { onSafeZoneActivate(data); }}
              onCancel={() => { onSafeZoneCancelPlace(); closePanel("safezones"); }}
              isPlacingSafeZone={isPlacingSafeZone}
              coordinates={safeZoneCoords}
              liveRadiusM={safeZoneRadiusM}
              onRadiusChange={onSafeZoneRadiusChange}
              loading={safeZoneLoading}
            />
          </div>
        </DraggableWindow>
      )}

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      {openPanels.has("legend") && (
        <DraggableWindow id="legend" title="Legend"
          onClose={() => closePanel("legend")}
          defaultPosition={{ x: 900, y: 70 }} defaultSize={{ w: 260, h: 420 }}>
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

      {/* ── Layers / Settings ─────────────────────────────────────────────── */}
      {openPanels.has("layers") && (
        <DraggableWindow id="layers" title="Map Layers"
          onClose={() => closePanel("layers")}
          defaultPosition={{ x: 1100, y: 70 }} defaultSize={{ w: 260, h: "auto" as any }}>
          <LayersPanel
            toggles={layerToggles}
            onChange={setLayerToggle}
            onCustomOverlayImport={(file) => setCustomOverlayFile(file)}
            onClearOverlay={() => setCustomOverlayFile(null)}
            hasCustomOverlay={!!customOverlayFile}
          />
        </DraggableWindow>
      )}

      {/* ── Broadcast Detail Panel ────────────────────────────────────────── */}
      {detailAlert && (
        <BroadcastDetailPanel
          alert={detailAlert}
          onClose={handleDetailClose}
          onFlyTo={onFlyTo}
          onSaved={(updated) => { onBroadcastSaved?.(updated); handleDetailClose(); }}
          onDeleted={(id) => { onBroadcastDeleted?.(id); handleDetailClose(); }}
        />
      )}
    </>
  );
};

export default MapControls;