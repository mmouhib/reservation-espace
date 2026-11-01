import type { Filter } from "mongodb";
import { listUsersInput, type UserSummary } from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { toUserSummary, usersCol, type UserDoc } from "./common";

export interface UsersPage {
  users: UserSummary[];
  /** Pass as `after` to get the next page; null when this is the last page. */
  next: { displayName: string; id: string } | null;
}

/**
 * Administrators: users by display name, optionally filtered by role, one page at a time.
 * The cursor is the last user of the previous page (displayName, then id).
 */
export const listUsers = secureCall(
  { name: "listUsers", schema: listUsersInput, role: "admin", rateLimit: { limit: 60, windowSec: 60 } },
  async ({ data }): Promise<UsersPage> => {
    const filters: Filter<UserDoc>[] = [];
    if (data.roles && data.roles.length > 0) filters.push({ role: { $in: data.roles } });
    if (data.after) {
      const { displayName, id } = data.after;
      filters.push({ $or: [{ displayName: { $gt: displayName } }, { displayName, _id: { $gt: id } }] });
    }

    const docs = await (await usersCol())
      .find(filters.length > 0 ? { $and: filters } : {})
      .sort({ displayName: 1, _id: 1 })
      .limit(data.limit)
      .toArray();

    const last = docs.at(-1);
    return {
      users: docs.map(toUserSummary),
      next: docs.length === data.limit && last ? { displayName: last.displayName, id: last._id } : null,
    };
  },
);
