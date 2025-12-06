import React, { useState, useEffect } from "react";
import AlertCard from "../components/AlertCard";

interface BroadcastAlert {
  _id?: string;
  message: string;
  radius: number;
  priority: string;
  coordinates: [number, number];
  timestamp: string;
}

function Alerts() {
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch alerts from backend
  const fetchAlerts = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/broadcasts");
      const data = await res.json();
      console.log("Fetched alerts:", data); // Debug log
      setAlerts(data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Delete alert
  const handleDelete = async (id: string) => {
    console.log("Deleting alert with ID:", id); // Debug log
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/broadcasts/${id}`, {
        method: "DELETE",
      });

      const result = await res.json();
      console.log("Delete response:", result); // Debug log

      if (res.ok) {
        setAlerts(alerts.filter((alert) => alert._id !== id));
        alert("Alert deleted successfully");
      } else {
        alert(`Failed to delete alert: ${result.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting alert");
    }
  };

  // Update alert
  const handleUpdate = async (id: string, updatedAlert: BroadcastAlert) => {
    console.log("Updating alert with ID:", id); // Debug log
    console.log("Updated data:", updatedAlert); // Debug log
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/broadcasts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: updatedAlert.message,
          radius: updatedAlert.radius,
          priority: updatedAlert.priority.toLowerCase(),
          coordinates: updatedAlert.coordinates,
          timestamp: updatedAlert.timestamp,
        }),
      });

      const result = await res.json();
      console.log("Update response:", result); // Debug log

      if (res.ok) {
        setAlerts(
          alerts.map((alert) =>
            alert._id === id ? { ...result.broadcast, _id: id } : alert
          )
        );
        alert("Alert updated successfully");
      } else {
        alert(`Failed to update alert: ${result.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Error updating alert");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
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
    </main>
  );
}

export default Alerts;
