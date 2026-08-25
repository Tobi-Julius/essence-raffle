"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth, db, ensureAppCheck } from "@/lib/firebase/client";
import { logSnapshotError } from "@/lib/firebase/snapshot";
import type { UserProfile, UserRole } from "@/types/firestore";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  emailVerified: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  emailVerified: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    ensureAppCheck();
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) {
        setProfile(null);
        setProfileLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", user?.uid),
      (snap) => {
        setProfile(
          snap.exists()
            ? ({
                id: snap.id,
                ...snap.data(),
              } as UserProfile)
            : null,
        );
        setProfileLoading(false);
      },
      (error) => {
        // A signed-in user should always be able to read their own profile;
        // a denial here means the security rules aren't deployed yet (or
        // the account is mid-deactivation). Either way, don't crash the
        // app — fall back to "no profile" so RouteGuards treat this the
        // same as a user we don't recognize, instead of spinning forever.
        logSnapshotError("users/{uid}", error);
        setProfile(null);
        setProfileLoading(false);
      },
    );
    return unsub;
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      // This IS the role — there's no separate Auth custom claim anymore.
      // firestore.rules reads this exact same users/{uid}.role field
      // (see myRole() in firestore.rules), so this value is also what real
      // enforcement checks, not just a UI-display mirror of something else.
      role: profile?.role ?? null,
      loading: authLoading || profileLoading,
      emailVerified: user?.emailVerified ?? false,
    }),
    [user, profile, authLoading, profileLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
