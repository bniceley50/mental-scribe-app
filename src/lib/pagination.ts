// Simple helpers for keyset pagination flows

export const DEFAULT_PAGE_SIZE = 30;

export type WithId = { id: string };
export type WithCreatedAt = { created_at: string };

export function dedupeById<T extends WithId>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export function sortByCreatedAtAsc<T extends WithCreatedAt>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export function sortByCreatedAtDesc<T extends WithCreatedAt>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
