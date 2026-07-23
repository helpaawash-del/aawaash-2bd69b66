import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

type AdminPasscodeSession = { unlocked?: boolean };

function getSessionConfig() {
  const password = process.env.ADMIN_PASSCODE_SESSION_SECRET;
  if (!password) throw new Error("Admin passcode session is not configured");
  return {
    password,
    name: "aawash-admin-passcode",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const isAdminPanelUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminPasscodeSession>(getSessionConfig());
  return { unlocked: session.data.unlocked === true };
});

export const unlockAdminPanel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().trim().length(4) }).parse(data))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PANEL_PASSCODE ?? "0000";
    if (!matches(data.passcode, expected)) return { ok: false as const };
    const session = await useSession<AdminPasscodeSession>(getSessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAdminPanel = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminPasscodeSession>(getSessionConfig());
  await session.clear();
  return { ok: true as const };
});