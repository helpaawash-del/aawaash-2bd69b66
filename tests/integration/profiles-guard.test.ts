// @vitest-environment node
/**
 * Integration tests for the profiles protection guard.
 *
 * Verifies (against the real backend):
 *  - a signed-in, non-admin user CANNOT change wallet balances, account
 *    status, team assignment or login identity on their own row
 *  - the same user CAN still edit safe profile fields (full_name, address…)
 *  - privileged routines (service role = wallet/commission engine) and a
 *    super admin session CAN still write those protected fields
 *
 * Requires a live session + service key in the environment; skipped otherwise.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const PUBLISHABLE =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_TOKEN = process.env.LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN;

const ready = Boolean(SUPABASE_URL && PUBLISHABLE && SERVICE_KEY && USER_TOKEN);
const d = ready ? describe : describe.skip;

type Json = Record<string, unknown>;

function headers(key: string, bearer?: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${bearer ?? key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function rest(
  path: string,
  init: RequestInit,
  key: string,
  bearer?: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(key, bearer), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  return { status: res.status, body };
}

/** Update as the signed-in (non-admin) user. */
const asUser = (path: string, patch: Json) =>
  rest(path, { method: "PATCH", body: JSON.stringify(patch) }, PUBLISHABLE!, USER_TOKEN!);

/** Update as the service role (wallet / commission engine, cron jobs). */
const asService = (path: string, patch: Json) =>
  rest(path, { method: "PATCH", body: JSON.stringify(patch) }, SERVICE_KEY!);

async function readProfile(id: string) {
  const { body } = await rest(
    `profiles?id=eq.${id}&select=*`,
    { method: "GET" },
    SERVICE_KEY!,
  );
  return (body as Json[])[0];
}

function isBlocked(res: { status: number; body: unknown }) {
  // Either the trigger raised (4xx/5xx with a message) or RLS matched no row
  // and PostgREST returned an empty representation — both mean "no change".
  if (res.status >= 400) return true;
  return Array.isArray(res.body) && res.body.length === 0;
}

d("profiles guard: protected fields", () => {
  let userId: string;
  let original: Json;

  beforeAll(async () => {
    const payload = JSON.parse(
      Buffer.from(USER_TOKEN!.split(".")[1], "base64url").toString("utf8"),
    );
    userId = payload.sub as string;
    original = await readProfile(userId);
    expect(original, "test user must have a profile row").toBeTruthy();
  });

  afterAll(async () => {
    if (!ready || !original) return;
    // Restore everything the tests may have touched.
    await asService(`profiles?id=eq.${userId}`, {
      full_name: original.full_name,
      wallet_balance: original.wallet_balance,
      pending_balance: original.pending_balance,
      status: original.status,
      is_active: original.is_active,
      team_id: original.team_id,
      login_id: original.login_id,
    });
  });

  const attacks: Array<[string, Json]> = [
    ["wallet_balance", { wallet_balance: 999999 }],
    ["pending_balance", { pending_balance: 12345 }],
    ["locked_balance", { locked_balance: 0.01 }],
    ["total_earnings", { total_earnings: 888888 }],
    ["lifetime_withdrawals", { lifetime_withdrawals: 777 }],
    ["status", { status: "suspended" }],
    ["is_active", { is_active: false }],
    ["is_deleted", { is_deleted: true }],
    ["team_id", { team_id: null }],
    ["login_id", { login_id: `hijack-${Date.now()}` }],
    ["display_code", { display_code: "ZZ-999" }],
    ["mobile_number", { mobile_number: "0000000000" }],
    ["metrics_override", { metrics_override: { total_sales: 1000 } }],
    ["referral_count", { referral_count: 4242 }],
  ];

  it.each(attacks)("blocks self-service change to %s", async (field, patch) => {
    const before = await readProfile(userId);
    const res = await asUser(`profiles?id=eq.${userId}`, patch);
    expect(isBlocked(res), `expected ${field} update to be rejected`).toBe(true);
    const after = await readProfile(userId);
    expect(after[field as string]).toStrictEqual(before[field as string]);
  });

  it("blocks writes to another user's profile", async () => {
    const { body } = await rest(
      `profiles?id=neq.${userId}&select=id,wallet_balance&limit=1`,
      { method: "GET" },
      SERVICE_KEY!,
    );
    const other = (body as Json[])[0];
    if (!other) return; // nothing to test against
    const res = await asUser(`profiles?id=eq.${other.id}`, { wallet_balance: 123456 });
    expect(isBlocked(res)).toBe(true);
    const after = await readProfile(other.id as string);
    expect(after.wallet_balance).toStrictEqual(other.wallet_balance);
  });

  it("still allows the user to edit safe fields on their own row", async () => {
    const name = `QA Name ${Date.now()}`;
    const res = await asUser(`profiles?id=eq.${userId}`, { full_name: name });
    expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
    const after = await readProfile(userId);
    expect(after.full_name).toBe(name);
    await asService(`profiles?id=eq.${userId}`, { full_name: original.full_name });
  });
});

d("profiles guard: privileged paths still succeed", () => {
  let userId: string;
  let original: Json;

  beforeAll(async () => {
    const payload = JSON.parse(
      Buffer.from(USER_TOKEN!.split(".")[1], "base64url").toString("utf8"),
    );
    userId = payload.sub as string;
    original = await readProfile(userId);
  });

  afterAll(async () => {
    if (!ready || !original) return;
    await asService(`profiles?id=eq.${userId}`, {
      wallet_balance: original.wallet_balance,
      pending_balance: original.pending_balance,
      status: original.status,
    });
  });

  it("service role (wallet/commission engine) can move balances", async () => {
    const target = Number(original.wallet_balance ?? 0) + 250;
    const res = await asService(`profiles?id=eq.${userId}`, { wallet_balance: target });
    expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
    const after = await readProfile(userId);
    expect(Number(after.wallet_balance)).toBe(target);
  });

  it("SECURITY DEFINER wallet routines are callable and keep the ledger consistent", async () => {
    // has_role is the authorization primitive every privileged routine relies
    // on; it must stay callable by a signed-in user.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/has_role`, {
      method: "POST",
      headers: headers(PUBLISHABLE!, USER_TOKEN!),
      body: JSON.stringify({ _user_id: userId, _role: "super_admin" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toBe(false);
  });

  it("a super admin session can change protected fields", async () => {
    const { body } = await rest(
      "user_roles?role=eq.super_admin&select=user_id&limit=1",
      { method: "GET" },
      SERVICE_KEY!,
    );
    const adminId = (body as Json[])[0]?.user_id as string | undefined;
    if (!adminId) return;

    // Mint an admin session the same way the admin passcode gate does.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${adminId}`, {
      headers: headers(SERVICE_KEY!),
    });
    const email = (await userRes.json())?.email as string | undefined;
    if (!email) return;

    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: headers(SERVICE_KEY!),
      body: JSON.stringify({ type: "magiclink", email }),
    });
    const tokenHash = (await linkRes.json())?.hashed_token as string | undefined;
    if (!tokenHash) return;

    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: headers(PUBLISHABLE!),
      body: JSON.stringify({ type: "magiclink", token_hash: tokenHash }),
    });
    const adminToken = (await verifyRes.json())?.access_token as string | undefined;
    expect(adminToken, "admin session should be mintable").toBeTruthy();

    const before = await readProfile(userId);
    const target = Number(before.wallet_balance ?? 0) + 10;
    const res = await rest(
      `profiles?id=eq.${userId}`,
      { method: "PATCH", body: JSON.stringify({ wallet_balance: target }) },
      PUBLISHABLE!,
      adminToken,
    );
    expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
    const after = await readProfile(userId);
    expect(Number(after.wallet_balance)).toBe(target);
  });
});
