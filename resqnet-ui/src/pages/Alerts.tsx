import { useState, useEffect, useCallback } from "react";
import AlertCard from "../components/AlertCard";
import FireReportCard from "../components/FireReportCard";
import { useApi } from "../utils/api";

interface BroadcastAlert {
  _id?: string;
  message: string;
  radius: number;
  priority: string;
  coordinates: [number, number];
  timestamp: string;
}

interface FireReport {
  report_id: string;
  photo_link: string;
  hazard_type: string;
  uploading_user: string;
  coordinates: [number, number];
  severity: "low" | "medium" | "high";
  timestamp: string;
}

function Alerts() {
  const { fetchWithAuth } = useApi();
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([]);
  const [fireReports, setFireReports] = useState<FireReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchWithAuth("/broadcasts");
      console.log("Fetched alerts:", data);
      setAlerts(data.broadcasts || []);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  const fetchFireReports = useCallback(async () => {
    try {
      setReportsLoading(true);
      const data = await fetchWithAuth("/fires");
      console.log("Fetched fire reports:", data);
      setFireReports(data || []);
    } catch (err) {
      console.error("Failed to fetch fire reports:", err);
    } finally {
      setReportsLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchAlerts();
    fetchFireReports();
  }, [fetchAlerts, fetchFireReports]);

  const handleDelete = async (id: string) => {
    console.log("Deleting alert with ID:", id);

    try {
      const result = await fetchWithAuth(`/broadcasts/${id}`, {
        method: "DELETE",
      });

      console.log("Delete response:", result);
      setAlerts(alerts.filter((alert) => alert._id !== id));
      alert("Alert deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting alert");
    }
  };

  const handleUpdate = async (id: string, updatedAlert: BroadcastAlert) => {
    console.log("Updating alert with ID:", id);
    console.log("Updated data:", updatedAlert);

    try {
      const result = await fetchWithAuth(`/broadcasts/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          message: updatedAlert.message,
          radius: updatedAlert.radius,
          priority: updatedAlert.priority.toLowerCase(),
          coordinates: updatedAlert.coordinates,
          timestamp: updatedAlert.timestamp,
        }),
      });

      console.log("Update response:", result);
      setAlerts(
        alerts.map((alert) =>
          alert._id === id ? { ...result.broadcast, _id: id } : alert
        )
      );
      alert("Alert updated successfully");
    } catch (err) {
      console.error("Update error:", err);
      alert("Error updating alert");
    }
  };

  const handleDeleteReport = (reportId: string) => {
    if (confirm("Are you sure you want to delete this fire report?")) {
      setFireReports(
        fireReports.filter((report) => report.report_id !== reportId)
      );
      alert("Fire report deleted");
    }
  };

  const handleVerifyReport = (reportId: string) => {
    alert("Fire report validated!");
    console.log(reportId);
  };

  return (
    <main className="p-6 space-y-8 bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Broadcast Alerts Management
          </h1>

          {loading && <p className="text-gray-500">Loading alerts...</p>}

          {!loading && alerts.length === 0 && (
            <p className="text-gray-500">No broadcast alerts found.</p>
          )}

          {!loading && alerts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert._id}
                  alert={alert}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Fire Reports Verification
          </h1>

          {reportsLoading && (
            <p className="text-gray-500">Loading fire reports...</p>
          )}

          {!reportsLoading && fireReports.length === 0 && (
            <p className="text-gray-500">No fire reports found.</p>
          )}

          {!reportsLoading && fireReports.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fireReports.map((report) => (
                <div
                  key={report.report_id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden"
                >
                  <FireReportCard
                    report_id={report.report_id}
                    photo_link={report.photo_link}
                    hazard_type={report.hazard_type}
                    uploading_user={report.uploading_user}
                    coordinates={report.coordinates}
                    severity={report.severity}
                    timestamp={report.timestamp}
                  />

                  <div className="p-4 flex gap-2 border-t border-gray-200">
                    <button
                      onClick={() => handleVerifyReport(report.report_id)}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report.report_id)}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default Alerts;
