/**
 * URL-based share: encode an athlete + plan into a base64 URL hash so a
 * coach can scan a QR or send a link from desktop /plan to a phone /live.
 *
 * Single-direction, manual sync. The receiving device decodes the payload,
 * upserts athlete + plan into IndexedDB, and rebuilds LiveSession.mine
 * from the plan via planToTrio.
 */
import type { Athlete, Plan } from "../types";

export type SharePayload = {
  /** Schema version for forward compatibility. Bump on breaking change. */
  v: 1;
  athlete: Athlete;
  plan: Plan;
};

/** UTF-8 safe base64 (handles Chinese in athlete names / notes). */
function utf8ToBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToUtf8(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeShare(payload: SharePayload): string {
  return utf8ToBase64Url(JSON.stringify(payload));
}

export function decodeShare(s: string): SharePayload | null {
  try {
    const parsed = JSON.parse(base64UrlToUtf8(s)) as SharePayload;
    if (parsed.v !== 1 || !parsed.athlete || !parsed.plan) return null;
    return parsed;
  } catch {
    return null;
  }
}
