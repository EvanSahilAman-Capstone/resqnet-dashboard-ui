// This page is JUST FOR POC to test if uploads work (mobile app is not complete as of now)
// Testing if /upload is working essentially

import React, { useState, useEffect, useRef } from "react";
import Map from "../components/map";
import { useLocalData } from "../hooks/useLocalData.ts";
import { useApi } from "../utils/api";
import { useBroadcastSocket } from "../hooks/useBroadcasts";
import type { BroadcastAlert, Sensor } from "../components/map/index.tsx";
import { useAuth0 } from "@auth0/auth0-react"; // If needed for upload

// Copy your exact normalizers from Dashboard
const normalizeBroadcast = (b: any): BroadcastAlert | null => {
  const raw = b?.details ?? b?.data ?? b;
  const id = raw._id || raw.id || raw.broadcast_id;
  const coords = raw.coordinates || raw.position;
  const priority = (
    raw.priority || "low"
  ).toUpperCase() as BroadcastAlert["priority"];
  if (!id || !coords) return null;
  return {
    id,
    position: coords as [number, number],
    radius: raw.radius || 1,
    priority,
    message: raw.message || "",
    timestamp: raw.timestamp || new Date().toISOString(),
    status: (raw.status || "ACTIVE") as BroadcastAlert["status"],
    description: raw.description ?? undefined,
    createdBy: raw.created_by ?? undefined,
    updatedBy: raw.updated_by ?? undefined,
    updatedAt: raw.updated_at ?? undefined,
    logs: raw.logs ?? [],
  };
};

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

const MobilePOC: React.FC = () => {
  const { fires, loading } = useLocalData() as any;
  const { fetchWithAuth } = useApi();
  const { isAuthenticated } = useAuth0();

  // Same Dashboard state
  const [broadcastAlerts, setBroadcastAlerts] = useState<BroadcastAlert[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [activeTab, setActiveTab] = useState<"map" | "upload">("map");
  const [hazardFile, setHazardFile] = useState<File | null>(null);
  const [hazardDesc, setHazardDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const cycleBroadcastsFn = useRef<() => void>(() => {});
  const cycleSensorsFn = useRef<() => void>(() => {});
  const flyToFn = useRef<(lat: number, lng: number) => void>(() => {});

  // Sensors + Broadcasts + WS
  useEffect(() => {
    let isMounted = true;
    const fetchSensors = async () => {
      try {
        const data = await fetchWithAuth("/sensors");
        const list = Array.isArray(data?.sensors) ? data.sensors : [];
        if (!isMounted) return;
        setSensors(list.map(mapBackendToSensor));
      } catch (err) {
        console.error("Sensors:", err);
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
        setBroadcastAlerts(
          list.map((b: any, idx: number) => ({
            id: b._id || b.id || `broadcast-${idx}`,
            position: b.coordinates || [44.5, -79.5],
            radius: b.radius || 1,
            priority: (
              b.priority || "low"
            ).toUpperCase() as BroadcastAlert["priority"],
            message: b.message,
            timestamp: b.timestamp || null,
            status: b.status || "ACTIVE",
          })),
        );
      } catch (err) {
        console.error("Broadcasts:", err);
      }
    };
    fetchBroadcasts();
    return () => {
      isMounted = false;
    };
  }, [fetchWithAuth]);

  useBroadcastSocket(
    (b) => {
      const alert = normalizeBroadcast(b);
      if (alert)
        setBroadcastAlerts((p) =>
          p.find((a) => a.id === alert.id) ? p : [...p, alert],
        );
    },
    (b) => {
      /* update logic */
    },
    (id) => setBroadcastAlerts((p) => p.filter((a) => a.id !== id)),
  );

  const wildfireEvents = fires.map((fire: any) => ({
    id: fire.report_id,
    latitude: fire.coordinates[0],
    longitude: fire.coordinates[1],
    riskLevel: fire.severity.toUpperCase() as any,
    message: `${fire.hazard_type} by ${fire.uploading_user}`,
  }));

const handleHazardSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!hazardFile || !hazardDesc) return alert('Complete form');

  setUploading(true);

  try {
    const reportId = `hazard-${Date.now()}`;
    
    // STEP 1
    const presignRes = await fetchWithAuth(
      `/reports/upload-url?report_id=${reportId}&hazard_type=fire`,
      { method: 'POST' }
    );
    const { upload_url: s3Url, form_fields: fields, final_photo_url } = presignRes;

    // STEP 2: fetch() instead of XHR
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, String(v)));
    fd.append('file', hazardFile);
    
    const s3Res = await fetch(s3Url, { 
      method: 'POST', 
      body: fd 
    });
    if (!s3Res.ok) throw new Error(`S3 ${s3Res.status}`);

    // STEP 3
    const reportData = {
      report_id: reportId,
      uploading_user: 'citizen-mobile-poc',
      hazard_type: 'fire',
      coordinates: [44.5, -79.5],
      photo_link: final_photo_url,
      severity: 'medium',
      timestamp: new Date().toISOString(),    
      verified: false                  
    };
    
    await fetchWithAuth('/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });

    alert(`✅ Success!\n${final_photo_url}`);
    setHazardFile(null); setHazardDesc(''); setActiveTab('map');

  } catch (err: any) {
    console.error(err);
    alert(`❌ ${err.message}`);
  } finally {
    setUploading(false);
  }
};

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-96 mx-auto">
        {/* Phone bezel */}
        <div className="relative bg-gradient-to-b from-slate-100 to-slate-200 border-8 border-slate-300 rounded-3xl shadow-2xl p-4 h-[750px] flex flex-col overflow-hidden">
          
          {/* Notch */}
          <div className="w-24 h-6 bg-slate-300 rounded-full mx-auto mb-4 -mt-2 shadow-lg"></div>

          {/* Status bar */}
          <div className="px-4 pb-2 text-xs text-slate-500 flex justify-between items-center mb-2">
            <span>9:41</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <div className="w-4 h-1 bg-slate-400 rounded-full"></div>
            </div>
          </div>

          {/* App header */}
          <div className="px-6 pb-4 border-b border-slate-200 mb-4">
            <h2 className="text-xl font-semibold text-slate-900">ResqNet</h2>
            <p className="text-xs text-slate-500">Safety Alerts</p>
          </div>

          {/* Tabs - clean underline */}
          <div className="flex px-6 mb-6">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'map'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('map')}
            >
              Map
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('upload')}
            >
              Report
            </button>
          </div>

          {/* Content - clean white */}
          <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm">
            {activeTab === 'map' && (
              <div className="h-full relative">
                <Map
                  fires={wildfireEvents}
                  broadcastAlerts={broadcastAlerts}
                  sensors={sensors}
                  onCycleBroadcastsRef={fn => (cycleBroadcastsFn.current = fn)}
                  onCycleSensorsRef={fn => (cycleSensorsFn.current = fn)}
                  onFlyToRef={fn => (flyToFn.current = fn)}
                />
                {/* Clean status footer */}
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-xl text-xs text-slate-600 border border-slate-200">
                  <div className="flex justify-between">
                    <span>Alerts: {broadcastAlerts.length}</span>
                    <span>Sensors: {sensors.length}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'upload' && (
              <form onSubmit={handleHazardSubmit} className="h-full flex flex-col p-6 space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setHazardFile(e.target.files?.[0] || null)}
                    disabled={uploading}
                    className="w-full p-4 border border-slate-300 rounded-xl text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-200"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={hazardDesc}
                    onChange={(e) => setHazardDesc(e.target.value)}
                    placeholder="What do you see? Smoke, flames, location..."
                    disabled={uploading}
                    className="w-full p-4 border border-slate-300 rounded-xl h-28 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400"
                    required
                  />
                </div>

                {uploading && (
                  <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-slate-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 text-center">
                      {uploadProgress}% Complete
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!hazardFile || !hazardDesc || uploading}
                  className="w-full bg-slate-900 text-white py-4 px-6 rounded-xl font-semibold text-sm shadow-sm hover:bg-slate-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 h-14"
                >
                  Send Report
                </button>
              </form>
            )}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-20 h-2 bg-slate-300 rounded-full mt-4"></div>
        </div>
      </div>
    </div>
  );
};

export default MobilePOC;
