import React from "react";

interface FireReportCardProps {
  report_id:      string;
  photo_links:    string[];
  hazard_type:    string;
  uploading_user: string;
  coordinates:    [number, number];
  severity:       "low" | "medium" | "high" | "critical";
  timestamp:      string;
  status?:        string;
}

const SEV_COLORS: Record<string, string> = {
  low:      "bg-yellow-100 text-yellow-800 border-yellow-300",
  medium:   "bg-orange-100 text-orange-800 border-orange-300",
  high:     "bg-red-100 text-red-800 border-red-300",
  critical: "bg-red-200 text-red-900 border-red-400",
};

const FireReportCard: React.FC<FireReportCardProps> = ({
  report_id,
  photo_links,
  hazard_type,
  uploading_user,
  coordinates,
  severity,
  timestamp,
  status,
}) => {
  const photo = photo_links?.[0] ?? "";

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="h-40 bg-gray-200 overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={`${hazard_type} report`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-mono">
            No image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 text-lg">
            {hazard_type.charAt(0).toUpperCase() + hazard_type.slice(1)}
          </h4>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${SEV_COLORS[severity] ?? SEV_COLORS.medium}`}>
            {severity.toUpperCase()}
          </span>
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-gray-600">
            <span className="font-semibold">Report ID:</span>{" "}
            <span className="font-mono text-xs">{report_id}</span>
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Reported by:</span> {uploading_user}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Location:</span>{" "}
            [{coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}]
          </p>
          {status && (
            <p className="text-gray-500 text-xs font-mono uppercase tracking-wider">
              Status: {status.replace(/_/g, " ")}
            </p>
          )}
          <p className="text-gray-400 text-xs">
            {new Date(timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FireReportCard;