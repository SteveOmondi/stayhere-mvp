export type Paginated<T> = { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number };

export function asPaginated<T>(data: unknown): Paginated<T> | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.items)) return null;
  return {
    items: d.items as T[],
    totalCount: Number(d.totalCount ?? d.total ?? d.items.length),
    page: Number(d.page ?? 1),
    pageSize: Number(d.pageSize ?? d.items.length),
    totalPages: Number(d.totalPages ?? 1),
  };
}
