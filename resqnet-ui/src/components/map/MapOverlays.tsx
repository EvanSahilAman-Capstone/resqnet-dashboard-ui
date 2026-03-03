import React from 'react';

interface MapOverlaysProps {
  isSelectingDestination: boolean;
}

const MapOverlays: React.FC<MapOverlaysProps> = ({ isSelectingDestination }) => (
  <>
    {isSelectingDestination && (
      <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-4 py-1.5 text-xs text-white shadow-lg z-50">
        Click map to set destination
      </div>
    )}
  </>
);

export default MapOverlays;
