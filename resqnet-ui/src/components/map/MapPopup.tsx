import React from "react";
import { Popup } from "react-map-gl/mapbox";
import { Star } from "lucide-react";
import type { PopupInfo } from "./types";
import { getConfidenceLabel } from "./constants";

interface MapPopupProps {
  info: PopupInfo | null;
  onClose: () => void;
}

const MapPopup: React.FC<MapPopupProps> = ({ info, onClose }) => {
  if (!info) return null;

  return (
    <Popup
      longitude={info.longitude}
      latitude={info.latitude}
      anchor="top"
      closeButton={false}
      closeOnClick={false}
      onClose={onClose}
      offset={20}
      className="custom-popup"
    >
      <div
        onMouseLeave={onClose}
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "8px 12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          border: "1px solid rgba(0,0,0,0.08)",
          minWidth: 160,
          maxWidth: 260,
        }}
      >
        {info.title === "Evacuation Route" ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "#374151",
            }}
          >
            <Star size={14} style={{ color: "#EAB308", flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>
              {info.details.split("|")[0]}
            </span>
            <span style={{ color: "#D1D5DB" }}>•</span>
            <span>
              {getConfidenceLabel(Number(info.details.split("|")[0]))}
            </span>
          </div>
        ) : (
          <div>
            <p
              style={{
                fontWeight: 700,
                fontSize: 12,
                color: "#111827",
                marginBottom: 3,
              }}
            >
              {info.title}
            </p>
            <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5 }}>
              {info.details}
            </p>
          </div>
        )}
      </div>
    </Popup>
  );
};

export default MapPopup;
