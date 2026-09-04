import { describe, expect, it } from "vitest";
import { resolveHeaderSessionState, type HeaderSessionUser } from "@/components/header-session";

const cachedAdminUser: HeaderSessionUser = {
  email: "admin@example.com",
  nickname: "Admin",
  role: "admin"
};

const serverUser: HeaderSessionUser = {
  email: "user@example.com",
  nickname: "User",
  role: "user"
};

describe("header session state", () => {
  it("keeps a cached user visible when a route transition arrives without a server snapshot", () => {
    expect(resolveHeaderSessionState(null, cachedAdminUser)).toEqual({
      user: cachedAdminUser,
      loaded: true
    });
  });

  it("uses the explicit server snapshot before stale cached state", () => {
    expect(resolveHeaderSessionState(serverUser, cachedAdminUser)).toEqual({
      user: serverUser,
      loaded: true
    });
  });

  it("keeps a cold unknown session in loading state until the session endpoint answers", () => {
    expect(resolveHeaderSessionState(null, undefined)).toEqual({
      user: null,
      loaded: false
    });
  });
});
