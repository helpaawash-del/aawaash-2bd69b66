import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

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

export function passcodeMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function getAdminPasscodeSession() {
  return useSession<AdminPasscodeSession>(getSessionConfig());
}