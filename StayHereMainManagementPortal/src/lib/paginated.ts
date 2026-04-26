export type PaginatedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function asPaginated<T>(data: unknown): PaginatedResult<T> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (!Array.isArray(o.items)) return null;
  return {
    items: o.items as T[],
    totalCount: Number(o.totalCount) || 0,
    page: Number(o.page) || 1,
    pageSize: Number(o.pageSize) || 20,
    totalPages: Number(o.totalPages) || 0,
  };
}
