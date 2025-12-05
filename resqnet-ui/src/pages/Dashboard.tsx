import React from 'react';
import Map from '../components/Map'; 
import { useLocalData } from '../hooks/useLocalData.ts';

const Dashboard: React.FC = () => {
    const { fires, evacRoute, loading, setFires } = useLocalData;
    
    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-gray-50">
            {/* LEFT: Control Panel */}
            <div className="lg:w-1/3 w-full p-6 space-y-8 overflow-y-auto">
                <h2 className="text-3xl font-extrabold text-gray-900 border-b pb-2 text-center">First Responder Dashboard</h2>

                <div className="bg-white shadow-lg rounded-xl p-6 h-1/3">
                    <h3 className="text-2xl font-semibold text-red-700 mb-4">Publish Route</h3>
                    <p className="text-gray-500">Backend form goes here</p>
                </div>

                <div className="bg-white shadow-lg rounded-xl p-6 h-1/2">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                        Live Status
                    </h3>
                    <p className="text-gray-500">Backend data (fire events etc.) will appear here.</p>
                </div>
            </div>

            {/* RIGHT: Map */}
            <div className="lg:w-2/3 w-full p-6">
                <div className="bg-white w-full h-full rounded-xl shadow-xl p-1">
                    <Map fires={fires} evacuationRoute={evacRoute} />
                </div>
            </div>
        </div>
    )
}

export default Dashboard;