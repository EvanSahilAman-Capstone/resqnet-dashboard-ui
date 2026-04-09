import React, { useRef } from 'react';
import { Download } from 'lucide-react';
import type { LayerToggles } from '../../context/PanelContext';

interface LayersPanelProps {
  toggles:              LayerToggles;
  onChange:             (key: keyof LayerToggles, value: boolean) => void;
  onCustomOverlayImport:(file: File) => void;
  onClearOverlay:       () => void;
  hasCustomOverlay:     boolean;
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  checked, onChange, disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500
      ${checked ? 'bg-indigo-500' : 'bg-gray-300'}
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200
        ${checked ? 'translate-x-4' : 'translate-x-0'}`}
    />
  </button>
);

interface RowProps {
  label:    string;
  checked:  boolean;
  onChange: (v: boolean) => void;
  beta?:    boolean;
  disabled?: boolean;
}

const ToggleRow: React.FC<RowProps> = ({ label, checked, onChange, beta, disabled }) => (
  <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${checked ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">{label}</span>
      {beta && (
        <span className="text-[9px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
          BETA
        </span>
      )}
    </div>
    <Toggle checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);

const LayersPanel: React.FC<LayersPanelProps> = ({
  toggles, onChange, onCustomOverlayImport, onClearOverlay, hasCustomOverlay,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="py-2 text-xs select-none min-w-[220px]">

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-1 pb-2">
        Map Layers
      </p>

      <ToggleRow label="Population density" beta
        checked={toggles.populationHeatmap}
        onChange={(v) => onChange('populationHeatmap', v)} />

      <ToggleRow label="Sensor coverage"
        checked={toggles.sensorCoverage}
        onChange={(v) => onChange('sensorCoverage', v)} />

      <ToggleRow label="Fire risk heatmap"
        checked={toggles.fireHeatmap}
        onChange={(v) => onChange('fireHeatmap', v)} />

      <ToggleRow label="County boundaries"
        checked={toggles.countyBoundaries}
        onChange={(v) => onChange('countyBoundaries', v)} />

      <ToggleRow label="Heat / blast radius"
        checked={toggles.heatRadius}
        onChange={(v) => onChange('heatRadius', v)} />

      <ToggleRow label="Evacuation zones"
        checked={toggles.evacuationZones}
        onChange={(v) => onChange('evacuationZones', v)} />

      <ToggleRow label="Measure distance"
        checked={toggles.measureDistance}
        onChange={(v) => onChange('measureDistance', v)} />

      {/* Custom GeoJSON overlay */}
      <div className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
        <span className="text-sm text-gray-700">
          {hasCustomOverlay ? 'Custom overlay ✓' : 'Custom overlay...'}
        </span>
        <div className="flex items-center gap-2">
          {hasCustomOverlay && (
            <button type="button" onClick={onClearOverlay}
              className="text-[10px] text-red-500 hover:text-red-700 font-medium transition-colors">
              Clear
            </button>
          )}
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="text-gray-500 hover:text-gray-800 transition-colors" title="Import GeoJSON">
            <Download size={15} />
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".geojson,.json" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onCustomOverlayImport(file);
            e.target.value = '';
          }} />
      </div>

      <hr className="border-gray-100 my-2 mx-3" />

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 pb-2">
        App
      </p>

      <div className="flex items-center justify-between px-3 py-2 rounded-lg opacity-50">
        <span className="text-sm text-gray-500">Dark mode</span>
        <Toggle checked={false} onChange={() => {}} disabled />
      </div>
      <div className="flex items-center justify-between px-3 py-2 rounded-lg opacity-50">
        <span className="text-sm text-gray-500">Imperial units</span>
        <Toggle checked={false} onChange={() => {}} disabled />
      </div>

    </div>
  );
};

export default LayersPanel;