// Pure helpers for the metrics endpoint. Kept dependency-free so they can be
// unit tested without a Prisma client.

/**
 * Build the column distribution array consumed by the Metrics page.
 *
 * @param {Array<{ id: string, name: string }>} columns
 *   Project columns in display order.
 * @param {Array<{ columnId: string, _count: { _all: number } }>} groups
 *   Result of `prisma.card.groupBy({ by: ['columnId'], where: { archived: false, ... } })`.
 * @returns {Array<{ name: string, count: number }>}
 *   One entry per column. Missing columns (no non-archived cards) render as 0.
 */
export function buildColumnStats(columns, groups) {
  const countByColumnId = new Map();
  for (const g of groups || []) {
    const n = g?._count?._all ?? 0;
    countByColumnId.set(g.columnId, n);
  }
  return columns.map((c) => ({
    name: c.name,
    count: countByColumnId.get(c.id) ?? 0,
  }));
}
