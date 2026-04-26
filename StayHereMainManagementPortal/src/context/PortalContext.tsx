import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, ownersApi } from "../lib/api";
import { loadConfig, saveConfig, type PortalConfig } from "../lib/config";

type Toast = { id: number; type: "success" | "error" | "info"; message: string };

export type PortalOwnerEntry = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
};

type Ctx = {
  config: PortalConfig;
  setConfig: (p: Partial<PortalConfig>) => void;
  reloadKey: number;
  bumpReload: () => void;
  toasts: Toast[];
  toast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: number) => void;
  /** Shared cache for header + listing wizard (GET owners/portal-directory). */
  ownerDirectory: PortalOwnerEntry[];
  ownerDirectoryLoading: boolean;
  refreshOwnerDirectory: () => Promise<void>;
};

const PortalContext = createContext<Ctx | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<PortalConfig>(() => loadConfig());
  const [reloadKey, setReloadKey] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ownerDirectory, setOwnerDirectory] = useState<PortalOwnerEntry[]>([]);
  const [ownerDirectoryLoading, setOwnerDirectoryLoading] = useState(false);

  const setConfig = useCallback((p: Partial<PortalConfig>) => {
    saveConfig(p);
    setConfigState(loadConfig());
  }, []);

  const bumpReload = useCallback(() => setReloadKey((k) => k + 1), []);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const refreshOwnerDirectory = useCallback(async () => {
    setOwnerDirectoryLoading(true);
    try {
      const raw = await ownersApi.portalDirectory(500);
      const list = Array.isArray(raw) ? raw : [];
      setOwnerDirectory(
        list.map((x) => {
          const r = x as Record<string, unknown>;
          return {
            id: String(r.id ?? ""),
            fullName: String(r.fullName ?? ""),
            email: String(r.email ?? ""),
            phone: String(r.phone ?? ""),
          };
        })
      );
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not load property owners", "error");
      setOwnerDirectory([]);
    } finally {
      setOwnerDirectoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refreshOwnerDirectory();
  }, [reloadKey, config.propertyOwnerApiBase, refreshOwnerDirectory]);

  const value = useMemo(
    () => ({
      config,
      setConfig,
      reloadKey,
      bumpReload,
      toasts,
      toast,
      dismissToast,
      ownerDirectory,
      ownerDirectoryLoading,
      refreshOwnerDirectory,
    }),
    [
      config,
      setConfig,
      reloadKey,
      bumpReload,
      toasts,
      toast,
      dismissToast,
      ownerDirectory,
      ownerDirectoryLoading,
      refreshOwnerDirectory,
    ]
  );

  return (
    <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
  );
}

export function usePortal() {
  const c = useContext(PortalContext);
  if (!c) throw new Error("usePortal outside PortalProvider");
  return c;
}
