// Client-side helpers for managing the category taxonomy via the API.

type Result = { categories: string[]; changed?: number; error?: string };

async function call(method: string, body?: unknown): Promise<Result> {
  const res = await fetch("/api/categories", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Category request failed.");
  return data;
}

export async function fetchCategories(): Promise<string[]> {
  const { categories } = await call("GET");
  return categories;
}

export async function createCategory(name: string): Promise<string[]> {
  const { categories } = await call("POST", { name });
  return categories;
}

export async function renameCategory(
  from: string,
  to: string
): Promise<string[]> {
  const { categories } = await call("PATCH", { from, to });
  return categories;
}

export async function deleteCategory(
  name: string,
  reassignTo?: string | null
): Promise<string[]> {
  const { categories } = await call("DELETE", { name, reassignTo });
  return categories;
}
