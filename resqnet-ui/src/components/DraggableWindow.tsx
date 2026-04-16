import React, { useRef, useEffect } from "react";
import { X, Pin, PinOff } from "lucide-react";
import { usePanels } from "../context/PanelContext";

interface DraggableWindowProps {
  id: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { w: number; h: number };
  showPin?: boolean;
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({
  id,
  title,
  onClose,
  children,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { w: 320, h: 480 },
  showPin = true,
}) => {
  const { getWindowState, setWindowPinned, setWindowPosition, setWindowSize } = usePanels();
  const { pinned, position, size } = getWindowState(id, defaultPosition, defaultSize);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizingEdge = useRef<"right" | "bottom" | "corner" | null>(null);
  const resizeStart = useRef({ x: 0, y: 0, w: size.w, h: size.h });

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (pinned) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current && !pinned) {
        setWindowPosition(id, {
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
      if (resizingEdge.current) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        const edge = resizingEdge.current;
        setWindowSize(id, {
          w: edge === "right" || edge === "corner"
            ? Math.max(220, resizeStart.current.w + dx)
            : size.w,
          h: edge === "bottom" || edge === "corner"
            ? Math.max(160, resizeStart.current.h + dy)
            : size.h,
        });
      }
    };
    const onMouseUp = () => {
      dragging.current = false;
      resizingEdge.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [pinned, id, size, setWindowPosition, setWindowSize]);

  const startResize = (edge: "right" | "bottom" | "corner") => (e: React.MouseEvent) => {
    resizingEdge.current = edge;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="fixed z-999 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
      style={{ left: position.x, top: position.y, width: size.w, height: size.h }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 select-none shrink-0
          ${pinned ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        onMouseDown={handleHeaderMouseDown}
      >
        <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {showPin && (
            <button
              onClick={() => setWindowPinned(id, !pinned)}
              title={pinned ? "Unpin window" : "Pin window in place"}
              className={`p-1 rounded-lg transition-colors
                ${pinned
                  ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                  : "text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                }`}
            >
              {pinned ? <Pin size={13} /> : <PinOff size={13} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>

      {/* Right edge */}
      <div
        className="absolute top-0 right-0 w-[4px] h-full cursor-col-resize hover:bg-blue-400/30 transition-colors z-10"
        onMouseDown={startResize("right")}
      />

      {/* Bottom edge */}
      <div
        className="absolute bottom-0 left-0 w-full h-[4px] cursor-row-resize hover:bg-blue-400/30 transition-colors z-10"
        onMouseDown={startResize("bottom")}
      />

      {/* Corner grip */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20 flex items-end justify-end pr-1 pb-1"
        onMouseDown={startResize("corner")}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-300">
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
          <circle cx="4.5" cy="8" r="1.2" fill="currentColor" />
          <circle cx="8" cy="4.5" r="1.2" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
};

export default DraggableWindow;
