import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthToken,
  clearCustomerProfile,
  decodeJwt,
  loadCart,
  loadCustomerProfile,
  loadFavorites,
  rolesFromClaims,
  saveCart,
  saveCustomerProfile,
  saveFavorites,
  setAuthToken,
  type CustomerProfile,
} from "../lib/config";

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
  cart: string[];
  toasts: Toast[];
  reloadKey: number;
  loginComplete: (token: string, user?: Record<string, unknown>, profile?: CustomerProfile) => AuthUser;
  logout: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  inCart: (id: string) => boolean;
  toast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  bumpReload: () => void;
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
  const [cart, setCart] = useState<string[]>(loadCart());
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
  }, []);

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        saveFavorites(next);
        return next;
      });
    },
    []
  );

  const addToCart = useCallback(
    (id: string) => {
      setCart((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        saveCart(next);
        return next;
      });
    },
    []
  );

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => {
      const next = prev.filter((x) => x !== id);
      saveCart(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);
  const inCart = useCallback((id: string) => cart.includes(id), [cart]);
  const bumpReload = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo<AppState>(
    () => ({
      isAuthenticated: !!authUser,
      authUser,
      customerProfile,
      favorites,
      cart,
      toasts,
      reloadKey,
      loginComplete,
      logout,
      toggleFavorite,
      isFavorite,
      addToCart,
      removeFromCart,
      inCart,
      toast,
      dismissToast,
      bumpReload,
    }),
    [
      authUser, customerProfile, favorites, cart, toasts, reloadKey,
      loginComplete, logout, toggleFavorite, isFavorite, addToCart,
      removeFromCart, inCart, toast, dismissToast, bumpReload,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
