import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ownerApi, ApiError } from "../lib/api";
import { loadConfig, setAuthToken, clearAuthToken, saveOwnerProfile, loadOwnerProfile, decodeJwt } from "../lib/config";
import { asPaginated } from "../lib/paginated";

function isTokenExpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    const exp = typeof payload.exp === "number" ? payload.exp : 0;
    return exp > 0 && Date.now() / 1000 > exp;
  } catch { return false; }
}

export type OwnerProfile = {
  id: string;
  userId?: string;
  fullName: string;
  email: string;
  phone: string;
  walletBalance?: number;
};

export type AuthUser = {
  email: string;
  name: string;
  role: string;
  userId: string;
};

type Toast = { id: number; type: "success" | "error" | "info"; message: string };

type Ctx = {
  isAuthenticated: boolean;
  authUser: AuthUser | null;
  /** Auth user ID (nameid from JWT / user.id from login). Use this for property & listing API calls. */
  userId: string;
  owner: OwnerProfile | null;
  ownerLoading: boolean;
  loginComplete: (token: string, user: AuthUser) => Promise<void>;
  logout: () => void;
  reloadKey: number;
  bumpReload: () => void;
  toasts: Toast[];
  toast: (msg: string, type?: Toast["type"]) => void;
  dismissToast: (id: number) => void;
};

const Ctx = createContext<Ctx | null>(null);

let _toastSeq = 0;

export function OwnerProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const t = loadConfig().authToken;
    if (!t || t.length <= 10) return false;
    if (isTokenExpired(t)) {
      clearAuthToken();
      localStorage.removeItem("sh_owner_auth_user");
      return false;
    }
    return true;
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const s = localStorage.getItem("sh_owner_auth_user");
      return s ? (JSON.parse(s) as AuthUser) : null;
    } catch { return null; }
  });
  const [owner, setOwner] = useState<OwnerProfile | null>(() => {
    const p = loadOwnerProfile();
    if (!p) return null;
    return {
      id: String(p.id ?? ""),
      userId: p.userId ? String(p.userId) : undefined,
      fullName: String(p.fullName ?? ""),
      email: String(p.email ?? ""),
      phone: String(p.phone ?? ""),
      walletBalance: typeof p.walletBalance === "number" ? p.walletBalance : undefined,
    };
  });
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const bumpReload = useCallback(() => setReloadKey(k => k + 1), []);

  // Auto-logout when any API call receives 401 (expired/invalid token)
  useEffect(() => {
    const handle = () => {
      clearAuthToken();
      localStorage.removeItem("sh_owner_auth_user");
      setIsAuthenticated(false);
      setAuthUser(null);
      setOwner(null);
    };
    window.addEventListener("sh:unauthorized", handle);
    return () => window.removeEventListener("sh:unauthorized", handle);
  }, []);

  const toast = useCallback((msg: string, type: Toast["type"] = "info") => {
    const id = ++_toastSeq;
    setToasts(t => [...t, { id, type, message: msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);

  /** Fetch owner profile by userId from JWT, cache it. */
  const fetchOwnerProfile = useCallback(async (userId: string): Promise<OwnerProfile | null> => {
    setOwnerLoading(true);
    try {
      const data = await ownerApi.getByUserId(userId);
      const r = data as Record<string, unknown>;
      // getByUserId might return paginated or single
      const pg = asPaginated<Record<string, unknown>>(data);
      const raw = pg ? pg.items[0] : r;
      if (!raw || !raw.id) { setOwnerLoading(false); return null; }
      const profile: OwnerProfile = {
        id: String(raw.id),
        userId: raw.userId ? String(raw.userId) : userId,
        fullName: String(raw.fullName ?? ""),
        email: String(raw.email ?? ""),
        phone: String(raw.phone ?? ""),
        walletBalance: typeof raw.walletBalance === "number" ? raw.walletBalance : undefined,
      };
      setOwner(profile);
      saveOwnerProfile(raw as Record<string, unknown>);
      console.log("%c👤 Owner profile loaded:", "color:#0d9488;font-weight:bold", profile);
      return profile;
    } catch (e) {
      console.error("Failed to load owner profile:", e);
      toast(e instanceof ApiError ? e.message : "Could not load owner profile", "error");
      return null;
    } finally {
      setOwnerLoading(false);
    }
  }, [toast]);

  const loginComplete = useCallback(async (token: string, user: AuthUser) => {
    setAuthToken(token);
    setAuthUser(user);
    setIsAuthenticated(true);
    localStorage.setItem("sh_owner_auth_user", JSON.stringify(user));
    console.log("%c✅ Owner portal auth complete", "color:#0d9488;font-weight:bold");

    // Decode JWT to get userId (nameid claim)
    const payload = decodeJwt(token);
    const userId = String(payload.nameid ?? payload.sub ?? user.userId ?? "");
    console.log("JWT userId (nameid):", userId);

    if (userId) await fetchOwnerProfile(userId);
  }, [fetchOwnerProfile]);

  const logout = useCallback(() => {
    clearAuthToken();
    localStorage.removeItem("sh_owner_auth_user");
    setIsAuthenticated(false);
    setAuthUser(null);
    setOwner(null);
    console.log("%c🚪 Owner portal logged out", "color:#f59e0b;font-weight:bold");
  }, []);

  // Refresh wallet on reload
  useEffect(() => {
    if (!owner?.id) return;
    ownerApi.wallet(owner.id)
      .then(w => {
        const wr = w as Record<string, unknown>;
        const wb = typeof wr.walletBalance === "number" ? wr.walletBalance : typeof wr.balance === "number" ? wr.balance : undefined;
        if (typeof wb === "number") setOwner(o => o ? { ...o, walletBalance: wb } : o);
      })
      .catch(() => { /* non-critical */ });
  }, [reloadKey, owner?.id]);

  const userId = authUser?.userId ?? "";

  const value = useMemo(() => ({
    isAuthenticated, authUser, userId, owner, ownerLoading,
    loginComplete, logout,
    reloadKey, bumpReload,
    toasts, toast, dismissToast,
  }), [isAuthenticated, authUser, userId, owner, ownerLoading, loginComplete, logout,
    reloadKey, bumpReload, toasts, toast, dismissToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOwner() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useOwner outside OwnerProvider");
  return c;
}
