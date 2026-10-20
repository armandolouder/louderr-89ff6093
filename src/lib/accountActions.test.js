import { describe, expect, test } from "bun:test";
import { changeAccountPassword, endAccountSession } from "./accountActions";

describe("account access", () => {
  test("password changes send current password for server validation", async () => {
    let attributes;
    await changeAccountPassword({ updateUser: async (value) => { attributes = value; return { error: null }; } }, "old-test-password", "new-test-password", "new-test-password");
    expect(attributes).toEqual({ current_password: "old-test-password", password: "new-test-password" });
  });
  test("mismatched confirmation never updates the account", async () => {
    let called = false;
    await expect(changeAccountPassword({ updateUser: async () => { called = true; return { error: null }; } }, "old-test-password", "new-test-password", "different")).rejects.toThrow();
    expect(called).toBe(false);
  });
  test("server rejection is not treated as a successful password change", async () => {
    await expect(changeAccountPassword({ updateUser: async () => ({ error: { code: "weak_password", message: "weak" } }) }, "old-test-password", "new-test-password", "new-test-password")).rejects.toThrow();
  });
  test("logout ends the current session before clearing account data and redirecting", async () => {
    const actions = [];
    await endAccountSession({ signOut: async (options) => { actions.push(options.scope); return { error: null }; } }, () => actions.push("clear"), () => actions.push("login"));
    expect(actions).toEqual(["local", "clear", "login"]);
  });
  test("failed logout does not claim success or redirect", async () => {
    let cleared = false;
    let redirected = false;
    await expect(endAccountSession({ signOut: async () => ({ error: { message: "offline" } }) }, () => { cleared = true; }, () => { redirected = true; })).rejects.toThrow();
    expect(cleared).toBe(false);
    expect(redirected).toBe(false);
  });
});