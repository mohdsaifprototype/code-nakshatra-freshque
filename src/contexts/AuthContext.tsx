import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNotifications } from "@/contexts/NotificationsContext";
import { api } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  vegetarianOnly: boolean;
  setVegetarianOnly: (v: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "freshque_user";
const VEG_KEY = "freshque_veg_only";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [vegetarianOnly, setVegState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { push: pushNotification } = useNotifications();

  useEffect(() => {
    const restoreSession = async () => {
      const veg = localStorage.getItem(VEG_KEY);
      if (veg !== null) setVegState(veg === "true");
      try {
        const me = await api.me();
        const u = me?.user;
        if (u?.id && u?.email) {
          persist({ id: String(u.id), name: String(u.name || "Friend"), email: String(u.email) });
          if (typeof u.vegetarianOnly === "boolean") {
            setVegState(u.vegetarianOnly);
            localStorage.setItem(VEG_KEY, String(u.vegetarianOnly));
          }
        } else {
          persist(null);
        }
      } catch {
        persist(null);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const persist = (u: User | null) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
    setUser(u);
  };

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    const u = res?.user;
    persist({ id: String(u.id), name: String(u.name || "Friend"), email: String(u.email || email) });
    if (typeof u?.vegetarianOnly === "boolean") {
      setVegState(u.vegetarianOnly);
      localStorage.setItem(VEG_KEY, String(u.vegetarianOnly));
    }
    pushNotification({
      kind: "security",
      title: "Successful sign-in",
      body: `New session started for ${email}. If this wasn't you, change your password from Settings.`,
      href: "/settings",
    });
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await api.signup({ name, email, password });
    const u = res?.user;
    persist({ id: String(u.id), name: String(u.name || name), email: String(u.email || email) });
    pushNotification({
      kind: "security",
      title: "Welcome to Freshque",
      body: `Account created for ${email}. Your inventory is private and protected.`,
      href: "/settings",
    });
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Even if API logout fails, clear local auth state.
    }
    persist(null);
    pushNotification({
      kind: "security",
      title: "Signed out",
      body: "Your session has ended securely.",
    });
  };

  const setVegetarianOnly = async (v: boolean) => {
    const prev = vegetarianOnly;
    localStorage.setItem(VEG_KEY, String(v));
    setVegState(v);
    try {
      await api.updatePreferences({ vegetarianOnly: v });
    } catch {
      localStorage.setItem(VEG_KEY, String(prev));
      setVegState(prev);
      throw new Error("Failed to save preference");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout, vegetarianOnly, setVegetarianOnly }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
