// Dashboard.tsx

// Imports
import React, { useState, useEffect } from "react";
import Map from "../components/Map";
import type { BroadcastAlert, Sensor } from "../components/Map";
import FireReportCard from "../components/FireReportCard";
import { useLocalData } from "../hooks/useLocalData.ts";
import type { BroadcastMessage } from "../components/BroadcastForm.tsx";
import BroadcastForm from "../components/BroadcastForm.tsx";
import { useApi } from "../utils/api";

// Component
const Dashboard: React.FC = () => {
  // Local data and API
  const { fires, evacRoute, loading } = useLocalData();
  const { fetchWithAuth } = useApi();

  // State
  const [broadcastAlerts, setBroadcastAlerts] = useState<BroadcastAlert[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isPlacingAlert, setIsPlacingAlert] = useState(false);
  const [pendingBroadcast, setPendingBroadcast] = useState<BroadcastMessage | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // Mapping backend sensor payload to Sensor type
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

  // Fetch sensors (initial + polling)
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

  // Fetch broadcasts (initial + polling)
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
          radius: b.radius || 1, // Keep as km
          priority: b.priority.toUpperCase(),
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

  // Handle live form changes (slider, priority, message)
  const handleBroadcastDraftChange = (draft: BroadcastMessage) => {
    setPendingBroadcast(draft); // Update live so map preview changes immediately
  };

  // Handle broadcast form submission (step 1 – choose on map)
  const handleBroadcast = (data: BroadcastMessage) => {
    setPendingBroadcast(data);
    setIsPlacingAlert(true);
  };

  // Handle placing broadcast on the map and sending to backend
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
        radius: pendingBroadcast.radius, // km
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

  // Map fire reports to map events
  const wildfireEvents = fires.map((fire) => ({
    id: fire.report_id,
    latitude: fire.coordinates[0],
    longitude: fire.coordinates[1],
    riskLevel: fire.severity.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
    message: `${fire.hazard_type} reported by ${fire.uploading_user}`,
  }));

  // Render
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      {/* Left column: controls and lists */}
      <div className="lg:w-1/3 w-full p-6 space-y-8 overflow-y-auto">
        {/* Broadcast form */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h3 className="text-2xl text-center font-semibold text-red-700 mb-6">Broadcast Alert</h3>
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

        {/* Fire reports */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">Live Status</h3>

          {loading && <p className="text-gray-500">Loading fire reports...</p>}

          {!loading && fires.length === 0 && (
            <p className="text-gray-500">No active fire reports.</p>
          )}

          {!loading && fires.length > 0 && (
            <div className="space-y-4">
              {fires.map((fire) => (
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

      {/* Right column: map */}
      <div className="lg:w-2/3 w-full p-6">
        <div className="bg-white w-full h-full rounded-xl shadow-xl p-1">
          <Map
            fires={wildfireEvents}
            evacuationRoute={evacRoute}
            broadcastAlerts={broadcastAlerts}
            sensors={sensors}
            onMapClick={handleMapClick}
            isPlacingAlert={isPlacingAlert}
            draftRadiusKm={pendingBroadcast?.radius ?? 1}
            draftPriority={pendingBroadcast?.priority ?? 'LOW'}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

