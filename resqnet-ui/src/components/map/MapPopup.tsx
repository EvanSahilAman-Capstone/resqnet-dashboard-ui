import React from 'react';
import { Popup } from 'react-map-gl/mapbox';
import type { PopupInfo } from './types';
import { getConfidenceLabel } from './constants';

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
          backgroundColor: 'white', borderRadius: '12px',
          padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      >
        {info.title === 'Evacuation Route' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor"
                style={{ width: 16, height: 16, color: '#EAB308' }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
              <span style={{ fontWeight: 600 }}>{info.details.split('|')[0]}</span>
            </div>
            <span style={{ color: '#D1D5DB' }}>•</span>
            <span>{getConfidenceLabel(Number(info.details.split('|')[0]))}</span>
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: 600, fontSize: '12px', color: '#111827', marginBottom: '2px' }}>
              {info.title}
            </p>
            <p style={{ fontSize: '11px', color: '#6B7280' }}>{info.details}</p>
          </div>
        )}
      </div>
    </Popup>
  );
};

export default MapPopup;
