import React from "react";
import Map from "../components/Map";
import FireReportCard from "../components/FireReportCard";
import { useLocalData } from "../hooks/useLocalData.ts";
import type { BroadcastMessage } from "../components/BroadcastForm.tsx";
import BroadcastForm from "../components/BroadcastForm.tsx";

const Dashboard: React.FC = () => {
  const { fires, evacRoute, loading, setFires } = useLocalData();

  const handleBroadcast = async (data: BroadcastMessage) => {
    console.log('Broadcast: ', data);
    alert(`Broadcast sent: ${data.message}`);
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-gray-50">
      <div className="lg:w-1/3 w-full p-6 space-y-8 overflow-y-auto">

        {/* BROADCAST FORM COMPONENT */}
        <div className="bg-white shadow-lg rounded-xl p-6">
            <h3 className="text-2xl font-semibold text-red-700 mb-6">Broadcast Alert</h3>
            <BroadcastForm onSubmit={handleBroadcast} />
        </div>

        {/* LIVE STATUS SECTION */}
        <div className="bg-white shadow-lg rounded-xl p-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Live Status
          </h3>

          {loading && (
            <p className="text-gray-500">Loading fire reports...</p>
          )}

          {!loading && fires.length === 0 && (
            <p className="text-gray-500">No active fire reports.</p>
          )}

          {!loading && fires.length > 0 && (
            <div className="space-y-4">
              {fires.map((fire) => (
                <FireReportCard
                  key={fire.report_id}
                  report_id={fire.report_id}
                  photo_link={fire.photo_link}
                  hazard_type={fire.hazard_type}
                  uploading_user={fire.uploading_user}
                  coordinates={fire.coordinates}
                  severity={fire.severity}
                  timestamp={fire.timestamp}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAP COMPONENT */}
      <div className="lg:w-2/3 w-full p-6">
        <div className="bg-white w-full h-full rounded-xl shadow-xl p-1">
          <Map fires={fires} evacuationRoute={evacRoute} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
