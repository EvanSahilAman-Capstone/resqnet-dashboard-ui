import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { type MapRef, type ViewStateChangeEvent } from 'react-map-gl/mapbox';
import type { Map as MapboxMap, MapMouseEvent } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation, Check, X } from 'lucide-react';

import MapMarkers from './MapMarkers';
import MapLayers from './MapLayers';
import MapPopup from './MapPopup';
import MapStylePicker from './MapStylePicker';
import MapRoutingBar from './MapRoutingBar';
import MapOverlays from './MapOverlays';
import { MAP_STYLES } from './constants';
import type { MapProps, PopupInfo } from './types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const MapCore: React.FC<MapProps> = ({
  fires,
  evacuationRoute,
  evacuationSafetyScore,
  broadcastAlerts = [],
  sensors = [],
  onMapClick,
  isPlacingAlert = false,
  isBroadcastPanelOpen = false,
  draftRadiusKm = 1,
  draftPriority = 'LOW',
  onStartDestinationSelection,
  onSelectDestinationOnMap,
  onRequestRouteFromPinned,
  onCancelRoute,
  hasActiveRoute = false,
  isSelectingDestination = false,
  destinationPin = null,
  onCycleBroadcastsRef,
  onCycleFiresRef,
  onCycleSensorsRef,
  onGoToLocationRef,
  onFlyToRef,
}) => {
  const mapRef     = useRef<MapRef | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const isPlacingRef      = useRef(isPlacingAlert);
  const isBroadcastRef    = useRef(isBroadcastPanelOpen);
  const pendingRef        = useRef(false);
  const internalRadiusRef = useRef(draftRadiusKm);
  const mapLoadedRef      = useRef(false);

  const [viewState, setViewState]               = useState({ longitude: -79.5, latitude: 44.5, zoom: 10 });
  const [userLocation, setUserLocation]         = useState<[number, number] | null>(null);
  const [initialUserLocation, setInitialUserLocation] = useState<[number, number] | null>(null);
  const [popupInfo, setPopupInfo]               = useState<PopupInfo | null>(null);
  const [mousePosition, setMousePosition]       = useState<[number, number] | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<{
    lngLat: [number, number];
    screen: { x: number; y: number };
  } | null>(null);

  const [broadcastIndex, setBroadcastIndex]   = useState(0);
  const [fireIndex, setFireIndex]             = useState(0);
  const [sensorIndex, setSensorIndex]         = useState(0);
  const [searchInput, setSearchInput]         = useState('');
  const [activeStyleId, setActiveStyleId]     = useState('streets');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [internalRadius, setInternalRadius]   = useState(draftRadiusKm);

  const activeStyle = MAP_STYLES.find((s) => s.id === activeStyleId)!;

  useEffect(() => { isPlacingRef.current = isPlacingAlert; }, [isPlacingAlert]);
  useEffect(() => { isBroadcastRef.current = isBroadcastPanelOpen; }, [isBroadcastPanelOpen]);
  useEffect(() => {
    internalRadiusRef.current = draftRadiusKm;
    setInternalRadius(draftRadiusKm);
  }, [draftRadiusKm]);

  useEffect(() => {
    if (!isPlacingAlert) {
      setPendingPlacement(null);
      pendingRef.current = false;
    }
    if (!isPlacingAlert && !isBroadcastPanelOpen) {
      setMousePosition(null);
    }
  }, [isPlacingAlert, isBroadcastPanelOpen]);

  // ── Native click handler ─────────────────────────────────────
  const handleNativeClick = useCallback((e: MapMouseEvent) => {
    if (!isPlacingRef.current) return;

    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map) return;

    const { lng, lat } = e.lngLat;

    const center = map.project([lng, lat]);
    const metersPerPx = 156543.03392 * Math.cos((lat * Math.PI) / 180)
      / Math.pow(2, map.getZoom());
    const radiusPx = (internalRadiusRef.current * 1000) / metersPerPx;
    const wrapper = wrapperRef.current;
    const rect = wrapper?.getBoundingClientRect();
    const screenX = (rect?.left ?? 0) + center.x + radiusPx * 0.707;
    const screenY = (rect?.top  ?? 0) + center.y - radiusPx * 0.707;

    pendingRef.current = true;
    setPendingPlacement({
      lngLat: [lng, lat],
      screen: { x: screenX, y: screenY },
    });
  }, []);

  // ── Native mousemove handler ─────────────────────────────────
  const handleNativeMouseMove = useCallback((e: MapMouseEvent) => {
    if ((!isPlacingRef.current && !isBroadcastRef.current) || pendingRef.current) return;
    setMousePosition([e.lngLat.lng, e.lngLat.lat]);
  }, []);

  // ── Bind listeners after map loads ──────────────────────────
  const bindMapListeners = useCallback(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map) return;
    map.off('click',     handleNativeClick);
    map.off('mousemove', handleNativeMouseMove);
    map.on('click',      handleNativeClick);
    map.on('mousemove',  handleNativeMouseMove);
  }, [handleNativeClick, handleNativeMouseMove]);

  // ── 3D Terrain ───────────────────────────────────────────────
  const apply3DTerrain = (map: MapboxMap, enable: boolean) => {
    if (enable) {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      if (map.getSource('composite') && !map.getLayer('3d-buildings')) {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12, 0, 12.05, ['get', 'height']],
            'fill-extrusion-base':   ['interpolate', ['linear'], ['zoom'], 12, 0, 12.05, ['get', 'min_height']],
            'fill-extrusion-opacity': 0.8,
          },
        });
      }
      map.easeTo({ pitch: 60, bearing: -20, duration: 800 });
    } else {
      map.setTerrain(null);
      if (map.getLayer('3d-buildings')) map.removeLayer('3d-buildings');
      if (map.getSource('mapbox-dem'))  map.removeSource('mapbox-dem');
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
  };

  useEffect(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map) return;
    const applyWhenReady = () => {
      apply3DTerrain(map, activeStyleId === '3d');
      bindMapListeners();
    };
    map.once('style.load', applyWhenReady);
    if (map.isStyleLoaded()) applyWhenReady();
    return () => { map.off('style.load', applyWhenReady); };
  }, [activeStyleId, bindMapListeners]);

  // ── Cursor management ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (!map || !mapLoadedRef.current) return;
    if (isPlacingAlert && !pendingPlacement) {
      map.getCanvas().style.cursor = 'crosshair';
    } else if (isSelectingDestination) {
      map.getCanvas().style.cursor = 'pointer';
    } else {
      map.getCanvas().style.cursor = '';
    }
  }, [isPlacingAlert, pendingPlacement, isSelectingDestination]);

  useEffect(() => {
    setSearchInput(
      destinationPin
        ? `${destinationPin[0].toFixed(6)}, ${destinationPin[1].toFixed(6)}`
        : ''
    );
  }, [destinationPin]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserLocation(coords);
        setInitialUserLocation(coords);
        setViewState({ longitude: coords[0], latitude: coords[1], zoom: 10 });
      },
      (err) => console.warn('Geolocation failed:', err.message)
    );
  }, []);

  const flyTo = (lng: number, lat: number, zoom = 12) =>
    mapRef.current?.flyTo({ center: [lng, lat], zoom, essential: true });

  const goToUserLocation = useCallback(() => {
    const loc = userLocation ?? initialUserLocation;
    if (loc) flyTo(loc[0], loc[1], 12);
  }, [userLocation, initialUserLocation]);

  useEffect(() => {
    onCycleBroadcastsRef?.(() => {
      if (!broadcastAlerts.length) return;
      const idx = broadcastIndex % broadcastAlerts.length;
      flyTo(broadcastAlerts[idx].position[1], broadcastAlerts[idx].position[0]);
      setBroadcastIndex((p) => p + 1);
    });
    onCycleFiresRef?.(() => {
      if (!fires.length) return;
      const idx = fireIndex % fires.length;
      flyTo(fires[idx].longitude, fires[idx].latitude);
      setFireIndex((p) => p + 1);
    });
    onCycleSensorsRef?.(() => {
      if (!sensors.length) return;
      const idx = sensorIndex % sensors.length;
      flyTo(sensors[idx].longitude, sensors[idx].latitude);
      setSensorIndex((p) => p + 1);
    });
    onGoToLocationRef?.(goToUserLocation);
    onFlyToRef?.((lat, lng) => flyTo(lng, lat));
  }, [broadcastAlerts, fires, sensors, userLocation, goToUserLocation]);

  return (
    <div ref={wrapperRef} className="w-full h-full rounded-xl shadow-inner relative">
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        onLoad={() => {
          mapLoadedRef.current = true;
          bindMapListeners();
        }}
        onClick={(e) => {
          if (isSelectingDestination && onSelectDestinationOnMap) {
            onSelectDestinationOnMap(e.lngLat.lat, e.lngLat.lng);
          }
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={activeStyle.url}
        style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
        ref={mapRef}
      >
        <MapMarkers
          fires={fires}
          sensors={sensors}
          broadcastAlerts={broadcastAlerts}
          userLocation={userLocation}
          destinationPin={destinationPin}
          onPopup={setPopupInfo}
        />
        <MapLayers
          broadcastAlerts={broadcastAlerts}
          evacuationRoute={evacuationRoute}
          evacuationSafetyScore={evacuationSafetyScore}
          mousePosition={pendingPlacement ? pendingPlacement.lngLat : mousePosition}
          draftRadiusKm={internalRadius}
          draftPriority={draftPriority}
          showDraftCircle={isBroadcastPanelOpen || isPlacingAlert}
        />
        <MapPopup info={popupInfo} onClose={() => setPopupInfo(null)} />
      </Map>

      <MapOverlays isSelectingDestination={isSelectingDestination} />

      <MapRoutingBar
        searchInput={searchInput}
        hasActiveRoute={hasActiveRoute}
        destinationPin={destinationPin}
        onStartDestinationSelection={onStartDestinationSelection}
        onRequestRoute={onRequestRouteFromPinned}
        onCancelRoute={onCancelRoute}
      />

      {/* ── Radius HUD ── */}
      {(isBroadcastPanelOpen || isPlacingAlert) && !pendingPlacement && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-black/70 text-white text-xs font-mono px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            ⌀ {(internalRadius * 2).toFixed(1)} km diameter
          </div>
        </div>
      )}

      {/* ── ✓ / ✕ — monochrome, at circle top-right edge ── */}
      {pendingPlacement && (
        <div
          className="fixed z-[9999] flex gap-2"
          style={{
            left: pendingPlacement.screen.x,
            top:  pendingPlacement.screen.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* ✕ */}
          <button
            type="button"
            onClick={() => {
              setPendingPlacement(null);
              pendingRef.current = false;
              setMousePosition(null);
            }}
            className="w-10 h-10 rounded-full bg-white border-2 border-gray-900 text-gray-900 flex items-center justify-center hover:bg-gray-100 transition-colors shadow-xl"
            title="Cancel"
          >
            <X size={16} />
          </button>
          {/* ✓ */}
          <button
            type="button"
            onClick={() => {
              if (onMapClick) {
                onMapClick(pendingPlacement.lngLat[1], pendingPlacement.lngLat[0]);
              }
              setPendingPlacement(null);
              pendingRef.current = false;
              setMousePosition(null);
            }}
            className="w-10 h-10 rounded-full bg-gray-900 border-2 border-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors shadow-xl"
            title="Confirm"
          >
            <Check size={16} />
          </button>
        </div>
      )}

      {/* Bottom-right controls */}
      <div className="absolute bottom-4 right-4 z-50 flex flex-col items-center gap-2">
        <MapStylePicker
          activeStyleId={activeStyleId}
          showPicker={showStylePicker}
          onToggle={() => setShowStylePicker((p) => !p)}
          onSelect={(id) => { setActiveStyleId(id); setShowStylePicker(false); }}
        />
        <button
          type="button"
          onClick={goToUserLocation}
          title="Go to my location"
          className="w-10 h-10 rounded-full bg-white text-black shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Navigation size={18} />
        </button>
      </div>
    </div>
  );
};

export default MapCore;
