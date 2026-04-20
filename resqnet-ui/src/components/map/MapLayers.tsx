import React, { useState, useEffect } from "react";
import { Source, Layer } from "react-map-gl/mapbox";
import circle from "@turf/circle";
import type {
  Feature,
  FeatureCollection,
  LineString,
  Polygon,
  Point,
} from "geojson";
import type { BroadcastAlert, Sensor, WildfireEvent, SafeZone } from "./types";
import type { LayerToggles } from "../../context/PanelContext";
import { PRIORITY_COLORS, SEVERITY_COLORS, getRouteColor } from "./constants";

interface MapLayersProps {
  broadcastAlerts: BroadcastAlert[];
  evacuationRoute: [number, number][];
  evacuationSafetyScore?: number;
  mousePosition: [number, number] | null;
  draftRadiusKm: number;
  draftPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  showDraftCircle?: boolean;
  sensors?: Sensor[];
  fires?: WildfireEvent[];
  safeZones?: SafeZone[];
  // Safe zone draft props
  showDraftSafeZone?: boolean;
  safeZoneMousePos?: [number, number] | null;
  safeZoneRadiusM?: number;
  layerToggles?: LayerToggles;
  customOverlayFile?: File | null;
}

const SENSOR_RADIUS_KM = 5;
const SAFE_ZONE_GREEN = "#16a34a";

interface RainViewerFrame {
  time: number;
  path: string;
}
interface RainViewerAPI {
  host: string;
  radar: { past: RainViewerFrame[]; nowcast?: RainViewerFrame[] };
}
const RV_COLOR = 6,
  RV_OPTIONS = "1_0",
  RV_SIZE = 512;

const MapLayers: React.FC<MapLayersProps> = ({
  broadcastAlerts,
  evacuationRoute,
  evacuationSafetyScore,
  mousePosition,
  draftRadiusKm,
  draftPriority,
  showDraftCircle = false,
  sensors = [],
  fires = [],
  safeZones = [],
  showDraftSafeZone = false,
  safeZoneMousePos = null,
  safeZoneRadiusM = 500,
  layerToggles,
  customOverlayFile,
}) => {
  const routeColor = getRouteColor(evacuationSafetyScore);
  const t = layerToggles;

  // ── RainViewer radar ──────────────────────────────────────────────────────
  const [radarTileUrl, setRadarTileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!t?.liveWeather) {
      setRadarTileUrl(null);
      return;
    }
    let cancelled = false;
    const fetchRadar = async () => {
      try {
        const res = await fetch(
          "https://api.rainviewer.com/public/weather-maps.json",
        );
        const data = (await res.json()) as RainViewerAPI;
        if (cancelled) return;
        const latest = data.radar.past[data.radar.past.length - 1];
        if (!latest) return;
        setRadarTileUrl(
          `${data.host}${latest.path}/${RV_SIZE}/{z}/{x}/{y}/${RV_COLOR}/${RV_OPTIONS}.png`,
        );
      } catch (err) {
        console.error("[ResQNet] RainViewer fetch failed:", err);
      }
    };
    fetchRadar();
    const interval = setInterval(fetchRadar, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [t?.liveWeather]);

  // ── Custom overlay GeoJSON ────────────────────────────────────────────────
  const [customGeoJSON, setCustomGeoJSON] = useState<FeatureCollection | null>(
    null,
  );

  useEffect(() => {
    if (!customOverlayFile) {
      setCustomGeoJSON(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setCustomGeoJSON(JSON.parse(e.target?.result as string));
      } catch {
        console.error("Invalid GeoJSON file");
      }
    };
    reader.readAsText(customOverlayFile);
  }, [customOverlayFile]);

  // ── Broadcast circles ─────────────────────────────────────────────────────
  const alertCircles: Feature[] = broadcastAlerts.map(
    (alert) =>
      circle(
        [alert.position[1], alert.position[0]],
        Math.max(0.01, alert.radius),
        {
          steps: 64,
          units: "kilometers",
          properties: {
            id: alert.id,
            priority: alert.priority,
            color: PRIORITY_COLORS[alert.priority],
          },
        },
      ) as Feature,
  );
  const alertsCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: alertCircles,
  };

  // ── Broadcast draft circle ────────────────────────────────────────────────
  const draftFeature: Feature<Polygon> | null =
    showDraftCircle && mousePosition
      ? (circle(mousePosition, Math.max(0.01, draftRadiusKm), {
          steps: 64,
          units: "kilometers",
          properties: { color: PRIORITY_COLORS[draftPriority] },
        }) as Feature<Polygon>)
      : null;

  // ── Safe zone permanent circles ────────────────────────────
  const safeZoneCircles: Feature[] = safeZones
    .filter((z) => {
      const lng = z.coordinates[0];
      const lat = z.coordinates[1];
      return (
        typeof lng === "number" &&
        typeof lat === "number" &&
        !isNaN(lng) &&
        !isNaN(lat) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        z.radius_m > 0
      );
    })
    .map(
      (z) =>
        circle(
          [z.coordinates[0], z.coordinates[1]],
          Math.max(0.01, z.radius_m / 1000),
          {
            steps: 64,
            units: "kilometers",
            properties: { id: z.safe_zone_id },
          },
        ) as Feature,
    );
  const safeZonesCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: safeZoneCircles,
  };

  // ── Safe zone draft circle ────────────────────────────────────────────────
  const safeZoneDraftFeature: Feature<Polygon> | null =
    showDraftSafeZone && safeZoneMousePos
      ? (circle(safeZoneMousePos, Math.max(0.01, safeZoneRadiusM / 1000), {
          steps: 64,
          units: "kilometers",
          properties: { color: SAFE_ZONE_GREEN },
        }) as Feature<Polygon>)
      : null;

  // ── Other collections ─────────────────────────────────────────────────────
  const routeGeoJSON: Feature<LineString> | null =
    evacuationRoute.length > 0
      ? {
          type: "Feature",
          properties: { safetyScore: evacuationSafetyScore ?? null },
          geometry: {
            type: "LineString",
            coordinates: evacuationRoute.map(([lat, lng]) => [lng, lat]),
          },
        }
      : null;

  const sensorCoverageCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: sensors.map(
      (s) =>
        circle([s.longitude, s.latitude], SENSOR_RADIUS_KM, {
          steps: 64,
          units: "kilometers",
          properties: {
            color:
              s.status === "ONLINE"
                ? "#10b981"
                : s.status === "WARNING"
                  ? "#f59e0b"
                  : "#6b7280",
          },
        }) as Feature,
    ),
  };

  const fireHeatmapCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: fires.map(
      (f) =>
        ({
          type: "Feature",
          properties: {
            weight:
              f.riskLevel === "EXTREME"
                ? 1
                : f.riskLevel === "HIGH"
                  ? 0.75
                  : f.riskLevel === "MEDIUM"
                    ? 0.5
                    : 0.25,
          },
          geometry: { type: "Point", coordinates: [f.longitude, f.latitude] },
        }) as Feature<Point>,
    ),
  };

  const evacuationZoneCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: fires
      .filter((f) => f.riskLevel === "HIGH" || f.riskLevel === "EXTREME")
      .map(
        (f) =>
          circle([f.longitude, f.latitude], 10, {
            steps: 32,
            units: "kilometers",
            properties: {
              color: SEVERITY_COLORS[f.riskLevel.toLowerCase()] ?? "#DC2626",
            },
          }) as Feature,
      ),
  };

  const heatRadiusCollection: FeatureCollection = {
    type: "FeatureCollection",
    features: fires
      .filter((f) => f.riskLevel === "HIGH" || f.riskLevel === "EXTREME")
      .map(
        (f) =>
          circle([f.longitude, f.latitude], 2, {
            steps: 64,
            units: "kilometers",
            properties: { color: "#ef4444" },
          }) as Feature,
      ),
  };

  return (
    <>
      {/* ── Broadcast circles ───────────────────────────────────────────── */}
      {alertCircles.length > 0 && (
        <Source id="alert-circles" type="geojson" data={alertsCollection}>
          <Layer
            id="alert-circles-fill"
            type="fill"
            paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.2 }}
          />
          <Layer
            id="alert-circles-outline"
            type="line"
            paint={{ "line-color": ["get", "color"], "line-width": 2 }}
          />
        </Source>
      )}

      {/* ── Broadcast draft circle ──────────────────────────────────────── */}
      {draftFeature && (
        <Source
          id="draft-alert-circle"
          type="geojson"
          data={{ type: "FeatureCollection", features: [draftFeature] }}
        >
          <Layer
            id="draft-alert-circle-fill"
            type="fill"
            paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.15 }}
          />
          <Layer
            id="draft-alert-circle-outline"
            type="line"
            paint={{
              "line-color": ["get", "color"],
              "line-width": 2,
              "line-dasharray": [3, 2],
            }}
          />
        </Source>
      )}

      {/* ── Safe zone permanent circles ─────────────────────────────────── */}
      {safeZoneCircles.length > 0 && (
        <Source
          id="safe-zone-circles"
          type="geojson"
          data={safeZonesCollection}
        >
          <Layer
            id="safe-zone-circles-fill"
            type="fill"
            paint={{ "fill-color": SAFE_ZONE_GREEN, "fill-opacity": 0.12 }}
          />
          <Layer
            id="safe-zone-circles-outline"
            type="line"
            paint={{ "line-color": SAFE_ZONE_GREEN, "line-width": 2 }}
          />
        </Source>
      )}

      {/* ── Safe zone draft circle ──────────────────────────────────────── */}
      {safeZoneDraftFeature && (
        <Source
          id="draft-safe-zone-circle"
          type="geojson"
          data={{ type: "FeatureCollection", features: [safeZoneDraftFeature] }}
        >
          <Layer
            id="draft-safe-zone-circle-fill"
            type="fill"
            paint={{ "fill-color": SAFE_ZONE_GREEN, "fill-opacity": 0.15 }}
          />
          <Layer
            id="draft-safe-zone-circle-outline"
            type="line"
            paint={{
              "line-color": SAFE_ZONE_GREEN,
              "line-width": 2,
              "line-dasharray": [3, 2],
            }}
          />
        </Source>
      )}

      {/* ── Evacuation route ────────────────────────────────────────────── */}
      {routeGeoJSON && (
        <Source type="geojson" data={routeGeoJSON}>
          <Layer
            id="route"
            type="line"
            paint={{ "line-color": routeColor, "line-width": 5 }}
          />
          <Layer
            id="route-hover-hit"
            type="line"
            paint={{ "line-color": "rgba(0,0,0,0)", "line-width": 16 }}
          />
        </Source>
      )}

      {/* ── Sensor coverage ─────────────────────────────────────────────── */}
      {t?.sensorCoverage && sensors.length > 0 && (
        <Source
          id="sensor-coverage"
          type="geojson"
          data={sensorCoverageCollection}
        >
          <Layer
            id="sensor-coverage-fill"
            type="fill"
            paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.08 }}
          />
          <Layer
            id="sensor-coverage-outline"
            type="line"
            paint={{
              "line-color": ["get", "color"],
              "line-width": 1.5,
              "line-dasharray": [4, 2],
            }}
          />
        </Source>
      )}

      {/* ── Fire heatmap ────────────────────────────────────────────────── */}
      {t?.fireHeatmap && fires.length > 0 && (
        <Source id="fire-heatmap" type="geojson" data={fireHeatmapCollection}>
          <Layer
            id="fire-heatmap-layer"
            type="heatmap"
            paint={{
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "weight"],
                0,
                0,
                1,
                1,
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                1,
                12,
                3,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0,0,255,0)",
                0.2,
                "#FCD34D",
                0.4,
                "#FB923C",
                0.6,
                "#EF4444",
                0.8,
                "#DC2626",
                1,
                "#7F1D1D",
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                20,
                12,
                50,
              ],
              "heatmap-opacity": 0.75,
            }}
          />
        </Source>
      )}

      {/* ── Evacuation zones ────────────────────────────────────────────── */}
      {t?.evacuationZones && evacuationZoneCollection.features.length > 0 && (
        <Source
          id="evacuation-zones"
          type="geojson"
          data={evacuationZoneCollection}
        >
          <Layer
            id="evacuation-zones-fill"
            type="fill"
            paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.12 }}
          />
          <Layer
            id="evacuation-zones-outline"
            type="line"
            paint={{
              "line-color": ["get", "color"],
              "line-width": 2,
              "line-dasharray": [5, 3],
            }}
          />
        </Source>
      )}

      {/* ── Heat radius ─────────────────────────────────────────────────── */}
      {t?.heatRadius && heatRadiusCollection.features.length > 0 && (
        <Source id="heat-radius" type="geojson" data={heatRadiusCollection}>
          <Layer
            id="heat-radius-fill"
            type="fill"
            paint={{ "fill-color": "#ef4444", "fill-opacity": 0.25 }}
          />
          <Layer
            id="heat-radius-outline"
            type="line"
            paint={{ "line-color": "#dc2626", "line-width": 2 }}
          />
        </Source>
      )}

      {/* ── RainViewer weather radar ─────────────────────────────────────── */}
      {t?.liveWeather && radarTileUrl && (
        <Source
          id="rainviewer-radar"
          type="raster"
          tiles={[radarTileUrl]}
          tileSize={RV_SIZE}
          attribution='Radar © <a href="https://rainviewer.com" target="_blank">RainViewer</a>'
          minzoom={0}
          maxzoom={12}
        >
          <Layer
            id="rainviewer-radar-layer"
            type="raster"
            paint={{ "raster-opacity": 0.75 }}
          />
        </Source>
      )}

      {/* ── Custom GeoJSON overlay ───────────────────────────────────────── */}
      {customGeoJSON && (
        <Source id="custom-overlay" type="geojson" data={customGeoJSON}>
          <Layer
            id="custom-overlay-fill"
            type="fill"
            paint={{ "fill-color": "#6366f1", "fill-opacity": 0.2 }}
          />
          <Layer
            id="custom-overlay-outline"
            type="line"
            paint={{ "line-color": "#6366f1", "line-width": 2 }}
          />
        </Source>
      )}
    </>
  );
};

export default MapLayers;
