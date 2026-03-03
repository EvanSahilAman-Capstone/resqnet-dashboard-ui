import React, { useState, useEffect, useRef } from "react";
import Map from "../components/map";
import type { BroadcastAlert, Sensor } from "../components/map";
import MapControls from "../components/MapControls";
import { useLocalData } from "../hooks/useLocalData.ts";
import type { BroadcastMessage } from "../components/BroadcastForm.tsx";
import { useApi } from "../utils/api";
import IncidentsPanel from "../components/IncidentsPanel";
import { usePanels } from "../context/PanelContext";

const Dashboard: React.FC = () => {
  const { fires, evacRoute, setEvacRoute, loading } = useLocalData() as any;
  const { fetchWithAuth } = useApi();
  const { incidentsOpen, openPanels, broadcastSub  } = usePanels();

  const [broadcastAlerts, setBroadcastAlerts]   = useState<BroadcastAlert[]>([]);
  const [sensors, setSensors]                   = useState<Sensor[]>([]);
  const [isPlacingAlert, setIsPlacingAlert]     = useState(false);
  const [pendingBroadcast, setPendingBroadcast] = useState<BroadcastMessage | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [draftRadiusKm, setDraftRadiusKm]       = useState(1);

  const [hasRoute, setHasRoute]                             = useState(false);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const [destinationPin, setDestinationPin]                 = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation]                     = useState<[number, number] | null>(null);
  const [routeSafetyScore, setRouteSafetyScore]             = useState<number | undefined>(undefined);

  const cycleBroadcastsFn = useRef<() => void>(() => {});
  const cycleFiresFn      = useRef<() => void>(() => {});
  const cycleSensorsFn    = useRef<() => void>(() => {});
  const goToLocationFn    = useRef<() => void>(() => {});
  const flyToFn           = useRef<(lat: number, lng: number) => void>(() => {});

  // Derived — broadcast panel is open when "broadcast" panel + "create" sub is active

  const isBroadcastPanelOpen = openPanels.has("broadcast") && broadcastSub === "create";

  // ── Sensor mapper ──────────────────────────────────────────────
  const mapBackendToSensor = (backend: any): Sensor => {
    const ageSec = Date.now() / 1000 - backend.last_seen;
    let status: Sensor["status"] = "OFFLINE";
    if (ageSec < 60)       status = "ONLINE";
    else if (ageSec < 300) status = "WARNING";
    return {
      id:          backend.id,
      name:        backend.id,
      status,
      latitude:    Number(backend.lat),
      longitude:   Number(backend.lng),
      health:      100,
      temperature: Number(backend.temperature),
      humidity:    backend.humidity,
      battery:     100,
      lastPing:    new Date(backend.last_seen * 1000).toISOString(),
    };
  };

  // ── Geolocation ────────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn("Could not get user location:", err.message)
    );
  }, []);

  // ── Sensors polling ────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchSensors = async () => {
      try {
        const data = await fetchWithAuth("/sensors");
        const list = Array.isArray(data?.sensors) ? data.sensors : [];
        if (!isMounted) return;
        setSensors(list.map(mapBackendToSensor));
      } catch (err) {
        console.error("Failed to fetch sensors:", err);
      }
    };
    fetchSensors();
    const interval = setInterval(fetchSensors, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [fetchWithAuth]);

  // ── Broadcasts polling ─────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchBroadcasts = async () => {
      try {
        const data = await fetchWithAuth("/broadcasts");
        const list = Array.isArray(data?.broadcasts) ? data.broadcasts : [];
        if (!isMounted) return;
        const alerts: BroadcastAlert[] = list.map((b: any, idx: number) => ({
          id:        b._id || b.id || `broadcast-${idx}`,
          position:  b.coordinates || [44.5, -79.5],
          radius:    b.radius || 1,
          priority:  (b.priority || "low").toUpperCase() as BroadcastAlert["priority"],
          message:   b.message,
          timestamp: b.timestamp || null,
        }));
        setBroadcastAlerts(alerts);
      } catch (err) {
        console.error("Failed to fetch broadcasts:", err);
      }
    };
    fetchBroadcasts();
    const interval = setInterval(fetchBroadcasts, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [fetchWithAuth]);

  // ── Broadcast handlers ─────────────────────────────────────────
  const handleBroadcastDraftChange = (draft: BroadcastMessage) => {
    setPendingBroadcast(draft);
    setDraftRadiusKm(draft.radius);
  };

  const handleBroadcast = (data: BroadcastMessage) => {
    setPendingBroadcast(data);
    setDraftRadiusKm(data.radius);
    setIsPlacingAlert(true);
  };

  const handleCancelBroadcast = () => {
    setIsPlacingAlert(false);
    setPendingBroadcast(null);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!pendingBroadcast) return;
    setIsPlacingAlert(false);
    setBroadcastLoading(true);
    try {
      const broadcastData = {
        ...pendingBroadcast,
        radius:      draftRadiusKm,
        coordinates: [lat, lng],
        priority:    pendingBroadcast.priority.toLowerCase(),
      };
      const result = await fetchWithAuth("/broadcast", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(broadcastData),
      });
      setBroadcastAlerts((prev) => [
        ...prev,
        {
          id:        result.broadcast_id,
          position:  [lat, lng] as [number, number],
          radius:    draftRadiusKm,
          priority:  pendingBroadcast.priority,
          message:   pendingBroadcast.message,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("Broadcast error:", err);
      alert("Error sending broadcast");
    } finally {
      setPendingBroadcast(null);
      setBroadcastLoading(false);
    }
  };

  // ── Wildfire event mapper ──────────────────────────────────────
  const wildfireEvents = fires.map((fire: any) => ({
    id:        fire.report_id,
    latitude:  fire.coordinates[0],
    longitude: fire.coordinates[1],
    riskLevel: fire.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
    message:   `${fire.hazard_type} reported by ${fire.uploading_user}`,
  }));

  // ── Routing handlers ───────────────────────────────────────────
  const handleStartDestinationSelection = () => setIsSelectingDestination(true);

  const handleSelectDestinationOnMap = (lat: number, lng: number) => {
    setIsSelectingDestination(false);
    setDestinationPin([lat, lng]);
  };

  const handleRequestRouteFromPinned = async () => {
    if (!destinationPin) {
      alert("Please select a destination by clicking Pin, then clicking on the map.");
      return;
    }
    if (!userLocation) {
      alert("User location not available yet.");
      return;
    }
    try {
      const result = await fetchWithAuth("/api/routing/evacuation", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ origin: userLocation, destination: destinationPin }),
      });
      setEvacRoute(result.route);
      setHasRoute(true);
      setRouteSafetyScore(result.safety_score);
    } catch (err) {
      console.error("Evacuation route error", err);
      alert("Could not calculate evacuation route");
    }
  };

  const handleCancelRoute = () => {
    setEvacRoute([]);
    setDestinationPin(null);
    setHasRoute(false);
    setIsSelectingDestination(false);
    setRouteSafetyScore(undefined);
  };

  void incidentsOpen;

  return (
    <div className="h-screen w-full">
      <div className="relative h-full w-full">

        {/* Incidents panel */}
        <IncidentsPanel
          fires={fires}
          loading={loading}
          onFlyTo={(lat, lng) => flyToFn.current(lat, lng)}
        />

        {/* Full-area Map */}
        <Map
          fires={wildfireEvents}
          evacuationRoute={evacRoute}
          evacuationSafetyScore={routeSafetyScore}
          broadcastAlerts={broadcastAlerts}
          sensors={sensors}
          onMapClick={handleMapClick}
          isPlacingAlert={isPlacingAlert}
          isBroadcastPanelOpen={isBroadcastPanelOpen}
          draftRadiusKm={draftRadiusKm}
          draftPriority={pendingBroadcast?.priority ?? "LOW"}
          onStartDestinationSelection={handleStartDestinationSelection}
          onSelectDestinationOnMap={handleSelectDestinationOnMap}
          onRequestRouteFromPinned={handleRequestRouteFromPinned}
          onCancelRoute={handleCancelRoute}
          hasActiveRoute={hasRoute}
          isSelectingDestination={isSelectingDestination}
          destinationPin={destinationPin}
          onCycleBroadcastsRef={(fn) => (cycleBroadcastsFn.current = fn)}
          onCycleFiresRef={(fn) => (cycleFiresFn.current = fn)}
          onCycleSensorsRef={(fn) => (cycleSensorsFn.current = fn)}
          onGoToLocationRef={(fn) => (goToLocationFn.current = fn)}
          onFlyToRef={(fn: (lat: number, lng: number) => void) => (flyToFn.current = fn)}
          onDraftRadiusChange={(r) => {
            setDraftRadiusKm(r);
            setPendingBroadcast((prev) => prev ? { ...prev, radius: r } : prev);
          }}
        />

        {/* Map controls + floating windows */}
        <MapControls
          fires={fires}
          isPlacingAlert={isPlacingAlert}
          broadcastAlerts={broadcastAlerts}
          sensorCount={sensors.length}
          onBroadcastSubmit={handleBroadcast}
          onBroadcastChange={handleBroadcastDraftChange}
          onBroadcastCancel={handleCancelBroadcast}
          broadcastLoading={broadcastLoading}
          liveRadiusKm={draftRadiusKm}
          onRadiusChange={(r) => {
            setDraftRadiusKm(r);
            setPendingBroadcast((prev) => prev ? { ...prev, radius: r } : prev);
          }}
          onCycleBroadcasts={() => cycleBroadcastsFn.current()}
          onCycleFires={() => cycleFiresFn.current()}
          onCycleSensors={() => cycleSensorsFn.current()}
          onGoToLocation={() => goToLocationFn.current()}
          onFlyTo={(lat: number, lng: number) => flyToFn.current(lat, lng)}
        />

      </div>
    </div>
  );
};

export default Dashboard;
