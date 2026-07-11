import { create } from "zustand";

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  designation: string;
  hospitalName: string;
  permissions: string[];
  isMaintenanceActive?: boolean;
  maintenanceMessage?: string;
  isLicenseExpired?: boolean;
}

interface AuthStore {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * useAuthStore
 * Zustand global state manager holding the authenticated user's credentials
 * and active permissions.
 */
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}));
