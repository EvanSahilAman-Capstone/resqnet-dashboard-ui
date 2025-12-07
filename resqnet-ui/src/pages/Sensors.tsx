import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export interface Sensor {
    id: string;
    name: string;
    status: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'ERROR';
    latitude: number;
    longitude: number;
    health: number; // 0-100%
    temperature: number;
    humidity: number;
    battery: number; // 0-100%
    lastPing: string; // ISO timestamp
    containerId?: string; // Docker container reference
}

const Sensors: React.FC = () => {
    const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
    const [sensors, setSensors] = useState<Sensor[]>([]); 
    const [loading, setLoading] = useState(true);

    // Status colors for badges
    const getStatusColor = (status: Sensor['status']) => {
        switch (status) {
            case 'ONLINE': return 'bg-green-100 text-green-800';
            case 'WARNING': return 'bg-yellow-100 text-yellow-800';
            case 'OFFLINE': return 'bg-gray-100 text-gray-800';
            case 'ERROR': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Maps backend sensor data to UI sensor page
    const mapBackendToSensor = (backend: any): Sensor => {

        // Uses 'last seen' to determine if sensor is regularly sending data
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
            health: 100,                        // hardcoded for now
            temperature: Number(backend.temperature),
            humidity: backend.humidity,
            battery: 100,                       // hardcoded for now
            lastPing: new Date(backend.last_seen * 1000).toISOString(),
        };
    };

    useEffect(() => {
        const fetchSensors = async () => {
            try {
                const res = await fetch('http://localhost:8000/sensors');
                const data = await res.json();
                const mapped: Sensor[] = data.map(mapBackendToSensor);
                setSensors(mapped);

                setSelectedSensor(prev => {
                    if (prev) {
                        const updated = mapped.find(s => s.id === prev.id);
                        return updated ?? prev;
                    }

                    return mapped[0] ?? null;
                })
            } catch (err) {
                console.error('Failed to fetch sensors', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSensors();
        const interval = setInterval(fetchSensors, 10000);
        return () => clearInterval(interval);
    });

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-gray-50">
            {/* LEFT: Sensors List */}
            <div className="lg:w-1/3 w-full p-6 space-y-6 overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Wireless Sensors ({sensors.length})
                    </h2>
                    <Link 
                        to="/" 
                        className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {loading ? (
                    <div className="bg-white shadow-lg rounded-xl p-8 text-center">
                        <div className="text-4xl text-gray-400 mb-4">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Sensors...</h3>
                        </div>
                    </div>
                ) : sensors.length === 0 ? (
                    <div className="bg-white shadow-lg rounded-xl p-8 text-center">
                        <div className="text-4xl text-gray-400 mb-4">📡</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No Sensors Detected
                        </h3>
                        <p className="text-gray-500">
                            Backend will populate sensors here when they are running and connected.
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
                                        ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-lg">{sensor.name}</h4>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sensor.status)}`}>
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
                                    <div>🌡️ {sensor.temperature}°C</div>
                                    <div>💧 {sensor.humidity}%</div>
                                    <div>🔋 {sensor.battery}%</div>
                                    <div className="text-xs">
                                        {new Date(sensor.lastPing).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
            </div>

            {/* RIGHT: Selected Sensor Details */}
            <div className="lg:w-2/3 w-full p-6">
                {selectedSensor ? (
                    <div className="bg-white shadow-xl rounded-xl p-8 h-full flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    Sensor: {selectedSensor.name}
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedSensor.status)}`}>
                                    {selectedSensor.status}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-gray-900">
                                    {selectedSensor.health}%
                                </div>
                                <div className="text-lg text-gray-600">Health Score</div>
                            </div>
                        </div>

                        {/* Health Progress Bar */}
                        <div className="mb-8">
                            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                                <span>Health Status</span>
                                <span>{selectedSensor.health}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                    className={`h-3 rounded-full transition-all duration-300 ${
                                        selectedSensor.health > 75 ? 'bg-green-500' :
                                        selectedSensor.health > 50 ? 'bg-yellow-500' :
                                        selectedSensor.health > 25 ? 'bg-orange-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${selectedSensor.health}%` }}
                                />
                            </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">📍 Position</h4>
                                <div className="space-y-2 text-sm">
                                    <div>Latitude: <span className="font-mono">{selectedSensor.latitude.toFixed(6)}</span></div>
                                    <div>Longitude: <span className="font-mono">{selectedSensor.longitude.toFixed(6)}</span></div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">📊 Readings</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>🌡️ Temp: <span className="font-bold">{selectedSensor.temperature}°C</span></div>
                                    <div>💧 Humidity: <span className="font-bold">{selectedSensor.humidity}%</span></div>
                                    <div>🔋 Battery: <span className="font-bold">{selectedSensor.battery}%</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Last Ping & Container Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Last Ping</h4>
                                <p className="text-gray-600">
                                    {new Date(selectedSensor.lastPing).toLocaleString()}
                                </p>
                            </div>
                            {selectedSensor.containerId && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-2">Container</h4>
                                    <p className="text-gray-600 font-mono text-xs bg-gray-100 px-3 py-1 rounded">
                                        {selectedSensor.containerId}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white shadow-lg rounded-xl p-12 text-center h-full flex flex-col justify-center">
                        <div className="text-6xl text-gray-300 mb-6">📡</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            Select a Sensor
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Click any sensor from the list on the left to view detailed health metrics, 
                            position data, and live readings.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sensors;