import { it, expect } from "vitest";
import { accountActivity, type User } from "../workspace/model.js";
const at = Date.parse("2026-09-22T12:00:00Z");
const user: User = {
  id: "u",
  username: "tester",
  email: "t@example.com",
  role: "reviewer",
  forms: ["arr"],
  active: true,
  generation: 1,
  password: { salt: "x", hash: "x" },
};
const state = (hours: number, loggedIn = true, extra: Partial<User> = {}) =>
  accountActivity(
    {
      ...user,
      lastActivityAt: new Date(at - hours * 3600000).toISOString(),
      ...extra,
    },
    loggedIn,
    at,
  );
it("distinguishes signed-in activity, idle and signed-out recent activity", () => {
  expect(state(0)).toEqual({ label: "active", tone: "green", hours: 0 });
  expect(state(1).label).toBe("active");
  expect(state(1.01)).toEqual({ label: "idle", tone: "green", hours: 1 });
  expect(state(47.99).label).toBe("idle");
  expect(state(35, false)).toEqual({
    label: "active",
    tone: "mustard",
    hours: 35,
  });
});
it("uses elapsed thresholds, whole hours and red after 240 hours regardless of sessions", () => {
  for (const loggedIn of [true, false]) {
    expect(state(48, loggedIn)).toEqual({
      label: "inactive",
      tone: "mustard",
      hours: 48,
    });
    expect(state(240, loggedIn).tone).toBe("mustard");
    expect(state(240.01, loggedIn)).toEqual({
      label: "not active",
      tone: "red",
      hours: 240,
    });
    expect(state(245.8, loggedIn).hours).toBe(245);
  }
});
it("keeps suspension dominant and labels missing/password-pending/disabled accounts red", () => {
  expect(state(35, true, { suspendedAt: new Date(at).toISOString() })).toEqual({
    label: "suspended",
    tone: "red",
    hours: null,
  });
  expect(accountActivity(user, true, at)).toEqual({
    label: "not active",
    tone: "red",
    hours: null,
  });
  expect(state(0, true, { password: undefined }).tone).toBe("red");
  expect(state(0, true, { active: false }).tone).toBe("red");
  expect(state(0, true, { lastActivityAt: "invalid" }).hours).toBeNull();
});
