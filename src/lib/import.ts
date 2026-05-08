/**
 * Shared import logic — used by both the URL-based ImportHandler (root
 * route detects ?import=) and the paste-from-PWA modal (iOS PWA can't
 * receive the URL because its IndexedDB is isolated from Safari, so the
 * coach pastes the same URL inside the installed app instead).
 */
import { db } from "../db";
import { decodeShare, type SharePayload } from "./share";
import { planToTrio, DEFAULT_MEET_ID } from "../routes/Live";
import { buildDemoRivals } from "./demoRivals";

/** Pull the `import` query value out of either a full URL, a query
 * string, or a bare `import=...` fragment. Returns null if absent. */
export function extractImportParam(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  // Try as full URL first
  try {
    const url = new URL(text);
    const v = url.searchParams.get("import");
    if (v) return v;
  } catch {
    // Not a URL — fall through
  }
  // Try as query string starting with ? or directly
  const idx = text.indexOf("import=");
  if (idx >= 0) {
    return text.slice(idx + "import=".length).split("&")[0];
  }
  return null;
}

/** Write a decoded payload into IndexedDB and rebuild LiveSession.mine.
 * `fresh` deletes any existing LiveSession first so demo rivals get
 * regenerated (otherwise existing rivals are kept untouched). */
export async function applyImport(
  payload: SharePayload,
  opts: { fresh: boolean },
): Promise<void> {
  await db.athletes.put(payload.athlete);
  await db.plans.put(payload.plan);
  if (opts.fresh) await db.liveSessions.delete(DEFAULT_MEET_ID);
  const existing = await db.liveSessions.get(DEFAULT_MEET_ID);
  const next = existing
    ? {
        ...existing,
        myAthleteId: payload.athlete.id,
        mine: planToTrio(payload.plan),
        updatedAt: new Date().toISOString(),
      }
    : {
        meetId: DEFAULT_MEET_ID,
        myAthleteId: payload.athlete.id,
        mine: planToTrio(payload.plan),
        rivals: buildDemoRivals(payload.athlete, payload.plan),
        focus: { lift: "S" as const, attempt: 1 as const },
        updatedAt: new Date().toISOString(),
      };
  await db.liveSessions.put(next);
}

/** End-to-end: parse text, decode, write. Returns error string or null on success. */
export async function importFromText(
  text: string,
  opts: { fresh: boolean },
): Promise<string | null> {
  const data = extractImportParam(text);
  if (!data) return "没找到 import= 参数";
  const payload = decodeShare(data);
  if (!payload) return "链接无效或损坏";
  await applyImport(payload, opts);
  return null;
}
