import crypto from "crypto";
import { NextRequest } from "next/server";

// Minimal shared-secret guard for the ops dashboard. Fine for a 2-person
// launch team; replace with real auth (e.g. Auth.js) before hiring staff.
export function adminAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const provided = req.headers.get("x-admin-key") ?? "";
  const a = Buffer.from(secret);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function adminPageAuthorized(key: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !key) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(key);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
