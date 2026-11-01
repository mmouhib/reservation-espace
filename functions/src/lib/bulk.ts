import type { AnyBulkWriteOperation, ClientSession, Collection, Document, Filter, UpdateFilter } from "mongodb";

export function updateOneOp<T extends Document>(filter: Filter<T>, update: UpdateFilter<T>): AnyBulkWriteOperation<T> {
  return { updateOne: { filter, update } };
}

/**
 * Applies several write operations in one round-trip. Pass a `session` for a known-size
 * group of writes that must commit atomically (inside a `withTransaction` block); omit it
 * for a best-effort fan-out across however many documents match a query, which is not atomic.
 */
export async function bulkUpdate<T extends Document>(
  collection: Collection<T>,
  ops: AnyBulkWriteOperation<T>[],
  session?: ClientSession,
): Promise<void> {
  if (ops.length === 0) return;
  await collection.bulkWrite(ops, { ordered: false, session });
}
