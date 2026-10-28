import type { AnyBulkWriteOperation, ClientSession, Collection, Document, Filter, UpdateFilter } from "mongodb";

export function updateOneOp<T extends Document>(filter: Filter<T>, update: UpdateFilter<T>): AnyBulkWriteOperation<T> {
  return { updateOne: { filter, update } };
}

/**
 * Applies several write operations in one round-trip. Pass a `session` for the
 * `db.batch()`-equivalent case (a known-size group of writes that must commit
 * atomically, run inside a `withTransaction` block); omit it for the
 * `db.bulkWriter()`-equivalent case (best-effort fan-out across however many
 * documents match a query, not required to be atomic — matching Firestore's
 * bulkWriter, which isn't transactional either).
 */
export async function bulkUpdate<T extends Document>(
  collection: Collection<T>,
  ops: AnyBulkWriteOperation<T>[],
  session?: ClientSession,
): Promise<void> {
  if (ops.length === 0) return;
  await collection.bulkWrite(ops, { ordered: false, session });
}
