import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../utils/api";
import { SENSOR_LOCATION_NAMES } from "../components/map/constants";
import type { BackendSensor } from "../components/map/types";

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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusStyles = (status: Sensor["status"]) => {
    switch (status) {
      case "ONLINE":
        return {
          pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
          dot: "bg-emerald-500",
          accent: "border-emerald-200",
        };
      case "WARNING":
        return {
          pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
          dot: "bg-amber-500",
          accent: "border-amber-200",
        };
      case "ERROR":
        return {
          pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
          dot: "bg-rose-500",
          accent: "border-rose-200",
        };
      case "OFFLINE":
      default:
        return {
          pill: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
          dot: "bg-slate-400",
          accent: "border-slate-200",
        };
    }
  };

  const mapBackendToSensor = (backend: BackendSensor): Sensor => {
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
      health: 100,
      temperature: Number(backend.temperature) || 0,
      humidity: Number(backend.humidity) || 0,
      battery: Number(backend.battery_level) || 100,
      lastPing:
        lastSeen > 0
          ? new Date(lastSeen * 1000).toISOString()
          : new Date(0).toISOString(),
      containerId: backend.container_id || undefined,
      locationName: SENSOR_LOCATION_NAMES[backend.id ?? ""] || "Unknown Location",
    };
  };

  const fetchSensors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth("/sensors");

      const list: BackendSensor[] = Array.isArray(data?.sensors) ? data.sensors : [];
      const mapped = list
        .map(mapBackendToSensor)
        .filter((s) => s.id !== "unknown");

      setSensors(mapped);

      if (mapped.length === 0) {
        setSelectedSensor(null);
        return;
      }

      setSelectedSensor((prev) => {
        if (!prev) return mapped[0];
        return mapped.find((sensor) => sensor.id === prev.id) || mapped[0];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

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
  }, [fetchSensors]);

  const formatRelativeTime = (iso: string) => {
    const timestamp = new Date(iso).getTime();
    if (!timestamp || Number.isNaN(timestamp) || timestamp <= 0) {
      return "Never";
    }

    const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

    if (diffSeconds < 10) return "Just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getBatteryColor = (battery: number) => {
    if (battery >= 60) return "bg-emerald-500";
    if (battery >= 30) return "bg-amber-500";
    return "bg-rose-500";
  };

  const MetricTile = ({
    label,
    value,
    subtext,
  }: {
    label: string;
    value: string;
    subtext?: string;
  }) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {subtext ? (
        <p className="mt-1 text-sm text-slate-500">{subtext}</p>
      ) : null}
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 wrap-break-word text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-4 border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Sensor Monitoring
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              Sensors
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Live device status, environment readings, and location details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            {loading ? (
              <div className="border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Loading sensors...
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Pulling the latest sensor state from the backend.
                </p>
              </div>
            ) : sensors.length === 0 ? (
              <div className="border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <div className="mb-4 text-4xl">📡</div>
                <h3 className="text-xl font-semibold text-slate-900">
                  No Sensors Detected
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sensors will appear here when they are running and connected
                  to the backend.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 bg-white p-4 shadow-sm max-h-[550px] flex flex-col">
                <div className="mb-4 flex items-center justify-between px-2 pt-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Active Sensors
                    </h2>
                    <p className="text-sm text-slate-500">
                      {sensors.length} device{sensors.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div
                  className="space-y-3 overflow-y-auto pr-4"
                  style={{ scrollbarGutter: "stable" }}
                >
                  {sensors.map((sensor) => {
                    const statusStyles = getStatusStyles(sensor.status);
                    const isSelected = selectedSensor?.id === sensor.id;

                    return (
                      <button
                        key={sensor.id}
                        type="button"
                        onClick={() => setSelectedSensor(sensor)}
                        className={`w-full rounded-2xl border p-4 text-left transition duration-200 focus:outline-none ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : `bg-white hover:border-slate-400 hover:shadow-md ${statusStyles.accent}`
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 pr-4 mr-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${statusStyles.dot}`}
                              />
                              <h3 className="truncate text-base font-semibold text-slate-900">
                                {sensor.name}
                              </h3>
                            </div>
                            <p className="mt-1 truncate text-sm text-slate-500">
                              {sensor.locationName}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles.pill}`}
                          >
                            {sensor.status}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Temp
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {sensor.temperature}°C
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Humidity
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {sensor.humidity}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Battery
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${getBatteryColor(sensor.battery)}`}
                                  style={{
                                    width: `${Math.max(
                                      6,
                                      Math.min(sensor.battery, 100),
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-slate-800">
                                {sensor.battery}%
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-400">
                              Last Seen
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatRelativeTime(sensor.lastPing)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-8">
            {selectedSensor ? (
              <div className="border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                      {selectedSensor.locationName}
                    </p>
                    <h2 className="mt-1 truncate text-3xl font-semibold tracking-tight text-slate-900">
                      {selectedSensor.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Last ping {formatRelativeTime(selectedSensor.lastPing)} •{" "}
                      {new Date(selectedSensor.lastPing).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                        getStatusStyles(selectedSensor.status).pill
                      }`}
                    >
                      {selectedSensor.status}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricTile
                    label="Temperature"
                    value={`${selectedSensor.temperature}°C`}
                    subtext="Current reading"
                  />
                  <MetricTile
                    label="Humidity"
                    value={`${selectedSensor.humidity}%`}
                    subtext="Ambient moisture"
                  />
                  <MetricTile
                    label="Battery"
                    value={`${selectedSensor.battery}%`}
                    subtext="Remaining charge"
                  />
                  <MetricTile
                    label="Health"
                    value={`${selectedSensor.health}%`}
                    subtext="Currently static"
                  />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <InfoRow label="Sensor ID" value={selectedSensor.id} />
                  <InfoRow
                    label="Container ID"
                    value={selectedSensor.containerId || "N/A"}
                  />
                  <InfoRow
                    label="Coordinates"
                    value={`${selectedSensor.latitude.toFixed(4)}, ${selectedSensor.longitude.toFixed(4)}`}
                  />
                  <InfoRow
                    label="Location Name"
                    value={selectedSensor.locationName}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                <div className="mb-6 text-6xl text-slate-300">📡</div>
                <h3 className="text-2xl font-semibold text-slate-900">
                  Select a Sensor
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                  Choose a sensor from the list to inspect its latest readings,
                  status, and location details.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Sensors;
