import React, { useRef, useState, useEffect } from "react";
import { X, Pin, PinOff } from "lucide-react";

interface DraggableWindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  width?: string;
}

const DraggableWindow: React.FC<DraggableWindowProps> = ({
  title,
  onClose,
  children,
  initialPosition = { x: 100, y: 100 },
  width = "w-80",
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [pinned, setPinned] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (pinned) return;
    dragging.current = true;
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || pinned) return;
      setPosition({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
    };
    const handleMouseUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [pinned]);

  return (
    <div
      className={`fixed z-[999] ${width} bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 overflow-hidden`}
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 select-none
          ${pinned ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        onMouseDown={handleMouseDown}
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>

        <div className="flex items-center gap-1">
          {/* Pin button */}
          <button
            onClick={() => setPinned((prev) => !prev)}
            title={pinned ? "Unpin window" : "Pin window in place"}
            className={`p-1 rounded-lg transition-colors
              ${pinned
                ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                : "text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              }`}
          >
            {pinned ? <Pin size={13} /> : <PinOff size={13} />}
          </button>

          {/* X — only closes, never destroys if pinned */}
          <button
            onClick={onClose}
            title="Close window"
            className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[70vh]">
        {children}
      </div>
    </div>
  );
};

export default DraggableWindow;
