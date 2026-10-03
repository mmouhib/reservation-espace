"use client";

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { COL, ROLES, type Role, type Translator, type UserProfile } from "@reservation/shared";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api, errorKey } from "@/lib/api/functions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

const PAGE_SIZE = 20;

type Row = UserProfile<Timestamp> & { id: string };

/** Built at render time, so the text follows a language switch. */
type Notice = { kind: "ok" | "error"; text: (t: Translator["t"]) => string };

export function UsersAdmin() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(
    async (after: QueryDocumentSnapshot | null) => {
      setLoading(true);
      const constraints: QueryConstraint[] = [];
      if (roleFilter !== "all") constraints.push(where("role", "==", roleFilter));
      constraints.push(orderBy("displayName"), limit(PAGE_SIZE));
      if (after) constraints.push(startAfter(after));
      try {
        const snap = await getDocs(query(collection(getFirebase().db, COL.users), ...constraints));
        const page = snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserProfile<Timestamp>) }));
        setRows((prev) => (after ? [...prev, ...page] : page));
        setCursor(snap.docs.at(-1) ?? null);
        setHasMore(snap.size === PAGE_SIZE);
      } catch (err) {
        setNotice({ kind: "error", text: (t) => t(errorKey(err)) });
      } finally {
        setLoading(false);
      }
    },
    [roleFilter],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  async function changeRole(row: Row, role: Role) {
    setBusyUid(row.id);
    setNotice(null);
    try {
      await api.setUserRole({ uid: row.id, role });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, role } : r)));
      setNotice({
        kind: "ok",
        text: (t) => t("admin.users.roleChanged", { name: row.displayName, role: t(`roles.${role}`) }),
      });
    } catch (err) {
      setNotice({ kind: "error", text: (t) => t(errorKey(err)) });
    } finally {
      setBusyUid(null);
    }
  }

  async function syncDirectory() {
    setNotice(null);
    try {
      const res = await api.runDirectorySyncNow({});
      setNotice({ kind: "ok", text: (t) => t("admin.users.syncDone", { count: res.disabled.length }) });
      void load(null);
    } catch (err) {
      setNotice({ kind: "error", text: (t) => t(errorKey(err)) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="role-filter" className="block text-sm font-medium">
            {t("admin.users.filterByRole")}
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
            className="mt-1 min-h-11 rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="all">{t("admin.users.allRoles")}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" className="ml-auto" onClick={() => void syncDirectory()}>
          {t("admin.users.syncDirectory")}
        </Button>
      </div>

      <p role="status" className={notice?.kind === "error" ? "text-sm text-red-700" : "text-sm text-green-800"}>
        {notice?.text(t)}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{t("admin.users.tableCaption")}</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">{t("admin.users.name")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("admin.users.email")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("admin.users.status")}</th>
              <th scope="col" className="px-4 py-3 font-medium">{t("admin.users.role")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium">{row.displayName}</td>
                <td className="px-4 py-3 text-slate-600">{row.email}</td>
                <td className="px-4 py-3">{t(`userStatus.${row.status}`)}</td>
                <td className="px-4 py-3">
                  <label htmlFor={`role-${row.id}`} className="sr-only">
                    {t("admin.users.roleOf", { name: row.displayName })}
                  </label>
                  <select
                    id={`role-${row.id}`}
                    value={row.role}
                    disabled={busyUid === row.id || row.id === user?.uid || row.status !== "active"}
                    onChange={(e) => void changeRole(row, e.target.value as Role)}
                    className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 disabled:bg-slate-100"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`roles.${r}`)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <Spinner />}
        {!loading && rows.length === 0 && <p className="p-6 text-center text-sm text-slate-600">{t("admin.users.empty")}</p>}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => void load(cursor)}>
            {t("admin.users.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
