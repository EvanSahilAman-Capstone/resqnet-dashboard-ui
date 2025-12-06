import React, { useState } from "react";

interface AlertCardProps {
  alert: {
    _id?: string;
    message: string;
    radius: number;
    priority: string;
    coordinates: [number, number];
    timestamp: string;
  };
  onDelete: (id: string) => void;
  onUpdate: (id: string, updatedAlert: any) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(alert);

  // Priority color mapping
  const priorityColors: Record<string, string> = {
    low: "bg-yellow-100 text-yellow-800 border-yellow-300",
    medium: "bg-orange-100 text-orange-800 border-orange-300",
    high: "bg-red-100 text-red-800 border-red-300",
    urgent: "bg-red-200 text-red-900 border-red-400",
  };

  const handleSave = () => {
    if (!alert._id) return;
    onUpdate(alert._id, editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm(alert);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!alert._id) return;
    if (confirm("Are you sure you want to delete this alert?")) {
      onDelete(alert._id);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-5 space-y-3">
      {isEditing ? (
        // Edit mode
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={editForm.message}
              onChange={(e) =>
                setEditForm({ ...editForm, message: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Radius (km)
            </label>
            <input
              type="number"
              value={editForm.radius}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  radius: Number(e.target.value),
                })
              }
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={editForm.priority}
              onChange={(e) =>
                setEditForm({ ...editForm, priority: e.target.value })
              }
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-500 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <>
          <div className="flex items-start justify-between">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                priorityColors[alert.priority.toLowerCase()] ||
                priorityColors.medium
              }`}
            >
              {alert.priority.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(alert.timestamp).toLocaleDateString()}
            </span>
          </div>

          <p className="text-gray-800 font-medium">{alert.message}</p>

          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-semibold">Radius:</span> {alert.radius} km
            </p>
            <p>
              <span className="font-semibold">Location:</span> [
              {alert.coordinates[0].toFixed(3)},{" "}
              {alert.coordinates[1].toFixed(3)}]
            </p>
            <p className="text-xs text-gray-400">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AlertCard;
