import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, ownersApi } from "../lib/api";
import { loadConfig, saveConfig, setAuthToken, clearAuthToken, type PortalConfig } from "../lib/config";

type Toast = { id: number; type: "success" | "error" | "info"; message: string };

export type PortalOwnerEntry = {
  id: string;       // PropertyOwner entity ID
  userId: string;   // Auth user ID (nameid from JWT) — use this for property/listing lookups
  fullName: string;
  email: string;
  phone: string;
};

export type AdminUser = {
  email: string;
  name?: string;
  role?: string;
  id?: string;
};

type Ctx = {
  /* Config */
  config: PortalConfig;
  setConfig: (p: Partial<PortalConfig>) => void;
  /* Auth */
  isAuthenticated: boolean;
  adminUser: AdminUser | null;
  loginComplete: (token: string, user?: AdminUser) => void;
  logout: () => void;
  /* Data */
  reloadKey: number;
  bumpReload: () => void;
  /* Toasts */
  toasts: Toast[];
  toast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: number) => void;
  /* Owner directory */
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

  /* Auth state — bootstrapped from config.authToken */
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = loadConfig().authToken;
    return Boolean(token && token.length > 10);
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const stored = localStorage.getItem("sh_mgmt_admin_user");
      return stored ? (JSON.parse(stored) as AdminUser) : null;
    } catch { return null; }
  });

  const setConfig = useCallback((p: Partial<PortalConfig>) => {
    saveConfig(p);
    setConfigState(loadConfig());
  }, []);

  const bumpReload = useCallback(() => setReloadKey((k) => k + 1), []);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const loginComplete = useCallback((token: string, user?: AdminUser) => {
    setAuthToken(token);
    setConfigState(loadConfig());
    setIsAuthenticated(true);
    if (user) {
      setAdminUser(user);
      localStorage.setItem("sh_mgmt_admin_user", JSON.stringify(user));
    }
    console.log("%c✅ Authentication complete. Token stored.", "color:#10b981;font-weight:bold");
    console.log("Token (first 40 chars):", token.slice(0, 40) + "…");
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    localStorage.removeItem("sh_mgmt_admin_user");
    setIsAuthenticated(false);
    setAdminUser(null);
    setConfigState(loadConfig());
    console.log("%c🚪 Logged out — token cleared.", "color:#f59e0b;font-weight:bold");
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
            userId: String(r.userId ?? r.id ?? ""),
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
    if (isAuthenticated) void refreshOwnerDirectory();
  }, [reloadKey, config.propertyOwnerApiBase, isAuthenticated, refreshOwnerDirectory]);

  const value = useMemo(
    () => ({
      config, setConfig,
      isAuthenticated, adminUser, loginComplete, logout,
      reloadKey, bumpReload,
      toasts, toast, dismissToast,
      ownerDirectory, ownerDirectoryLoading, refreshOwnerDirectory,
    }),
    [config, setConfig, isAuthenticated, adminUser, loginComplete, logout,
      reloadKey, bumpReload, toasts, toast, dismissToast,
      ownerDirectory, ownerDirectoryLoading, refreshOwnerDirectory]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const c = useContext(PortalContext);
  if (!c) throw new Error("usePortal outside PortalProvider");
  return c;
}
