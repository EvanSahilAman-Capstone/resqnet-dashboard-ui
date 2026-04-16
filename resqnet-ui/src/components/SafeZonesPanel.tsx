import React, { useRef, useState } from "react";
import {
  X,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Search,
} from "lucide-react";
import { usePanels } from "../context/PanelContext";
import SafeZoneForm, { type SafeZoneFormData } from "./SafeZoneForm";
import type { SafeZone } from "./map/types";

interface SafeZonesPanelProps {
  zones: SafeZone[];
  isPlacingSafeZone: boolean;
  safeZoneLoading: boolean;
  safeZoneRadiusM: number;
  safeZoneCoords?: [number, number];
  onSafeZoneActivate: (data: SafeZoneFormData) => void;
  onSafeZoneCancelPlace: () => void;
  onSafeZoneRadiusChange: (r: number) => void;
  onFlyTo?: (lat: number, lng: number) => void;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-800 border border-green-300",
  at_capacity: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  closed: "bg-gray-100 text-gray-500 border border-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  active: "ACTIVE",
  at_capacity: "AT CAP",
  closed: "CLOSED",
};

const CATEGORY_LABEL: Record<string, string> = {
  shelter: "Shelter",
  medical: "Medical",
  evacuation_point: "Evacuation Point",
  command_post: "Command Post",
  other: "Safe Zone",
};

const MIN_WIDTH = 260;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 300;
const LEFT_OFFSET = 64;

const SafeZonesPanel: React.FC<SafeZonesPanelProps> = ({
  zones,
  isPlacingSafeZone,
  safeZoneLoading,
  safeZoneRadiusM,
  safeZoneCoords,
  onSafeZoneActivate,
  onSafeZoneCancelPlace,
  onSafeZoneRadiusChange,
  onFlyTo,
}) => {
  const { safeZonesOpen, setSafeZonesOpen } = usePanels();

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [showCreate, setShowCreate] = useState(false);

  const resizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const delta = e.clientX - startX.current;
      setWidth(
        Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta)),
      );
    };
    const onMouseUp = () => {
      resizing.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const filtered = zones.filter(
    (z) =>
      z.name.toLowerCase().includes(search.toLowerCase()) ||
      z.category.toLowerCase().includes(search.toLowerCase()) ||
      z.status.toLowerCase().includes(search.toLowerCase()),
  );

  if (!safeZonesOpen) return null;

  return (
    <div
      className="fixed top-0 z-[500] h-screen bg-white/98 backdrop-blur-sm border-r border-gray-200 shadow-2xl flex flex-col"
      style={{ left: LEFT_OFFSET, width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-green-600" />
          <span className="text-sm font-semibold text-gray-800">
            Safe Zones
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({zones.length})
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreate((p) => !p)}
            title="Create safe zone"
            className={`p-1 rounded-lg transition-colors text-xs font-semibold px-2 ${showCreate ? "bg-green-100 text-green-700" : "hover:bg-gray-200 text-gray-500"}`}
          >
            + New
          </button>
          <button
            onClick={() => setSafeZonesOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="px-3 py-3 border-b border-gray-200 bg-green-50/40 shrink-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            New Safe Zone
          </p>
          <SafeZoneForm
            isPlacingSafeZone={isPlacingSafeZone}
            loading={safeZoneLoading}
            liveRadiusM={safeZoneRadiusM}
            onRadiusChange={onSafeZoneRadiusChange}
            coordinates={safeZoneCoords}
            onActivate={(data) => {
              onSafeZoneActivate(data);
            }}
            onCancel={() => {
              onSafeZoneCancelPlace();
              setShowCreate(false);
            }}
          />
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search safe zones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filtered.length === 0 && (
          <div className="px-4 py-8 flex flex-col items-center gap-2 text-gray-400">
            <ShieldCheck size={28} className="text-gray-300" />
            <p className="text-sm">No safe zones found</p>
          </div>
        )}

        {filtered.map((zone) => {
          const isExpanded = expandedId === zone.safe_zone_id;
          const color =
            zone.status === "active"
              ? "#16a34a"
              : zone.status === "at_capacity"
                ? "#ca8a04"
                : "#6b7280";
          const lng = zone.coordinates[0];
          const lat = zone.coordinates[1];
          const hasCoords = !isNaN(lng) && !isNaN(lat);

          return (
            <div
              key={zone.safe_zone_id}
              className="hover:bg-gray-50 transition-colors"
            >
              <div className="px-3 py-3 flex items-start gap-3">
                <ShieldCheck
                  size={18}
                  color={color}
                  strokeWidth={2}
                  className="shrink-0 mt-0.5"
                />

                <div className="flex-1 min-w-0">
                  {/* Row 1: name + status */}
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {zone.name}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[zone.status] ?? STATUS_BADGE.active}`}
                    >
                      {STATUS_LABEL[zone.status] ?? zone.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Row 2: category + radius */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-gray-400 capitalize">
                      {CATEGORY_LABEL[zone.category] ?? "Safe Zone"}
                    </span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">
                      {(zone.radius_m / 1000).toFixed(1)}km radius
                    </span>
                  </div>

                  {/* Row 3: coords + fly-to + expand */}
                  <div className="flex items-center gap-1.5 mt-1 min-w-0">
                    <p className="text-xs text-gray-400 font-mono truncate flex-1 min-w-0">
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </p>

                    {hasCoords && (
                      <button
                        type="button"
                        onClick={() => onFlyTo?.(lat, lng)}
                        title="Fly to location"
                        className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-500 transition-colors"
                      >
                        <MapPin size={11} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : zone.safe_zone_id)
                      }
                      className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                    </button>
                  </div>

                  {/* Row 4: capacity */}
                  {zone.capacity != null && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                      <Users size={11} className="shrink-0" />
                      <span>
                        {zone.current_count ?? 0} / {zone.capacity} capacity
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-1.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 pt-2">
                  {zone.description && (
                    <p className="italic border-l-2 border-gray-200 pl-2">
                      {zone.description}
                    </p>
                  )}
                  {zone.contact_info && (
                    <p>
                      <span className="text-gray-400">Contact:</span>{" "}
                      {zone.contact_info}
                    </p>
                  )}
                  <p className="font-mono text-[10px] text-gray-400">
                    {zone.safe_zone_id}
                  </p>
                  {zone.created_at && (
                    <p className="text-gray-400">
                      {new Date(zone.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll hint */}
      {filtered.length > 5 && (
        <div className="shrink-0 px-4 py-1.5 border-t border-gray-100 bg-gray-50/80 text-center">
          <span className="text-[10px] text-gray-400">
            {filtered.length} safe zones · scroll to view all
          </span>
        </div>
      )}

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-[4px] h-full bg-transparent hover:bg-green-400/40 active:bg-green-400/60 transition-colors cursor-col-resize z-10"
        onMouseDown={(e) => {
          resizing.current = true;
          startX.current = e.clientX;
          startWidth.current = width;
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
};

export default SafeZonesPanel;
