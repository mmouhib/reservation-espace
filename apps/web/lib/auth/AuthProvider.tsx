"use client";

import {
  GoogleAuthProvider,
  OAuthProvider,
  SAMLAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type AuthProvider as FirebaseAuthProvider,
  type User,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isMessageKey, isRole, type MessageKey, type Role, type UserSummary } from "@reservation/shared";
import { clearCallableCache, readCached, writeCached } from "@/lib/api/cache";
import { api, errorKey } from "@/lib/api/functions";
import { getFirebase, USE_EMULATORS } from "@/lib/firebase/client";
import { getLocale } from "@/lib/i18n/I18nProvider";

export type Profile = UserSummary;

type Status = "loading" | "signed-out" | "signed-in";

interface AuthContextValue {
  status: Status;
  user: User | null;
  /** Role from the ID token, or from the cached profile mirror when offline. */
  role: Role | null;
  profile: Profile | null;
  /** Translation key of the last sign-in error. */
  error: MessageKey | null;
  signIn: () => Promise<void>;
  signInDemo: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function ssoProvider(): FirebaseAuthProvider {
  const id = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "google";
  if (id.startsWith("oidc.")) return new OAuthProvider(id);
  if (id.startsWith("saml.")) return new SAMLAuthProvider(id);
  const google = new GoogleAuthProvider();
  google.setCustomParameters({ prompt: "select_account" });
  return google;
}

const BOOTSTRAP_KEY = "bootstrapped:";
// Survives the reload done by signOut so the sign-in page can say why the session ended.
const SIGN_OUT_REASON_KEY = "signOutReason";
/** Profile refresh interval while signed in (also refreshed on focus, visibility change and reconnect). */
const PROFILE_POLL_MS = 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [claimRole, setClaimRole] = useState<Role | null>(null);
  const [tokenIssuedAt, setTokenIssuedAt] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const refreshedFor = useRef<number | null>(null);

  const signOut = useCallback(async (reason?: MessageKey) => {
    const { auth } = getFirebase();
    if (reason) sessionStorage.setItem(SIGN_OUT_REASON_KEY, reason);
    await firebaseSignOut(auth);
    // Remove cached callable responses (including the profile) from shared devices.
    await clearCallableCache();
    // Full reload on purpose: it resets all in-memory state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/connexion");
  }, []);

  // Session and role claim.
  useEffect(() => {
    const { auth } = getFirebase();
    return onIdTokenChanged(auth, async (u) => {
      if (!u) {
        const reason = sessionStorage.getItem(SIGN_OUT_REASON_KEY);
        if (reason && isMessageKey(reason)) {
          sessionStorage.removeItem(SIGN_OUT_REASON_KEY);
          setError(reason);
        }
        setUser(null);
        setClaimRole(null);
        setProfile(null);
        setStatus("signed-out");
        return;
      }

      // Offline with an expired token this fails; the cached profile then provides the role.
      let token = await u.getIdTokenResult().catch(() => null);
      let role = token && isRole(token.claims.role) ? token.claims.role : null;
      const needsBootstrap = token && (!role || !sessionStorage.getItem(BOOTSTRAP_KEY + u.uid));

      if (needsBootstrap) {
        try {
          const res = await api.bootstrapProfile({ locale: getLocale() });
          sessionStorage.setItem(BOOTSTRAP_KEY + u.uid, "1");
          if (res.claimsChanged) {
            token = await u.getIdTokenResult(true);
            role = isRole(token.claims.role) ? token.claims.role : null;
          }
        } catch (err) {
          if (!role) {
            setError(errorKey(err));
            await firebaseSignOut(auth);
            return;
          }
        }
      }

      setUser(u);
      setClaimRole(role);
      setTokenIssuedAt(token ? Date.parse(token.issuedAtTime) : 0);
      setStatus("signed-in");
    });
  }, []);

  // Profile (one-shot reads through getMyProfile). Refreshed on focus, visibility change,
  // reconnect and on an interval. The last copy stays on the device for offline use.
  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const key = `${uid}:getMyProfile`;

    const refresh = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      try {
        let next = await api.getMyProfile({});
        if (next === null) {
          // Profile not created yet: bootstrap it, then read it again.
          await api.bootstrapProfile({ locale: getLocale() }).catch((err) => console.warn("Profile bootstrap failed", err));
          next = await api.getMyProfile({});
        }
        if (cancelled) return;
        setProfile(next);
        if (next) void writeCached(key, next);
      } catch (err) {
        console.warn("Profile refresh failed", err);
      }
    };

    void readCached<Profile>(key).then((cached) => {
      if (!cancelled && cached) setProfile((prev) => prev ?? cached.data);
    });
    void refresh();
    const timer = setInterval(() => void refresh(), PROFILE_POLL_MS);
    const onWake = () => void refresh();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [uid]);

  // Refresh the ID token when a Function changed our claims (e.g. an admin changed our role).
  useEffect(() => {
    const changedAt = profile?.claimsUpdatedAt ? Date.parse(profile.claimsUpdatedAt) : 0;
    if (!user || !changedAt || changedAt <= tokenIssuedAt || refreshedFor.current === changedAt) return;
    refreshedFor.current = changedAt;
    void user.getIdToken(true);
  }, [user, profile?.claimsUpdatedAt, tokenIssuedAt]);

  // Accounts disabled by the directory sync are signed out.
  useEffect(() => {
    if (profile?.status === "disabled") void signOut("errors.accountDisabled");
  }, [profile?.status, signOut]);

  const signIn = useCallback(async () => {
    setError(null);
    const { auth } = getFirebase();
    try {
      await signInWithPopup(auth, ssoProvider());
    } catch (err) {
      if (err instanceof FirebaseError && err.code === "auth/popup-blocked") {
        await signInWithRedirect(auth, ssoProvider());
        return;
      }
      setError(errorKey(err));
    }
  }, []);

  const signInDemo = useCallback(async (email: string, password: string) => {
    if (!USE_EMULATORS) throw new Error("Demo sign-in is only available with the emulators");
    setError(null);
    try {
      await signInWithEmailAndPassword(getFirebase().auth, email, password);
    } catch (err) {
      setError(errorKey(err));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role: claimRole ?? profile?.role ?? null,
      profile,
      error,
      signIn,
      signInDemo,
      signOut,
    }),
    [status, user, claimRole, profile, error, signIn, signInDemo, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
