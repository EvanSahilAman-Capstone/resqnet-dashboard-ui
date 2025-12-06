import React from "react";

interface FireReportCardProps {
  report_id: string;
  photo_link: string;
  hazard_type: string;
  uploading_user: string;
  coordinates: [number, number];
  severity: "low" | "medium" | "high";
  timestamp: string;
}

const FireReportCard: React.FC<FireReportCardProps> = ({
  report_id,
  photo_link,
  hazard_type,
  uploading_user,
  coordinates,
  severity,
  timestamp,
}) => {
  // Color coding based on severity
  const severityColors = {
    low: "bg-yellow-100 text-yellow-800 border-yellow-300",
    medium: "bg-orange-100 text-orange-800 border-orange-300",
    high: "bg-red-100 text-red-800 border-red-300",
  };

  const severityBadge = severityColors[severity];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image Section */}
      <div className="h-40 bg-gray-200 overflow-hidden">
        <img
          src={photo_link}
          alt={`${hazard_type} report`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.src = "https://via.placeholder.com/400x300?text=Fire+Image";
          }}
        />
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-2">
        {/* Header with severity badge */}
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 text-lg">
            {hazard_type.charAt(0).toUpperCase() + hazard_type.slice(1)}
          </h4>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${severityBadge}`}>
            {severity.toUpperCase()}
          </span>
        </div>

        {/* Report details */}
        <div className="space-y-1 text-sm">
          <p className="text-gray-600">
            <span className="font-semibold">Report ID:</span> {report_id}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Reported by:</span> {uploading_user}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Location:</span> [{coordinates[0].toFixed(3)}, {coordinates[1].toFixed(3)}]
          </p>
          <p className="text-gray-500 text-xs">
            {new Date(timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FireReportCard;
