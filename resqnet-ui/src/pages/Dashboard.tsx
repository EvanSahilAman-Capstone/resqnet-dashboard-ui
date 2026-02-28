import React, { useState, useEffect } from "react";
import Map from "../components/Map";
import type { BroadcastAlert, Sensor } from "../components/Map";
import FireReportCard from "../components/FireReportCard";
import { useLocalData } from "../hooks/useLocalData.ts";
import type { BroadcastMessage } from "../components/BroadcastForm.tsx";
import BroadcastForm from "../components/BroadcastForm.tsx";
import { useApi } from "../utils/api";

const Dashboard: React.FC = () => {
  const { fires, evacRoute, setEvacRoute, loading } = useLocalData() as any;
  const { fetchWithAuth } = useApi();

  const [broadcastAlerts, setBroadcastAlerts] = useState<BroadcastAlert[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isPlacingAlert, setIsPlacingAlert] = useState(false);
  const [pendingBroadcast, setPendingBroadcast] = useState<BroadcastMessage | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const [hasRoute, setHasRoute] = useState(false);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const [destinationPin, setDestinationPin] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeSafetyScore, setRouteSafetyScore] = useState<number | undefined>(undefined);

  const mapBackendToSensor = (backend: any): Sensor => {
    const ageSec = Date.now() / 1000 - backend.last_seen;
    let status: Sensor["status"] = "OFFLINE";
    if (ageSec < 60) status = "ONLINE";
    else if (ageSec < 300) status = "WARNING";

    return {
      id: backend.id,
      name: backend.id,
      status,
      latitude: Number(backend.lat),
      longitude: Number(backend.lng),
      health: 100,
      temperature: Number(backend.temperature),
      humidity: backend.humidity,
      battery: 100,
      lastPing: new Date(backend.last_seen * 1000).toISOString(),
    };
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn("Could not get user location:", err.message)
    );
  }, []);

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
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchWithAuth]);

  useEffect(() => {
    let isMounted = true;
    const fetchBroadcasts = async () => {
      try {
        const data = await fetchWithAuth("/broadcasts");
        const list = Array.isArray(data?.broadcasts) ? data.broadcasts : [];
        if (!isMounted) return;
        const alerts: BroadcastAlert[] = list.map((b: any, idx: number) => ({
          id: b._id || b.id || `broadcast-${idx}`,
          position: b.coordinates || [44.5, -79.5],
          radius: b.radius || 1,
          priority: (b.priority || "low").toUpperCase(),
          message: b.message,
        }));
        setBroadcastAlerts(alerts);
      } catch (err) {
        console.error("Failed to fetch broadcasts:", err);
      }
    };
    fetchBroadcasts();
    const interval = setInterval(fetchBroadcasts, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchWithAuth]);

  const handleBroadcastDraftChange = (draft: BroadcastMessage) =>
    setPendingBroadcast(draft);

  const handleBroadcast = (data: BroadcastMessage) => {
    setPendingBroadcast(data);
    setIsPlacingAlert(true);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!pendingBroadcast) return;
    setIsPlacingAlert(false);
    setBroadcastLoading(true);
    try {
      const broadcastData = {
        ...pendingBroadcast,
        coordinates: [lat, lng],
        priority: pendingBroadcast.priority.toLowerCase(),
      };
      const result = await fetchWithAuth("/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(broadcastData),
      });
      setBroadcastAlerts((prev) => [
        ...prev,
        {
          id: result.broadcast_id,
          position: [lat, lng],
          radius: pendingBroadcast.radius,
          priority: pendingBroadcast.priority,
          message: pendingBroadcast.message,
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

  const wildfireEvents = fires.map((fire: any) => ({
    id: fire.report_id,
    latitude: fire.coordinates[0],
    longitude: fire.coordinates[1],
    riskLevel: fire.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
    message: `${fire.hazard_type} reported by ${fire.uploading_user}`,
  }));

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: userLocation,
          destination: destinationPin,
        }),
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

  return (
    <div className="h-screen w-full">
      <div className="relative h-full w-full">

        {/* Full-area Map */}
        <Map
          fires={wildfireEvents}
          evacuationRoute={evacRoute}
          evacuationSafetyScore={routeSafetyScore}
          broadcastAlerts={broadcastAlerts}
          sensors={sensors}
          onMapClick={handleMapClick}
          isPlacingAlert={isPlacingAlert}
          draftRadiusKm={pendingBroadcast?.radius ?? 1}
          draftPriority={pendingBroadcast?.priority ?? "LOW"}
          onStartDestinationSelection={handleStartDestinationSelection}
          onSelectDestinationOnMap={handleSelectDestinationOnMap}
          onRequestRouteFromPinned={handleRequestRouteFromPinned}
          onCancelRoute={handleCancelRoute}
          hasActiveRoute={hasRoute}
          isSelectingDestination={isSelectingDestination}
          destinationPin={destinationPin}
        />

        {/* Live Status overlay — top-left */}
        <div className="pointer-events-none absolute top-4 left-4 z-50 w-72">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-4 border border-gray-200 max-h-80 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              🔥 Live Status
            </h3>
            {loading && (
              <p className="text-gray-500 text-xs">Loading fire reports...</p>
            )}
            {!loading && fires.length === 0 && (
              <p className="text-gray-500 text-xs">No active fire reports.</p>
            )}
            {!loading && fires.length > 0 && (
              <div className="space-y-3">
                {fires.map((fire: any) => (
                  <FireReportCard
                    key={fire.report_id}
                    report_id={fire.report_id}
                    photo_link={fire.photo_link}
                    hazard_type={fire.hazard_type}
                    uploading_user={fire.uploading_user}
                    coordinates={fire.coordinates}
                    severity={fire.severity}
                    timestamp={fire.timestamp}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BroadcastForm overlay — bottom-left */}
        <div className="pointer-events-none absolute bottom-6 left-4 z-50 w-80">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold text-red-700 mb-3 text-center">
              Broadcast Alert
            </h3>
            {isPlacingAlert && (
              <div className="mb-3 p-2 bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold">
                Click on the map to place alert location
              </div>
            )}
            <BroadcastForm
              onSubmit={handleBroadcast}
              onChange={handleBroadcastDraftChange}
              loading={broadcastLoading}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
