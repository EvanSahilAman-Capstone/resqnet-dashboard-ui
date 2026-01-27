import React, { useState, useEffect } from "react";
import Map from "../components/Map";
import type { BroadcastAlert, Sensor } from "../components/Map";
import FireReportCard from "../components/FireReportCard";
import { useLocalData } from "../hooks/useLocalData.ts";
import type { BroadcastMessage } from "../components/BroadcastForm.tsx";
import BroadcastForm from "../components/BroadcastForm.tsx";

const Dashboard: React.FC = () => {
  const { fires, evacRoute, loading } = useLocalData();
  const [broadcastAlerts, setBroadcastAlerts] = useState<BroadcastAlert[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isPlacingAlert, setIsPlacingAlert] = useState(false);
  const [pendingBroadcast, setPendingBroadcast] = useState<BroadcastMessage | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  // Maps backend sensor data to Map sensor interface
  const mapBackendToSensor = (backend: any): Sensor => {
    const ageSec = Date.now() / 1000 - backend.last_seen;
    let status: Sensor['status'] = 'OFFLINE';
    if (ageSec < 60) status = 'ONLINE';
    else if (ageSec < 300) status = 'WARNING';
    
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

  // Fetch sensors
  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const res = await fetch('http://localhost:8000/sensors');
        const data = await res.json();
        const mapped: Sensor[] = data.map(mapBackendToSensor);
        setSensors(mapped);
      } catch (err) {
        console.error('Failed to fetch sensors:', err);
      }
    };

    fetchSensors();
    const interval = setInterval(fetchSensors, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch existing broadcasts on mount
  useEffect(() => {
    const fetchBroadcasts = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/broadcasts');
        const data = await res.json();
        const alerts: BroadcastAlert[] = data.map((b: any, idx: number) => ({
          id: b._id || `broadcast-${idx}`,
          position: b.coordinates || [44.5, -79.5],
          radius: b.radius,
          priority: b.priority.toUpperCase(),
          message: b.message,
        }));
        setBroadcastAlerts(alerts);
      } catch (err) {
        console.error("Failed to fetch broadcasts:", err);
      }
    };

    fetchBroadcasts();
  }, []);

  const handleBroadcast = async (data: BroadcastMessage) => {
    setPendingBroadcast(data);
    setIsPlacingAlert(true);
    alert('Click on the map to place the broadcast alert location');
  };

  // Refresh broadcasts from server
  const refreshBroadcasts = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/broadcasts');
      const data = await res.json();
      const alerts: BroadcastAlert[] = data.map((b: any) => ({
        id: b._id || b.id,
        position: b.coordinates || [44.5, -79.5],
        radius: b.radius,
        priority: b.priority.toUpperCase(),
        message: b.message,
      }));
      setBroadcastAlerts(alerts);
    } catch (err) {
      console.error("Failed to fetch broadcasts:", err);
    }
  };

  // Call refreshBroadcasts every 10 seconds to sync with Alerts page changes
  useEffect(() => {
    const interval = setInterval(refreshBroadcasts, 10000);
    return () => clearInterval(interval);
  }, []);

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

      const res = await fetch('http://127.0.0.1:8000/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(broadcastData),
      });

      const result = await res.json();

      if (result.status === 'success') {
        const newAlert: BroadcastAlert = {
          id: result.broadcast_id,
          position: [lat, lng],
          radius: pendingBroadcast.radius,
          priority: pendingBroadcast.priority,
          message: pendingBroadcast.message,
        };
        
        setBroadcastAlerts(prev => [...prev, newAlert]);
        alert(`Broadcast sent successfully!\n\nMessage: ${pendingBroadcast.message}\nLocation: [${lat.toFixed(4)}, ${lng.toFixed(4)}]\nRadius: ${pendingBroadcast.radius}km`);
      } else {
        alert('Failed to send broadcast');
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      alert('Error sending broadcast');
    } finally {
      setPendingBroadcast(null);
      setBroadcastLoading(false);
    }
  };

  const wildfireEvents = fires.map((fire) => ({
    id: fire.report_id,
    latitude: fire.coordinates[0],
    longitude: fire.coordinates[1],
    riskLevel: fire.severity.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME',
    message: `${fire.hazard_type} reported by ${fire.uploading_user}`,
  }));

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-gray-50">
      <div className="lg:w-1/3 w-full p-6 space-y-8 overflow-y-auto">

        {/* BROADCAST FORM COMPONENT */}
        <div className="bg-white shadow-lg rounded-xl p-6">
            <h3 className="text-2xl text-center font-semibold text-red-700 mb-6">Broadcast Alert</h3>
            {isPlacingAlert && (
              <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
                📍 Click on the map to place alert location
              </div>
            )}
            <BroadcastForm onSubmit={handleBroadcast} loading={broadcastLoading} />
        </div>

        {/* LIVE STATUS SECTION */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Live Status
          </h3>

          {loading && (
            <p className="text-gray-500">Loading fire reports...</p>
          )}

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

      {/* MAP COMPONENT */}
      <div className="lg:w-2/3 w-full p-6">
        <div className="bg-white w-full h-full rounded-xl shadow-xl p-1">
          <Map 
            fires={wildfireEvents} 
            evacuationRoute={evacRoute}
            broadcastAlerts={broadcastAlerts}
            sensors={sensors}
            onMapClick={handleMapClick}
            isPlacingAlert={isPlacingAlert}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
