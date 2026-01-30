// Dashboard.tsx

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
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
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
        const mapped: Sensor[] = list.map(mapBackendToSensor);
        setSensors(mapped);
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

  const handleBroadcastDraftChange = (draft: BroadcastMessage) => {
    setPendingBroadcast(draft);
  };

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

      const newAlert: BroadcastAlert = {
        id: result.broadcast_id,
        position: [lat, lng],
        radius: pendingBroadcast.radius,
        priority: pendingBroadcast.priority,
        message: pendingBroadcast.message,
      };

      setBroadcastAlerts((prev) => [...prev, newAlert]);
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

  // Step 1: User clicks "Pin" button
  const handleStartDestinationSelection = () => {
    setIsSelectingDestination(true);
  };

  // Step 2: User clicks on map → auto-fill search bar with lat,lng
  const handleSelectDestinationOnMap = (lat: number, lng: number) => {
    setIsSelectingDestination(false);
    setDestinationPin([lat, lng]);
    // Search bar auto-fills via useEffect in Map component
  };

  // Step 3: User clicks "Route" button → generate route
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      <div className="lg:w-1/3 w-full p-6 space-y-8 overflow-y-auto">
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h3 className="text-2xl text-center font-semibold text-red-700 mb-6">
            Broadcast Alert
          </h3>
          {isPlacingAlert && (
            <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
              Click on the map to place alert location
            </div>
          )}
          <BroadcastForm
            onSubmit={handleBroadcast}
            onChange={handleBroadcastDraftChange}
            loading={broadcastLoading}
          />
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Live Status</h3>

          {loading && <p className="text-gray-500">Loading fire reports...</p>}

          {!loading && fires.length === 0 && (
            <p className="text-gray-500">No active fire reports.</p>
          )}

          {!loading && fires.length > 0 && (
            <div className="space-y-4">
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

      <div className="lg:w-2/3 w-full p-6">
        <div className="bg-white w-full h-full rounded-xl shadow-xl p-1">
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
