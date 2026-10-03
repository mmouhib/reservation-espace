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
import { COL, ROLE_LABELS, ROLES, type Role, type UserProfile } from "@reservation/shared";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api, errorMessage } from "@/lib/api/functions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";

const PAGE_SIZE = 20;

type Row = UserProfile<Timestamp> & { id: string };

const STATUS_LABELS: Record<UserProfile["status"], string> = {
  active: "Actif",
  disabled: "Désactivé",
  anonymized: "Anonymisé",
};

export function UsersAdmin() {
  const { user } = useAuth();
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

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
        setNotice({ kind: "error", text: errorMessage(err) });
      } finally {
        setLoading(false);
      }
    },
    [roleFilter],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    void load(null);
  }, [load]);

  async function changeRole(row: Row, role: Role) {
    setBusyUid(row.id);
    setNotice(null);
    try {
      await api.setUserRole({ uid: row.id, role });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, role } : r)));
      setNotice({ kind: "ok", text: `${row.displayName} est maintenant ${ROLE_LABELS[role].toLowerCase()}.` });
    } catch (err) {
      setNotice({ kind: "error", text: errorMessage(err) });
    } finally {
      setBusyUid(null);
    }
  }

  async function syncDirectory() {
    setNotice(null);
    try {
      const res = await api.runDirectorySyncNow({});
      setNotice({ kind: "ok", text: `Synchronisation terminée : ${res.disabled.length} compte(s) désactivé(s).` });
      void load(null);
    } catch (err) {
      setNotice({ kind: "error", text: errorMessage(err) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="role-filter" className="block text-sm font-medium">
            Filtrer par rôle
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
            className="mt-1 min-h-11 rounded-lg border border-slate-300 bg-white px-3"
          >
            <option value="all">Tous</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" className="ml-auto" onClick={() => void syncDirectory()}>
          Synchroniser l&apos;annuaire
        </Button>
      </div>

      <p role="status" className={notice?.kind === "error" ? "text-sm text-red-700" : "text-sm text-green-800"}>
        {notice?.text}
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Liste des utilisateurs</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Nom</th>
              <th scope="col" className="px-4 py-3 font-medium">E-mail</th>
              <th scope="col" className="px-4 py-3 font-medium">Statut</th>
              <th scope="col" className="px-4 py-3 font-medium">Rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium">{row.displayName}</td>
                <td className="px-4 py-3 text-slate-600">{row.email}</td>
                <td className="px-4 py-3">{STATUS_LABELS[row.status]}</td>
                <td className="px-4 py-3">
                  <label htmlFor={`role-${row.id}`} className="sr-only">
                    Rôle de {row.displayName}
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
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <Spinner />}
        {!loading && rows.length === 0 && <p className="p-6 text-center text-sm text-slate-600">Aucun utilisateur.</p>}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => void load(cursor)}>
            Charger plus
          </Button>
        </div>
      )}
    </div>
  );
}
