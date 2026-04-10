import React, { useRef, useEffect, useState } from 'react';
import Map from '../components/map';
import type { BroadcastAlert, Sensor, SafeZone } from '../components/map/types';
import MapControls from '../components/MapControls';
import { useLocalData } from '../hooks/useLocalData';
import type { BroadcastMessage } from '../components/BroadcastForm';
import { useApi } from '../utils/api';
import IncidentsPanel from '../components/IncidentsPanel';
import SafeZonesPanel from '../components/SafeZonesPanel';
import { usePanels } from '../context/PanelContext';
import { useBroadcastSocket } from '../hooks/useBroadcasts';
import { useSafeZoneSocket } from '../hooks/useSafeZones';
import type { SafeZoneFormData } from '../components/SafeZoneForm';
import type { FireReport } from '../hooks/useLocalData';

const Dashboard: React.FC = () => {
  const { fires, evacRoute, setEvacRoute, refetchFires } = useLocalData() as any;
  const { fetchWithAuth } = useApi();
  const { openPanels, layerToggles, customOverlayFile } = usePanels();

  // ── Broadcast state ──────────────────────────────────────────────────────
  const [broadcastAlerts, setBroadcastAlerts]     = useState<BroadcastAlert[]>([]);
  const [sensors, setSensors]                     = useState<Sensor[]>([]);
  const [isPlacingAlert, setIsPlacingAlert]       = useState(false);
  const [pendingBroadcast, setPendingBroadcast]   = useState<BroadcastMessage | null>(null);
  const [broadcastLoading, setBroadcastLoading]   = useState(false);
  const [draftRadiusKm, setDraftRadiusKm]         = useState(1);
  const [alertCoordinates, setAlertCoordinates]   = useState<[number, number] | undefined>(undefined);
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastAlert | null>(null);

  // ── Safe Zone state ──────────────────────────────────────────────────────
  const [safeZones, setSafeZones]                 = useState<SafeZone[]>([]);
  const [isPlacingSafeZone, setIsPlacingSafeZone] = useState(false);
  const [pendingSafeZone, setPendingSafeZone]     = useState<SafeZoneFormData | null>(null);
  const [safeZoneLoading, setSafeZoneLoading]     = useState(false);
  const [safeZoneRadiusM, setSafeZoneRadiusM]     = useState(500);
  const [safeZoneCoords, setSafeZoneCoords]       = useState<[number, number] | undefined>(undefined);

  // ── Route / map state ────────────────────────────────────────────────────
  const [hasRoute, setHasRoute]                             = useState(false);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const [destinationPin, setDestinationPin]                 = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation]                     = useState<[number, number] | null>(null);
  const [routeSafetyScore, setRouteSafetyScore]             = useState<number | undefined>(undefined);

  // ── Map ref callbacks ────────────────────────────────────────────────────
  const cycleBroadcastsFn = useRef<() => void>(() => {});
  const cycleFiresFn      = useRef<() => void>(() => {});
  const cycleSensorsFn    = useRef<() => void>(() => {});
  const goToLocationFn    = useRef<() => void>(() => {});
  const flyToFn           = useRef<(lat: number, lng: number) => void>(() => {});

  const isBroadcastPanelOpen = openPanels.has('broadcast');

  useEffect(() => {
    const handler = () => refetchFires();
    window.addEventListener('fire-report-reviewed', handler);
    return () => window.removeEventListener('fire-report-reviewed', handler);
  }, [refetchFires]);

  const normalizeBroadcast = (b: any): BroadcastAlert | null => {
    const raw      = b?.details ?? b?.data ?? b;
    const id       = raw.id ?? raw.broadcast_id;
    const coords   = raw.coordinates ?? raw.position;
    const priority = (raw.priority ?? 'low').toUpperCase() as BroadcastAlert['priority'];
    if (!id || !coords) {
      console.warn('WS broadcast missing id or coords', raw);
      return null;
    }
    return {
      id,
      position:    coords as [number, number],
      radius:      raw.radius ?? 1,
      priority,
      message:     raw.message ?? '',
      timestamp:   raw.timestamp ?? new Date().toISOString(),
      status:      (raw.status ?? 'ACTIVE') as BroadcastAlert['status'],
      description: raw.description ?? undefined,
      createdBy:   raw.created_by ?? undefined,
      updatedBy:   raw.updated_by ?? undefined,
      updatedAt:   raw.updated_at ?? undefined,
      logs:        raw.logs ?? [],
    };
  };

  const mapBackendToSensor = (backend: any): Sensor => {
    const ageSec = Date.now() / 1000 - backend.last_seen;
    const status: Sensor['status'] = ageSec < 60 ? 'ONLINE' : ageSec < 300 ? 'WARNING' : 'OFFLINE';
    return {
      id:          backend.id,
      name:        backend.id,
      status,
      latitude:    Number(backend.lat),
      longitude:   Number(backend.lng),
      health:      100,
      temperature: Number(backend.temperature),
      humidity:    backend.humidity,
      battery:     100,
      lastPing:    new Date(backend.last_seen * 1000).toISOString(),
    };
  };

  useEffect(() => {
    let isMounted = true;
    const fetchSensors = async () => {
      try {
        const data = await fetchWithAuth('sensors');
        const list = Array.isArray(data?.sensors) ? data.sensors : [];
        if (!isMounted) return;
        setSensors(list.map(mapBackendToSensor));
      } catch (err) {
        console.error('Failed to fetch sensors', err);
      }
    };
    fetchSensors();
    const interval = setInterval(fetchSensors, 10000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [fetchWithAuth]);

  useEffect(() => {
    let isMounted = true;
    const fetchBroadcasts = async () => {
      try {
        const data = await fetchWithAuth('broadcasts');
        const list = Array.isArray(data?.broadcasts) ? data.broadcasts : [];
        if (!isMounted) return;
        setBroadcastAlerts(list.map((b: any, idx: number) => ({
          id:          b.id ?? `broadcast-${idx}`,
          position:    b.coordinates ?? [44.5, -79.5],
          radius:      b.radius ?? 1,
          priority:    (b.priority ?? 'low').toUpperCase() as BroadcastAlert['priority'],
          message:     b.message,
          timestamp:   b.timestamp ?? null,
          status:      b.status ?? 'ACTIVE',
          description: b.description ?? undefined,
          createdBy:   b.created_by ?? undefined,
          updatedBy:   b.updated_by ?? undefined,
          updatedAt:   b.updated_at ?? undefined,
          logs:        b.logs ?? [],
        })));
      } catch (err) {
        console.error('Failed to fetch broadcasts', err);
      }
    };
    fetchBroadcasts();
    return () => { isMounted = false; };
  }, [fetchWithAuth]);

  useEffect(() => {
    let isMounted = true;
    const fetchSafeZones = async () => {
      try {
        const data = await fetchWithAuth('safe-zones');
        const list = Array.isArray(data?.safe_zones) ? data.safe_zones : [];
        if (!isMounted) return;
        setSafeZones(list);
      } catch (err: any) {
        if (!err?.message?.includes('404')) {
          console.error('Failed to fetch safe zones', err);
        }
      }
    };
    fetchSafeZones();
    return () => { isMounted = false; };
  }, [fetchWithAuth]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn('Could not get user location', err.message),
    );
  }, []);

  useBroadcastSocket(
    (b) => {
      const alert = normalizeBroadcast(b);
      if (!alert) return;
      setBroadcastAlerts((prev) =>
        prev.find((a) => a.id === alert.id) ? prev : [...prev, alert],
      );
    },
    (b) => {
      const raw = b?.details ?? b?.data ?? b;
      const id  = raw.id ?? raw.broadcast_id;
      if (!id) return;
      setBroadcastAlerts((prev) =>
        prev.map((a) => a.id !== id ? a : {
          ...a,
          message:  raw.message ?? a.message,
          radius:   raw.radius ?? a.radius,
          priority: raw.priority
            ? (raw.priority as string).toUpperCase() as BroadcastAlert['priority']
            : a.priority,
          status: raw.status ?? a.status,
        }),
      );
      setSelectedBroadcast((prev) => {
        if (!prev || prev.id !== id) return prev;
        return {
          ...prev,
          message:  raw.message ?? prev.message,
          radius:   raw.radius ?? prev.radius,
          priority: raw.priority
            ? (raw.priority as string).toUpperCase() as BroadcastAlert['priority']
            : prev.priority,
          status: (raw.status ?? prev.status) as BroadcastAlert['status'],
        } satisfies BroadcastAlert;
      });
    },
    (id) => {
      setBroadcastAlerts((prev) => prev.filter((a) => a.id !== id));
      setSelectedBroadcast((prev) => (prev?.id === id ? null : prev));
    },
  );

  useSafeZoneSocket({
    onCreated: (z) =>
      setSafeZones((prev) =>
        prev.find((s) => s.safe_zone_id === z.safe_zone_id) ? prev : [...prev, z],
      ),
    onUpdated: (z) =>
      setSafeZones((prev) =>
        prev.map((s) => (s.safe_zone_id === z.safe_zone_id ? z : s)),
      ),
    onDeleted: (id) =>
      setSafeZones((prev) => prev.filter((s) => s.safe_zone_id !== id)),
  });

  const handleBroadcastDraftChange = (draft: BroadcastMessage) => {
    setPendingBroadcast(draft);
    setDraftRadiusKm(draft.radius);
  };

  const handleBroadcast = (data: BroadcastMessage) => {
    setPendingBroadcast(data);
    setDraftRadiusKm(data.radius);
    setIsPlacingAlert(true);
    setAlertCoordinates(undefined);
  };

  const handleCancelBroadcast = () => {
    setIsPlacingAlert(false);
    setPendingBroadcast(null);
    setAlertCoordinates(undefined);
  };

  const handleBroadcastSaved = (updated: BroadcastAlert) =>
    setBroadcastAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

  const handleBroadcastDeleted = (id: string) =>
    setBroadcastAlerts((prev) => prev.filter((a) => a.id !== id));

  const handleSafeZoneActivate = (data: SafeZoneFormData) => {
    setPendingSafeZone(data);
    setSafeZoneRadiusM(data.radius_m);
    setIsPlacingSafeZone(true);
    setSafeZoneCoords(undefined);
  };

  const handleCancelSafeZone = () => {
    setIsPlacingSafeZone(false);
    setPendingSafeZone(null);
    setSafeZoneCoords(undefined);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (isPlacingAlert && pendingBroadcast) {
      const coords: [number, number] = [lat, lng];
      setAlertCoordinates(coords);
      setIsPlacingAlert(false);
      setBroadcastLoading(true);
      try {
        const result = await fetchWithAuth('broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...pendingBroadcast,
            radius: draftRadiusKm,
            coordinates: coords,
            priority: pendingBroadcast.priority.toLowerCase(),
          }),
        });
        setBroadcastAlerts((prev) => [
          ...prev,
          {
            id: result.broadcast_id,
            position: coords,
            radius: draftRadiusKm,
            priority: pendingBroadcast.priority,
            message: pendingBroadcast.message,
            timestamp: new Date().toISOString(),
            status: 'ACTIVE',
            logs: [],
          },
        ]);
      } catch (err) {
        console.error('Broadcast error', err);
        window.alert('Error sending broadcast');
      } finally {
        setPendingBroadcast(null);
        setBroadcastLoading(false);
      }
      return;
    }

    if (isPlacingSafeZone && pendingSafeZone) {
      const coords: [number, number] = [lat, lng];
      setSafeZoneCoords(coords);
      setIsPlacingSafeZone(false);
      setSafeZoneLoading(true);
      try {
        await fetchWithAuth('safe-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...pendingSafeZone,
            coordinates: [lng, lat],
            radius_m: safeZoneRadiusM,
          }),
        });
      } catch (err) {
        console.error('Safe zone error', err);
        window.alert('Error creating safe zone');
      } finally {
        setPendingSafeZone(null);
        setSafeZoneLoading(false);
      }
      return;
    }
  };

  const handleStartDestinationSelection = () => setIsSelectingDestination(true);

  const handleSelectDestinationOnMap = (lat: number, lng: number) => {
    setIsSelectingDestination(false);
    setDestinationPin([lat, lng]);
  };

  const handleRequestRouteFromPinned = async () => {
    if (!destinationPin) { window.alert('Please select a destination first.'); return; }
    if (!userLocation)   { window.alert('User location not available yet.'); return; }
    try {
      const result = await fetchWithAuth('api/routing/evacuation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: userLocation, destination: destinationPin }),
      });
      setEvacRoute(result.route);
      setHasRoute(true);
      setRouteSafetyScore(result.safety_score);
    } catch (err) {
      console.error('Evacuation route error', err);
      window.alert('Could not calculate evacuation route');
    }
  };

  const handleCancelRoute = () => {
    setEvacRoute([]);
    setDestinationPin(null);
    setHasRoute(false);
    setIsSelectingDestination(false);
    setRouteSafetyScore(undefined);
  };

  const safeFireReports: FireReport[] = (fires as FireReport[]).filter((fire) => {
    const lng = fire.coordinates?.[0];
    const lat = fire.coordinates?.[1];
    return (
      typeof lng === 'number' && typeof lat === 'number' &&
      !isNaN(lng) && !isNaN(lat) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    );
  });

  return (
    <div className="h-screen w-full">
      <div className="relative h-full w-full">
        <IncidentsPanel onFlyTo={(lat, lng) => flyToFn.current(lat, lng)} />

        <SafeZonesPanel
          zones={safeZones}
          isPlacingSafeZone={isPlacingSafeZone}
          safeZoneLoading={safeZoneLoading}
          safeZoneRadiusM={safeZoneRadiusM}
          safeZoneCoords={safeZoneCoords}
          onSafeZoneActivate={handleSafeZoneActivate}
          onSafeZoneCancelPlace={handleCancelSafeZone}
          onSafeZoneRadiusChange={setSafeZoneRadiusM}
          onFlyTo={(lat, lng) => flyToFn.current(lat, lng)}
        />

        <Map
          fires={[]}
          fireReports={safeFireReports}
          evacuationRoute={evacRoute}
          evacuationSafetyScore={routeSafetyScore}
          broadcastAlerts={broadcastAlerts}
          sensors={sensors}
          safeZones={safeZones}
          onMapClick={handleMapClick}
          isPlacingAlert={isPlacingAlert}
          isPlacingSafeZone={isPlacingSafeZone}
          safeZoneRadiusM={safeZoneRadiusM}
          isBroadcastPanelOpen={isBroadcastPanelOpen}
          draftRadiusKm={draftRadiusKm}
          draftPriority={pendingBroadcast?.priority ?? 'LOW'}
          onStartDestinationSelection={handleStartDestinationSelection}
          onSelectDestinationOnMap={handleSelectDestinationOnMap}
          onRequestRouteFromPinned={handleRequestRouteFromPinned}
          onCancelRoute={handleCancelRoute}
          hasActiveRoute={hasRoute}
          isSelectingDestination={isSelectingDestination}
          destinationPin={destinationPin}
          onCycleBroadcastsRef={(fn) => { cycleBroadcastsFn.current = fn; }}
          onCycleFiresRef={(fn) => { cycleFiresFn.current = fn; }}
          onCycleSensorsRef={(fn) => { cycleSensorsFn.current = fn; }}
          onGoToLocationRef={(fn) => { goToLocationFn.current = fn; }}
          onFlyToRef={(fn) => { flyToFn.current = fn; }}
          onDraftRadiusChange={(r) => {
            setDraftRadiusKm(r);
            setPendingBroadcast((prev) => (prev ? { ...prev, radius: r } : prev));
          }}
          onBroadcastDetail={(a) => setSelectedBroadcast(a)}
          layerToggles={layerToggles}
          customOverlayFile={customOverlayFile}
        />

        <MapControls
          fires={safeFireReports}
          isPlacingAlert={isPlacingAlert}
          broadcastAlerts={broadcastAlerts}
          safeZones={safeZones}
          sensorCount={sensors.length}
          onBroadcastSubmit={handleBroadcast}
          onBroadcastChange={handleBroadcastDraftChange}
          onBroadcastCancel={handleCancelBroadcast}
          broadcastLoading={broadcastLoading}
          liveRadiusKm={draftRadiusKm}
          onRadiusChange={(r) => {
            setDraftRadiusKm(r);
            setPendingBroadcast((prev) => (prev ? { ...prev, radius: r } : prev));
          }}
          onCycleBroadcasts={() => cycleBroadcastsFn.current?.()}
          onCycleFires={() => cycleFiresFn.current?.()}
          onCycleSensors={() => cycleSensorsFn.current?.()}
          onGoToLocation={() => goToLocationFn.current?.()}
          onFlyTo={(lat, lng) => flyToFn.current(lat, lng)}
          alertCoordinates={alertCoordinates}
          selectedBroadcast={selectedBroadcast}
          onDetailClose={() => setSelectedBroadcast(null)}
          onBroadcastSaved={handleBroadcastSaved}
          onBroadcastDeleted={handleBroadcastDeleted}
          isPlacingSafeZone={isPlacingSafeZone}
          safeZoneLoading={safeZoneLoading}
          safeZoneRadiusM={safeZoneRadiusM}
          safeZoneCoords={safeZoneCoords}
          onSafeZoneActivate={handleSafeZoneActivate}
          onSafeZoneCancelPlace={handleCancelSafeZone}
          onSafeZoneRadiusChange={setSafeZoneRadiusM}
        />
      </div>
    </div>
  );
};

export default Dashboard;