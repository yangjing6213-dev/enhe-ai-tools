"use client";

import { useEffect, useState } from "react";

export type HeaderSessionUser = {
  email: string | null;
  nickname: string | null;
  role: "admin" | "user";
};

let cachedUser: HeaderSessionUser | null | undefined;
let inflightSessionRequest: Promise<HeaderSessionUser | null> | null = null;

export function resolveHeaderSessionState(
  initialUser: HeaderSessionUser | null,
  cachedSessionUser: HeaderSessionUser | null | undefined
) {
  if (initialUser) {
    return { user: initialUser, loaded: true };
  }

  if (cachedSessionUser !== undefined) {
    return { user: cachedSessionUser, loaded: true };
  }

  return { user: null, loaded: false };
}

async function fetchHeaderSessionUser() {
  const response = await fetch("/api/session", { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as { user: HeaderSessionUser | null };
  return payload.user;
}

function refreshHeaderSessionUser() {
  if (!inflightSessionRequest) {
    inflightSessionRequest = fetchHeaderSessionUser()
      .catch(() => null)
      .then((user) => {
        cachedUser = user;
        return user;
      })
      .finally(() => {
        inflightSessionRequest = null;
      });
  }

  return inflightSessionRequest;
}

export function useHeaderSessionUser(initialUser: HeaderSessionUser | null) {
  const [user, setUser] = useState<HeaderSessionUser | null>(() => resolveHeaderSessionState(initialUser, cachedUser).user);
  const [loaded, setLoaded] = useState(() => resolveHeaderSessionState(initialUser, cachedUser).loaded);

  useEffect(() => {
    let isMounted = true;

    if (initialUser) {
      cachedUser = initialUser;
    }

    const optimisticState = resolveHeaderSessionState(initialUser, cachedUser);
    setUser(optimisticState.user);
    setLoaded(optimisticState.loaded);

    refreshHeaderSessionUser().then((nextUser) => {
      if (!isMounted) return;
      setUser(nextUser);
      setLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [initialUser]);

  return { user, loaded };
}
