import React, { createContext, useContext, useState, useCallback } from "react";

type Panel = "broadcast" | "legend";
type BroadcastSubPanel = "list" | "create" | null;

interface WindowState {
  pinned: boolean;
  position: { x: number; y: number };
  size: { w: number; h: number };
}

interface PanelContextType {
  openPanels: Set<Panel>;
  togglePanel: (panel: Panel) => void;
  closePanel: (panel: Panel) => void;
  broadcastSub: BroadcastSubPanel;
  setBroadcastSub: (sub: BroadcastSubPanel) => void;
  incidentsOpen: boolean;
  setIncidentsOpen: (open: boolean) => void;
  windowStates: Record<string, WindowState>;
  setWindowPinned: (id: string, pinned: boolean) => void;
  setWindowPosition: (id: string, position: { x: number; y: number }) => void;
  setWindowSize: (id: string, size: { w: number; h: number }) => void;
  getWindowState: (
    id: string,
    defaultPos: { x: number; y: number },
    defaultSize?: { w: number; h: number }
  ) => WindowState;
}

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  broadcast_list:   { x: 500, y: 70 },
  broadcast_create: { x: 500, y: 70 },
  legend:           { x: 900, y: 70 },
};

const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  broadcast_list:   { w: 320, h: 480 },
  broadcast_create: { w: 320, h: 480 },
  legend:           { w: 256, h: 480 },
};

const PanelContext = createContext<PanelContextType | null>(null);

export const PanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openPanels, setOpenPanels] = useState<Set<Panel>>(new Set());
  const [broadcastSub, setBroadcastSub] = useState<BroadcastSubPanel>(null);
  const [incidentsOpen, setIncidentsOpen] = useState(false);
  const [windowStates, setWindowStates] = useState<Record<string, WindowState>>({});

  const togglePanel = (panel: Panel) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
        if (panel === "broadcast") setBroadcastSub(null);
      } else {
        next.add(panel);
      }
      return next;
    });
  };

  const closePanel = (panel: Panel) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      next.delete(panel);
      if (panel === "broadcast") setBroadcastSub(null);
      return next;
    });
  };

  const setWindowPinned = useCallback((id: string, pinned: boolean) => {
    setWindowStates((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        pinned,
        position: prev[id]?.position ?? DEFAULT_POSITIONS[id] ?? { x: 100, y: 100 },
        size: prev[id]?.size ?? DEFAULT_SIZES[id] ?? { w: 320, h: 480 },
      },
    }));
  }, []);

  const setWindowPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setWindowStates((prev) => ({
      ...prev,
      [id]: {
        pinned: prev[id]?.pinned ?? false,
        position,
        size: prev[id]?.size ?? DEFAULT_SIZES[id] ?? { w: 320, h: 480 },
      },
    }));
  }, []);

  const setWindowSize = useCallback((id: string, size: { w: number; h: number }) => {
    setWindowStates((prev) => ({
      ...prev,
      [id]: {
        pinned: prev[id]?.pinned ?? false,
        position: prev[id]?.position ?? DEFAULT_POSITIONS[id] ?? { x: 100, y: 100 },
        size,
      },
    }));
  }, []);

  const getWindowState = useCallback(
    (
      id: string,
      defaultPos: { x: number; y: number },
      defaultSize: { w: number; h: number } = { w: 320, h: 480 }
    ): WindowState => {
      return windowStates[id] ?? {
        pinned: false,
        position: defaultPos,
        size: DEFAULT_SIZES[id] ?? defaultSize,
      };
    },
    [windowStates]
  );

  return (
    <PanelContext.Provider value={{
      openPanels, togglePanel, closePanel,
      broadcastSub, setBroadcastSub,
      incidentsOpen, setIncidentsOpen,
      windowStates,
      setWindowPinned, setWindowPosition, setWindowSize,
      getWindowState,
    }}>
      {children}
    </PanelContext.Provider>
  );
};

export const usePanels = () => {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanels must be used inside PanelProvider");
  return ctx;
};
