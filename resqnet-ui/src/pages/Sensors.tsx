import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../utils/api";
import { SENSOR_LOCATION_NAMES } from "../components/map/constants";

export interface Sensor {
  id: string;
  name: string;
  status: "ONLINE" | "OFFLINE" | "WARNING" | "ERROR";
  latitude: number;
  longitude: number;
  health: number;
  temperature: number;
  humidity: number;
  battery: number;
  lastPing: string;
  containerId?: string;
  locationName: string;
}

const Sensors: React.FC = () => {
  const { fetchWithAuth } = useApi();
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);

  const getStatusColor = (status: Sensor["status"]) => {
    switch (status) {
      case "ONLINE":
        return "bg-green-100 text-green-800";
      case "WARNING":
        return "bg-yellow-100 text-yellow-800";
      case "OFFLINE":
        return "bg-gray-100 text-gray-800";
      case "ERROR":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const mapBackendToSensor = (backend: any): Sensor => {
    const lastSeen = Number(backend.last_seen ?? 0);
    const ageSec = lastSeen > 0 ? Date.now() / 1000 - lastSeen : 99999;

    let status: Sensor["status"] = "OFFLINE";
    if (ageSec < 90) status = "ONLINE";
    else if (ageSec < 420) status = "WARNING";

    return {
      id: backend.id || "unknown",
      name: backend.id || "Unknown",
      status,
      latitude: Number(backend.lat) || 0,
      longitude: Number(backend.lng) || 0,
      health: 100,                                    // Backend doesn't provide
      temperature: Number(backend.temperature) || 0,
      humidity: Number(backend.humidity) || 0, 
      battery: Number(backend.battery_level) || 100,
      lastPing: lastSeen > 0 ? new Date(lastSeen * 1000).toISOString() : new Date(0).toISOString(),
      containerId: backend.container_id,
      locationName: SENSOR_LOCATION_NAMES[backend.id] || "Unknown Location",
    };
  };

  const fetchSensors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth("/sensors");
      console.log("Raw data:", data);

      const list = Array.isArray(data?.sensors) ? data.sensors : [];
      const mapped = list
        .map(mapBackendToSensor)
        .filter((s: Sensor) => s.id !== "unknown"); // Filter junk
      console.log("Mapped:", mapped);

      setSensors(mapped);

      // Always auto-select first (even on refresh)
      if (mapped.length > 0) {
        setSelectedSensor(mapped[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // Polls every 30 seconds after each completed request
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) return;

      await fetchSensors();

      if (!cancelled) {
        timeoutId = setTimeout(poll, 30000);
      }
    };
    poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchSensors]); // Stable callback

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-gray-50">
      <div className="lg:w-1/3 w-full p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Wireless Sensors ({sensors.length})
          </h2>
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="bg-white shadow-lg rounded-xl p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Loading Sensors...
            </h3>
          </div>
        ) : sensors.length === 0 ? (
          <div className="bg-white shadow-lg rounded-xl p-8 text-center">
            <div className="text-4xl text-gray-400 mb-4">📡</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Sensors Detected
            </h3>
            <p className="text-gray-500">
              Backend will populate sensors here when they are running and
              connected.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-xl p-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Active Sensors
            </h3>
            {sensors.map((sensor) => (
              <div
                key={sensor.id}
                onClick={() => setSelectedSensor(sensor)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                  selectedSensor?.id === sensor.id
                    ? "border-blue-500 bg-blue-50 shadow-md scale-[1.02]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-lg">{sensor.name}</h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        sensor.status,
                      )}`}
                    >
                      {sensor.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {sensor.health}%
                    </div>
                    <div className="text-xs text-gray-500">Health</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div>{sensor.temperature}C</div>
                  <div>{sensor.humidity}%</div>
                  <div>{sensor.battery}%</div>
                  <div className="text-xs">
                    {new Date(sensor.lastPing).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lg:w-2/3 w-full p-6">
        {selectedSensor ? (
          <div className="bg-white shadow-xl rounded-xl p-8 flex flex-col">
            <div className="space-y-8 h-full flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b border-gray-200">
                <div>
                  <span className="text-2xl font-bold text-gray-900 pr-2">
                    {selectedSensor.name}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedSensor.status)}`}
                  >
                    {selectedSensor.status}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-semibold text-red-900">{selectedSensor.locationName}</span>
              </div>

              {/* Metrics Table */}
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 mb-6">
                  Live Readings
                </h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {selectedSensor.temperature}°C
                    </div>
                    <div className="text-gray-500 uppercase tracking-wide text-xs">
                      Temperature
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {selectedSensor.humidity}%
                    </div>
                    <div className="text-gray-500 uppercase tracking-wide text-xs">
                      Humidity
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {selectedSensor.health}%
                    </div>
                    <div className="text-gray-500 uppercase tracking-wide text-xs">
                      Health
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {selectedSensor.battery}%
                    </div>
                    <div className="text-gray-500 uppercase tracking-wide text-xs">
                      Battery
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Last Ping */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-semibold text-gray-900 text-lg">
                    Location
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(selectedSensor.lastPing).toLocaleString()}
                  </span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {selectedSensor.latitude.toFixed(4)},{" "}
                  {selectedSensor.longitude.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-xl p-12 text-center h-full flex flex-col justify-center">
            <div className="text-6xl text-gray-300 mb-6">📡</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Select a Sensor
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Click any sensor from the list on the left to view detailed health
              metrics, position data, and live readings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sensors;
