import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAdminPasscodeSession, passcodeMatches } from "./admin-passcode.server";

export const isAdminPanelUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getAdminPasscodeSession();
  return { unlocked: session.data.unlocked === true };
});

export const unlockAdminPanel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ passcode: z.string().trim().length(4) }).parse(data))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PANEL_PASSCODE ?? "0000";
    if (!passcodeMatches(data.passcode, expected)) return { ok: false as const };
    const session = await getAdminPasscodeSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAdminPanel = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAdminPasscodeSession();
  await session.clear();
  return { ok: true as const };
});