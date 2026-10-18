import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthToken,
  clearCustomerProfile,
  decodeJwt,
  loadCustomerProfile,
  loadFavorites,
  rolesFromClaims,
  saveCustomerProfile,
  saveFavorites,
  setAuthToken,
  type CustomerProfile,
} from "../lib/config";
import { enquiryApi, savedListingsApi, type EnquirySummary } from "../lib/api";
import { playNotificationBeep } from "../lib/notifications";

export type AuthUser = {
  id?: string;
  email?: string;
  name?: string;
  roles: string[];
  raw?: Record<string, unknown>;
};

export type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
};

type AppState = {
  isAuthenticated: boolean;
  authUser: AuthUser | null;
  customerProfile: CustomerProfile | null;
  favorites: string[];
  enquiries: EnquirySummary[];
  totalUnreadEnquiries: number;
  toasts: Toast[];
  reloadKey: number;
  loginComplete: (token: string, user?: Record<string, unknown>, profile?: CustomerProfile) => AuthUser;
  logout: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  hasEnquired: (listingId: string) => boolean;
  createEnquiry: (listingId: string) => Promise<EnquirySummary>;
  toast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  bumpReload: () => void;
  refreshFavorites: () => Promise<void>;
  refreshEnquiries: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

function buildUser(token: string, user?: Record<string, unknown>): AuthUser {
  const claims = decodeJwt(token);
  const roles = rolesFromClaims(claims);
  return {
    id:
      (user?.id as string) ??
      (claims?.sub as string) ??
      (claims?.["nameid"] as string) ??
      undefined,
    email: (user?.email as string) ?? (claims?.email as string) ?? undefined,
    name:
      (user?.fullName as string) ??
      (user?.name as string) ??
      (claims?.name as string) ??
      undefined,
    roles,
    raw: user,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(
    loadCustomerProfile()
  );
  const [favorites, setFavorites] = useState<string[]>(loadFavorites());
  const [enquiries, setEnquiries] = useState<EnquirySummary[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // Restore session from stored token on first load.
  useEffect(() => {
    const token = localStorage.getItem("sh_client_auth_token");
    if (token) {
      const claims = decodeJwt(token);
      if (claims?.exp && claims.exp * 1000 < Date.now()) {
        clearAuthToken();
        clearCustomerProfile();
      } else {
        setAuthUser(buildUser(token));
      }
    }
  }, []);

  const toast = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Saved listings live server-side once signed in - the same store Sage's save_listing/
  // unsave_listing/get_saved_listings tools read and write, so the "Saved" page and the AI agent
  // never disagree about what's saved. Signed-out visitors keep the old localStorage-only
  // behaviour (nothing to sync against yet).
  const refreshFavorites = useCallback(async () => {
    if (!authUser) return;
    try {
      const saved = await savedListingsApi.list();
      setFavorites(saved.map((s) => s.listingId));
    } catch {
      // Leave whatever local favorites state was there - a failed fetch shouldn't wipe the UI.
    }
  }, [authUser]);

  // Sage can save/unsave a listing mid-conversation, entirely outside this context's own
  // toggleFavorite path - the array below would otherwise go stale the moment that happens (the
  // user would have to log out/in to see it), confirmed live: a listing saved via Sage chat
  // didn't appear on the Saved page until the app was reloaded. Re-fetched on login, and
  // SagePage also calls refreshFavorites() after every turn so this never drifts.
  useEffect(() => {
    void refreshFavorites();
  }, [refreshFavorites]);

  // Enquiries (the only channel a customer and an owner ever talk through) - polled gently so an
  // owner's reply surfaces without the customer needing to reload. `initializedRef` keeps the
  // FIRST fetch after sign-in from firing a beep/toast for messages that were already unread last
  // session; only a RISE in unreadCount after that baseline triggers a notification.
  const initializedRef = useRef(false);
  const prevUnreadRef = useRef<Record<string, number>>({});

  const refreshEnquiries = useCallback(async () => {
    if (!authUser) return;
    try {
      const list = await enquiryApi.mine();
      setEnquiries(list);

      if (initializedRef.current) {
        for (const e of list) {
          const prev = prevUnreadRef.current[e.id] ?? 0;
          if (e.unreadCount > prev) {
            playNotificationBeep();
            toast(`New message about ${e.listingTitle ?? "your enquiry"}`, "info");
          }
        }
      } else {
        initializedRef.current = true;
      }
      prevUnreadRef.current = Object.fromEntries(list.map((e) => [e.id, e.unreadCount]));
    } catch {
      // A failed poll shouldn't wipe existing state or spam notifications.
    }
  }, [authUser, toast]);

  useEffect(() => {
    void refreshEnquiries();
  }, [refreshEnquiries]);

  // Background poll, deliberately gated to only run while the tab is actually visible - an
  // inactive/backgrounded tab does no network work at all here, so this never adds load or
  // perceptible slowdown anywhere else in the app. A dedicated chat thread page polls on its own,
  // faster cadence while it's open; this is just the "did anything happen elsewhere" heartbeat
  // that drives the navbar badge + beep/toast.
  useEffect(() => {
    if (!authUser) return;
    const tick = () => {
      if (document.visibilityState === "visible") void refreshEnquiries();
    };
    const interval = window.setInterval(tick, 35000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [authUser, refreshEnquiries]);

  const loginComplete = useCallback(
    (token: string, user?: Record<string, unknown>, profile?: CustomerProfile) => {
      setAuthToken(token);
      const u = buildUser(token, user);
      setAuthUser(u);
      if (profile) {
        saveCustomerProfile(profile);
        setCustomerProfile(profile);
      }
      return u;
    },
    []
  );

  const logout = useCallback(() => {
    clearAuthToken();
    clearCustomerProfile();
    setAuthUser(null);
    setCustomerProfile(null);
    setFavorites(loadFavorites());
    setEnquiries([]);
    initializedRef.current = false;
    prevUnreadRef.current = {};
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      const wasSaved = favorites.includes(id);

      setFavorites((prev) => {
        const next = wasSaved ? prev.filter((x) => x !== id) : [...prev, id];
        if (!authUser) saveFavorites(next);
        return next;
      });

      if (!authUser) return;

      const revert = () => {
        setFavorites((prev) =>
          wasSaved ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
        );
        toast("Couldn't update your saved listings - please try again.", "error");
      };

      const call = wasSaved ? savedListingsApi.unsave(id) : savedListingsApi.save(id);
      call.catch(revert);
    },
    [authUser, favorites, toast]
  );

  const hasEnquired = useCallback(
    (listingId: string) => enquiries.some((e) => e.listingId === listingId),
    [enquiries]
  );

  const createEnquiry = useCallback(
    async (listingId: string) => {
      const existing = enquiries.find((e) => e.listingId === listingId);
      if (existing) return existing;

      const created = await enquiryApi.create(listingId);
      setEnquiries((prev) => [created, ...prev.filter((e) => e.id !== created.id)]);
      return created;
    },
    [enquiries]
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);
  const bumpReload = useCallback(() => setReloadKey((k) => k + 1), []);
  const totalUnreadEnquiries = useMemo(
    () => enquiries.reduce((sum, e) => sum + e.unreadCount, 0),
    [enquiries]
  );

  const value = useMemo<AppState>(
    () => ({
      isAuthenticated: !!authUser,
      authUser,
      customerProfile,
      favorites,
      enquiries,
      totalUnreadEnquiries,
      toasts,
      reloadKey,
      loginComplete,
      logout,
      toggleFavorite,
      isFavorite,
      hasEnquired,
      createEnquiry,
      toast,
      dismissToast,
      bumpReload,
      refreshFavorites,
      refreshEnquiries,
    }),
    [
      authUser, customerProfile, favorites, enquiries, totalUnreadEnquiries, toasts, reloadKey,
      loginComplete, logout, toggleFavorite, isFavorite, hasEnquired, createEnquiry,
      toast, dismissToast, bumpReload, refreshFavorites, refreshEnquiries,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
