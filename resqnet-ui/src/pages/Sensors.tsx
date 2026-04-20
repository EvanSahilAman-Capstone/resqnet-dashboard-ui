import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Thermometer,
  Droplets,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  RefreshCw,
  ChevronDown,
  MapPin,
  Cpu,
  Activity,
  Clock,
  Brain,
  Flame,
  ShieldAlert,
  BarChart2,
  GripVertical,
} from "lucide-react";
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
  fireDetected?: boolean;
  fireScore?: number;
  mlSeverity?: string;
  mlRiskLevel?: string;
  mlConfidence?: number;
  bufferSize?: number;
}

type SectionKey = "ml" | "env" | "location" | "device";
const DEFAULT_SECTION_ORDER: SectionKey[] = ["ml", "env", "location", "device"];

const StatusIcon = ({
  status,
  size = 18,
}: {
  status: Sensor["status"];
  size?: number;
}) => {
  switch (status) {
    case "ONLINE":
      return <CheckCircle2 size={size} className="text-emerald-500" />;
    case "WARNING":
      return <AlertTriangle size={size} className="text-amber-500" />;
    case "ERROR":
      return <XCircle size={size} className="text-rose-500" />;
    default:
      return <MinusCircle size={size} className="text-slate-400" />;
  }
};

const BatteryIcon = ({
  level,
  size = 18,
}: {
  level: number;
  size?: number;
}) => {
  if (level >= 75)
    return <BatteryFull size={size} className="text-emerald-500" />;
  if (level >= 40)
    return <BatteryMedium size={size} className="text-amber-500" />;
  if (level >= 15)
    return <BatteryLow size={size} className="text-orange-500" />;
  return <BatteryWarning size={size} className="text-rose-500" />;
};

const TempIcon = ({ value, size = 16 }: { value: number; size?: number }) => (
  <Thermometer
    size={size}
    className={
      value >= 40
        ? "text-rose-500"
        : value >= 28
          ? "text-amber-500"
          : "text-emerald-500"
    }
  />
);

const HumidityIcon = ({
  value,
  size = 16,
}: {
  value: number;
  size?: number;
}) => (
  <Droplets
    size={size}
    className={
      value >= 80
        ? "text-blue-500"
        : value >= 50
          ? "text-emerald-500"
          : "text-amber-500"
    }
  />
);

const getMLRiskStyles = (risk?: string) => {
  switch (risk?.toUpperCase()) {
    case "CRITICAL":
      return {
        pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
        icon: <Flame size={15} className="text-rose-500" />,
        bar: "bg-rose-500",
        label: "text-rose-700",
      };
    case "HIGH":
    case "ELEVATED":
      return {
        pill: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
        icon: <ShieldAlert size={15} className="text-orange-500" />,
        bar: "bg-orange-500",
        label: "text-orange-700",
      };
    case "MEDIUM":
      return {
        pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        icon: <AlertTriangle size={15} className="text-amber-500" />,
        bar: "bg-amber-500",
        label: "text-amber-700",
      };
    case "WARMING_UP":
      return {
        pill: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        icon: <Clock size={15} className="text-slate-400" />,
        bar: "bg-slate-400",
        label: "text-slate-500",
      };
    default:
      return {
        pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        icon: <CheckCircle2 size={15} className="text-emerald-500" />,
        bar: "bg-emerald-500",
        label: "text-emerald-700",
      };
  }
};

const severityToRisk = (severity?: string): string => {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "CRITICAL";
    case "elevated":
      return "ELEVATED";
    case "warming_up":
      return "WARMING_UP";
    case "normal":
      return "LOW";
    default:
      return "LOW";
  }
};

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement> & {
    draggable?: boolean;
    onDragStart?: React.DragEventHandler<HTMLDivElement>;
    onDragOver?: React.DragEventHandler<HTMLDivElement>;
    onDrop?: React.DragEventHandler<HTMLDivElement>;
    onDragEnd?: React.DragEventHandler<HTMLDivElement>;
  };
  isDragging?: boolean;
}

const CollapsibleSection = ({
  title,
  icon,
  defaultOpen = true,
  children,
  dragHandleProps,
  isDragging,
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`border border-slate-200 bg-white overflow-hidden transition-shadow ${
        isDragging ? "shadow-xl ring-2 ring-blue-400 opacity-90" : ""
      }`}
    >
      <div className="flex w-full items-center">
        <div
          {...dragHandleProps}
          className="flex-none flex items-center justify-center px-3 py-4 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 transition"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center justify-between pr-5 py-4 text-left hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              {title}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
};

function useDragReorder<T>(initialItems: T[]) {
  const [items, setItems] = useState<T[]>(initialItems);
  const dragIndex = useRef<number | null>(null);
  const overIndex = useRef<number | null>(null);

  const prevLen = useRef(initialItems.length);
  useEffect(() => {
    if (initialItems.length !== prevLen.current) {
      setItems(initialItems);
      prevLen.current = initialItems.length;
    }
  }, [initialItems]);

  const onDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 20);
  };

  const onDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    overIndex.current = index;
  };

  const onDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndex.current = null;
    overIndex.current = null;
  };

  const onDragEnd = () => {
    dragIndex.current = null;
    overIndex.current = null;
  };

  return { items, setItems, onDragStart, onDragOver, onDrop, onDragEnd };
}

const Sensors: React.FC = () => {
  const { fetchWithAuth } = useApi();
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [rawSensors, setRawSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const sensorDrag = useDragReorder<Sensor>([]);
  const sectionDrag = useDragReorder<SectionKey>(DEFAULT_SECTION_ORDER);

  useEffect(() => {
    if (rawSensors.length === 0) return;
    sensorDrag.setItems((prev) => {
      const prevIds = prev.map((s) => s.id);
      const updated = prev.map(
        (p) => rawSensors.find((r) => r.id === p.id) ?? p,
      );
      const newOnes = rawSensors.filter((r) => !prevIds.includes(r.id));
      return [...updated, ...newOnes];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSensors]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusStyles = (status: Sensor["status"]) => {
    switch (status) {
      case "ONLINE":
        return {
          pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
          accent: "border-emerald-200",
        };
      case "WARNING":
        return {
          pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
          accent: "border-amber-200",
        };
      case "ERROR":
        return {
          pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
          accent: "border-rose-200",
        };
      default:
        return {
          pill: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
          accent: "border-slate-200",
        };
    }
  };

  const mapBackendToSensor = (
    backend: BackendSensor,
    predMap: Record<string, any>,
  ): Sensor => {
    const lastSeen = Number(backend.last_seen ?? 0);
    const ageSec = lastSeen > 0 ? Date.now() / 1000 - lastSeen : 99999;

    let status: Sensor["status"] = "OFFLINE";
    if (ageSec < 90) status = "ONLINE";
    else if (ageSec < 420) status = "WARNING";

    const pred = predMap[backend.id ?? ""];
    const fireDetected: boolean | undefined = pred?.fire_detected;
    const confidence: number | undefined = pred
      ? Number(pred.confidence)
      : undefined;
    const severity: string | undefined = pred?.severity;
    const bufferSize: number | undefined = pred
      ? Number(pred.buffer_size)
      : undefined;
    const mlRiskLevel = severityToRisk(severity);

    return {
      id: backend.id || "unknown",
      name: backend.id || "Unknown",
      status,
      latitude: Number(backend.lat) || 0,
      longitude: Number(backend.lng) || 0,
      health: status === "ONLINE" ? 100 : 0,
      temperature: Number(backend.temperature) || 0,
      humidity: Number(backend.humidity) || 0,
      battery: Number(backend.battery_level) || 100,
      lastPing:
        lastSeen > 0
          ? new Date(lastSeen * 1000).toISOString()
          : new Date(0).toISOString(),
      containerId: backend.container_id || undefined,
      locationName:
        SENSOR_LOCATION_NAMES[backend.id ?? ""] || "Unknown Location",
      fireDetected,
      fireScore: confidence,
      mlSeverity: severity,
      mlRiskLevel,
      mlConfidence: confidence,
      bufferSize,
    };
  };

  const fetchSensors = useCallback(
    async (manual = false) => {
      try {
        if (manual) setRefreshing(true);
        else setLoading(true);

        const [sensorsData, predictionsData] = await Promise.all([
          fetchWithAuth("/sensors"),
          fetchWithAuth("/sensors/predictions").catch(() => ({
            predictions: [],
          })),
        ]);

        const predMap: Record<string, any> = {};
        for (const p of predictionsData?.predictions ?? []) {
          predMap[p.sensor_id] = p;
        }

        const list: BackendSensor[] = Array.isArray(sensorsData?.sensors)
          ? sensorsData.sensors
          : [];

        const mapped = list
          .map((b) => mapBackendToSensor(b, predMap))
          .filter((s) => s.id !== "unknown");

        setRawSensors(mapped);

        if (mapped.length === 0) {
          setSelectedSensor(null);
          return;
        }

        setSelectedSensor((prev) => {
          if (!prev) return mapped[0];
          return mapped.find((s) => s.id === prev.id) || mapped[0];
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchWithAuth],
  );

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      if (cancelled) return;
      await fetchSensors();
      if (!cancelled) timeoutId = setTimeout(poll, 30000);
    };
    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchSensors]);

  const formatRelativeTime = (iso: string) => {
    const timestamp = new Date(iso).getTime();
    if (!timestamp || Number.isNaN(timestamp) || timestamp <= 0) return "Never";
    const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
    if (diffSeconds < 10) return "Just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const MetricTile = ({
    label,
    value,
    subtext,
    icon,
  }: {
    label: string;
    value: string;
    subtext?: string;
    icon?: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {subtext && <p className="mt-1 text-sm text-slate-500">{subtext}</p>}
    </div>
  );

  const InfoRow = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string;
    icon?: React.ReactNode;
  }) => (
    <div className="border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-2 break-all text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );

  const MLScoreBar = ({
    score,
    riskStyles,
  }: {
    score: number;
    riskStyles: ReturnType<typeof getMLRiskStyles>;
  }) => (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-500">
          Prediction Confidence
        </span>
        <span className={`text-xs font-bold ${riskStyles.label}`}>
          {(score * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${riskStyles.bar}`}
          style={{ width: `${Math.min(score * 100, 100)}%` }}
        />
      </div>
    </div>
  );

  const renderSection = (key: SectionKey, sensor: Sensor, index: number) => {
    const dragProps = {
      draggable: true as const,
      onDragStart: sectionDrag.onDragStart(index),
      onDragOver: sectionDrag.onDragOver(index),
      onDrop: sectionDrag.onDrop(index),
      onDragEnd: sectionDrag.onDragEnd,
    };
    const mlStyles = getMLRiskStyles(sensor.mlRiskLevel);

    switch (key) {
      case "ml":
        return (
          <CollapsibleSection
            key="ml"
            title="ML Fire Analysis"
            icon={<Brain size={15} className="text-violet-500" />}
            defaultOpen
            dragHandleProps={dragProps}
          >
            {sensor.mlSeverity || sensor.fireDetected !== undefined ? (
              <div className="space-y-4">
                {sensor.mlSeverity === "warming_up" && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                    <Clock size={14} className="shrink-0 text-slate-400" />
                    <span>
                      Sensor warming up — {sensor.bufferSize ?? 0}/10 readings
                      buffered. Predictions will appear once the buffer is full.
                    </span>
                  </div>
                )}

                {sensor.fireScore !== undefined &&
                  sensor.mlSeverity !== "warming_up" && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <BarChart2 size={14} className="text-slate-400" />
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            {`Confidence: ${sensor.fireDetected ? "FIRE DETECTED" : "NO FIRE"}`}
                          </span>
                        </div>
                        <span className={`text-lg font-bold ${mlStyles.label}`}>
                          {(sensor.fireScore * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${mlStyles.bar}`}
                          style={{
                            width: `${Math.min(sensor.fireScore * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <InfoRow
                    label="Fire Detected"
                    value={
                      sensor.fireDetected === undefined
                        ? "N/A"
                        : sensor.fireDetected
                          ? "YES"
                          : "NO"
                    }
                    icon={<Brain size={12} className="text-violet-400" />}
                  />
                  <InfoRow
                    label="Severity"
                    value={
                      sensor.mlSeverity
                        ? sensor.mlSeverity.replace("_", " ").toUpperCase()
                        : "N/A"
                    }
                    icon={mlStyles.icon}
                  />
                  <InfoRow
                    label="Confidence"
                    value={
                      sensor.mlConfidence !== undefined
                        ? `${(sensor.mlConfidence * 100).toFixed(1)}%`
                        : "N/A"
                    }
                    icon={<BarChart2 size={12} className="text-slate-400" />}
                  />
                </div>

                {sensor.bufferSize !== undefined && (
                  <p className="text-xs text-slate-400">
                    Rolling buffer: {sensor.bufferSize}/10 readings
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic py-2">
                No ML prediction available for this sensor.
              </p>
            )}
          </CollapsibleSection>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-screen-2xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Sensor Monitoring
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              Sensors
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Live device status, ML fire predictions, environment readings, and
              location details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fetchSensors(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
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
                  Loading sensors…
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Pulling the latest sensor state from the backend.
                </p>
              </div>
            ) : sensorDrag.items.length === 0 ? (
              <div className="border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <Activity size={40} className="mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-900">
                  No Sensors Detected
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sensors will appear here when connected to the backend.
                </p>
              </div>
            ) : (
              <div
                className="flex flex-col border border-slate-200 bg-white shadow-sm"
                style={{ maxHeight: "calc(100vh - 220px)" }}
              >
                <div className="flex-none px-6 pt-5 pb-4 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Active Sensors
                  </h2>
                  <p className="text-sm text-slate-500">
                    {sensorDrag.items.length} device
                    {sensorDrag.items.length === 1 ? "" : "s"} — drag to reorder
                  </p>
                </div>

                <div
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                  style={{ scrollbarGutter: "stable" }}
                >
                  {sensorDrag.items.map((sensor, index) => {
                    const statusStyles = getStatusStyles(sensor.status);
                    const mlStyles = getMLRiskStyles(sensor.mlRiskLevel);
                    const isSelected = selectedSensor?.id === sensor.id;

                    return (
                      <div
                        key={sensor.id}
                        draggable
                        onDragStart={sensorDrag.onDragStart(index)}
                        onDragOver={sensorDrag.onDragOver(index)}
                        onDrop={sensorDrag.onDrop(index)}
                        onDragEnd={sensorDrag.onDragEnd}
                        className={`group w-full rounded-2xl border p-4 text-left transition duration-200 cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : `bg-white hover:border-slate-400 hover:shadow-md ${statusStyles.accent}`
                        }`}
                        onClick={() => setSelectedSensor(sensor)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) =>
                          e.key === "Enter" && setSelectedSensor(sensor)
                        }
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical
                            size={16}
                            className="mt-1 flex-none text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <StatusIcon
                                    status={sensor.status}
                                    size={16}
                                  />
                                  <h3 className="truncate text-base font-semibold text-slate-900">
                                    {sensor.name}
                                  </h3>
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-slate-500">
                                  <MapPin size={12} className="shrink-0" />
                                  <p className="truncate text-sm">
                                    {sensor.locationName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles.pill}`}
                                >
                                  {sensor.status}
                                </span>
                                {sensor.mlRiskLevel &&
                                  sensor.mlSeverity !== "warming_up" && (
                                    <span
                                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${mlStyles.pill}`}
                                    >
                                      {mlStyles.icon}
                                      {sensor.mlRiskLevel}
                                    </span>
                                  )}
                                {sensor.mlSeverity === "warming_up" && (
                                  <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                                    <Clock size={11} />
                                    Warming up
                                  </span>
                                )}
                              </div>
                            </div>

                            {sensor.fireScore !== undefined &&
                              sensor.mlSeverity !== "warming_up" && (
                                <MLScoreBar
                                  score={sensor.fireScore}
                                  riskStyles={mlStyles}
                                />
                              )}

                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div>
                                <div className="flex items-center gap-1">
                                  <TempIcon value={sensor.temperature} />
                                  <p className="text-xs font-medium text-slate-400">
                                    Temp
                                  </p>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {sensor.temperature}°C
                                </p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <HumidityIcon value={sensor.humidity} />
                                  <p className="text-xs font-medium text-slate-400">
                                    Humidity
                                  </p>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {sensor.humidity}%
                                </p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <BatteryIcon level={sensor.battery} />
                                  <p className="text-xs font-medium text-slate-400">
                                    Battery
                                  </p>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {sensor.battery}%
                                </p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1">
                                  <Clock size={14} className="text-slate-400" />
                                  <p className="text-xs font-medium text-slate-400">
                                    Last Seen
                                  </p>
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {formatRelativeTime(sensor.lastPing)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div
            className="xl:col-span-8 overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 220px)" }}
          >
            {selectedSensor ? (
              <div className="space-y-4">
                <div className="border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                  <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin size={13} />
                        <p className="text-sm font-medium">
                          {selectedSensor.locationName}
                        </p>
                      </div>
                      <h2 className="mt-1 truncate text-3xl font-semibold tracking-tight text-slate-900">
                        {selectedSensor.name}
                      </h2>
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                        <Clock size={13} />
                        <span>
                          Last ping{" "}
                          {formatRelativeTime(selectedSensor.lastPing)} •{" "}
                          {new Date(selectedSensor.lastPing).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={selectedSensor.status} size={20} />
                      <span
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusStyles(selectedSensor.status).pill}`}
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
                      icon={
                        <TempIcon
                          value={selectedSensor.temperature}
                          size={15}
                        />
                      }
                    />
                    <MetricTile
                      label="Humidity"
                      value={`${selectedSensor.humidity}%`}
                      subtext="Ambient moisture"
                      icon={
                        <HumidityIcon
                          value={selectedSensor.humidity}
                          size={15}
                        />
                      }
                    />
                    <MetricTile
                      label="Battery"
                      value={`${selectedSensor.battery}%`}
                      subtext="Remaining charge"
                      icon={
                        <BatteryIcon level={selectedSensor.battery} size={15} />
                      }
                    />

                    {/* FIX 3: replaced border-current/20 with explicit border-slate-200 */}
                    <div
                      className={`rounded-2xl border p-5 ${
                        selectedSensor.fireScore !== undefined &&
                        selectedSensor.mlSeverity !== "warming_up"
                          ? `${getMLRiskStyles(selectedSensor.mlRiskLevel).pill} border-slate-200`
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Brain
                          size={15}
                          className={
                            selectedSensor.fireScore !== undefined &&
                            selectedSensor.mlSeverity !== "warming_up"
                              ? getMLRiskStyles(selectedSensor.mlRiskLevel)
                                  .label
                              : "text-slate-400"
                          }
                        />
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Fire Score
                        </p>
                      </div>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                        {selectedSensor.mlSeverity === "warming_up"
                          ? "..."
                          : selectedSensor.fireScore !== undefined
                            ? `${(selectedSensor.fireScore * 100).toFixed(1)}%`
                            : "N/A"}
                      </p>
                      {selectedSensor.mlSeverity === "warming_up" ? (
                        <p className="mt-1 text-sm text-slate-400">
                          {selectedSensor.bufferSize ?? 0}/10 readings
                        </p>
                      ) : selectedSensor.mlRiskLevel ? (
                        <div className="mt-1 flex items-center gap-1">
                          {getMLRiskStyles(selectedSensor.mlRiskLevel).icon}
                          <p
                            className={`text-sm font-semibold ${getMLRiskStyles(selectedSensor.mlRiskLevel).label}`}
                          >
                            {selectedSensor.mlRiskLevel} Risk
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {sectionDrag.items.map((key, index) =>
                    renderSection(key, selectedSensor, index),
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                <Activity size={56} className="mb-6 text-slate-300" />
                <h3 className="text-2xl font-semibold text-slate-900">
                  Select a Sensor
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                  Choose a sensor from the list to inspect its ML predictions,
                  readings, and location details.
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
