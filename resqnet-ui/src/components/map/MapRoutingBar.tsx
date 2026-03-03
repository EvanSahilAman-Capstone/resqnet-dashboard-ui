import React from 'react';

interface MapRoutingBarProps {
  searchInput: string;
  hasActiveRoute: boolean;
  destinationPin: [number, number] | null;
  onStartDestinationSelection?: () => void;
  onRequestRoute?: () => void;
  onCancelRoute?: () => void;
}

const MapRoutingBar: React.FC<MapRoutingBarProps> = ({
  searchInput,
  hasActiveRoute,
  destinationPin,
  onStartDestinationSelection,
  onRequestRoute,
  onCancelRoute,
}) => (
  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 bg-white/95 backdrop-blur rounded-full shadow px-4 py-2">
    <input
      type="text"
      className="border-none outline-none text-sm bg-transparent w-56"
      placeholder="Click pin, then click map"
      value={searchInput}
      readOnly
    />
    {!hasActiveRoute ? (
      <>
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onStartDestinationSelection?.()}
          disabled={hasActiveRoute}
          aria-label="Select destination on map"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
        </button>
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onRequestRoute?.()}
          disabled={!destinationPin}
          aria-label="Generate route"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>
      </>
    ) : (
      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-red-500 hover:bg-red-50"
        onClick={() => onCancelRoute?.()}
        aria-label="Cancel route"
      >
        <span className="text-red-600 text-sm font-bold">✕</span>
      </button>
    )}
  </div>
);

export default MapRoutingBar;
