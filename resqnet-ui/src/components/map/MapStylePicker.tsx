import React, { useRef, useEffect } from "react";
import {
  LayoutGrid,
  TreePine,
  Globe,
  MoonStar,
  Box,
  Layers,
} from "lucide-react";
import { MAP_STYLES } from "./constants";
import type { MapStyle } from "./types";

const STYLE_ICONS: Record<string, React.ReactElement> = {
  streets: <LayoutGrid size={16} color="currentColor" />,
  outdoors: <TreePine size={16} color="currentColor" />,
  satellite: <Globe size={16} color="currentColor" />,
  dark: <MoonStar size={16} color="currentColor" />,
  "3d": <Box size={16} color="currentColor" />,
};

interface MapStylePickerProps {
  activeStyleId: string;
  showPicker: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}

const MapStylePicker: React.FC<MapStylePickerProps> = ({
  activeStyleId,
  showPicker,
  onToggle,
  onSelect,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    if (showPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker, onToggle]);

  return (
    <div ref={ref} className="relative">
      {showPicker && (
        <div className="absolute bottom-full mb-2 right-0 flex flex-col gap-1.5 items-end">
          {MAP_STYLES.map((style: MapStyle) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              title={style.label}
              className={`w-10 h-10 rounded-full shadow-md border flex items-center justify-center transition-colors
                ${
                  activeStyleId === style.id
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-gray-200 hover:bg-gray-100"
                }`}
            >
              {STYLE_ICONS[style.id]}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        title="Change map style"
        className={`w-10 h-10 rounded-full backdrop-blur shadow-md border flex items-center justify-center transition-colors
          ${
            showPicker
              ? "bg-black text-white border-black"
              : "bg-white text-black border-gray-200 hover:bg-gray-100"
          }`}
      >
        <Layers size={18} color="currentColor" />
      </button>
    </div>
  );
};

export default MapStylePicker;
