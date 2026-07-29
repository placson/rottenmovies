import { getSetting, setSetting } from "./db";
import { CATEGORIES } from "./categories";

const keyFor = (userId: string) => `taxonomy:${userId}`;

/** The effective category list for a user: their saved taxonomy, or defaults. */
export async function getTaxonomy(userId: string): Promise<string[]> {
  const raw = await getSetting(keyFor(userId));
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((c) => typeof c === "string");
    } catch {
      /* fall through to defaults */
    }
  }
  return [...CATEGORIES];
}

export async function saveTaxonomy(
  userId: string,
  list: string[]
): Promise<void> {
  await setSetting(keyFor(userId), JSON.stringify(list));
}
