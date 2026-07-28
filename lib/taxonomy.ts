import { getSetting, setSetting } from "./db";
import { CATEGORIES } from "./categories";

const KEY = "taxonomy";

/** The effective category list: the user's saved taxonomy, or the built-ins. */
export async function getTaxonomy(): Promise<string[]> {
  const raw = await getSetting(KEY);
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

export async function saveTaxonomy(list: string[]): Promise<void> {
  await setSetting(KEY, JSON.stringify(list));
}
