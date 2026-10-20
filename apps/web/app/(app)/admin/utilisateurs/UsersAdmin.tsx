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
import { useCallback, useEffect, useMemo, useState } from "react";
import { COL, ROLES, type Department, type Role, type Team, type Translator, type UserProfile } from "@reservation/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Select } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Table, Td } from "@/components/ui/Table";
import { api, errorKey } from "@/lib/api/functions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection } from "@/lib/firebase/hooks";
import { useI18n } from "@/lib/i18n/I18nProvider";

const PAGE_SIZE = 20;

type Row = UserProfile<Timestamp> & { id: string };

/** Built at render time, so the text follows a language switch. */
type Notice = { kind: "ok" | "error"; text: (t: Translator["t"]) => string };

export function UsersAdmin() {
  const { user } = useAuth();
  const { t } = useI18n();
  const flash = useFlash();
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const departmentsQuery = useMemo(() => query(collection(getFirebase().db, COL.departments), orderBy("name")), []);
  const teamsQuery = useMemo(() => query(collection(getFirebase().db, COL.teams), orderBy("name")), []);
  const { data: departments } = useCollection<Department>(departmentsQuery);
  const { data: teams } = useCollection<Team>(teamsQuery);

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
      setNotice({ kind: "ok", text: (t) => t("admin.users.roleChanged", { name: row.displayName, role: t(`roles.${role}`) }) });
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

  async function removeAccount() {
    if (!deleting) return;
    try {
      await api.anonymizeUser({ uid: deleting.id });
      flash.success("admin.users.anonymized");
      setDeleting(null);
      void load(null);
    } catch (err) {
      flash.error(err);
    }
  }

  const departmentName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? "";
  const teamNames = (ids: string[]) => ids.map((id) => teams.find((team) => team.id === id)?.name ?? id).join(", ");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("admin.users.filterByRole")}>
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | "all")} className="min-w-44">
            <option value="all">{t("admin.users.allRoles")}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="secondary" className="ml-auto" onClick={() => void syncDirectory()}>
          {t("admin.users.syncDirectory")}
        </Button>
      </div>

      <p role="status" className={notice?.kind === "error" ? "text-sm text-red-700" : "text-sm text-green-800"}>
        {notice?.text(t)}
      </p>

      <Table
        caption={t("admin.users.tableCaption")}
        headers={[t("admin.users.name"), t("admin.users.email"), t("admin.users.department"), t("admin.users.status"), t("admin.users.role"), t("admin.users.actions")]}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <Td className="font-medium">{row.displayName}</Td>
            <Td className="text-slate-600">{row.email}</Td>
            <Td className="text-slate-600">
              {departmentName(row.departmentId) || "—"}
              {row.teamIds?.length > 0 && <span className="block text-xs">{teamNames(row.teamIds)}</span>}
            </Td>
            <Td>
              <Badge tone={row.status === "active" ? "success" : "neutral"}>{t(`userStatus.${row.status}`)}</Badge>
            </Td>
            <Td>
              <label htmlFor={`role-${row.id}`} className="sr-only">
                {t("admin.users.roleOf", { name: row.displayName })}
              </label>
              <Select
                id={`role-${row.id}`}
                value={row.role}
                disabled={busyUid === row.id || row.id === user?.uid || row.status !== "active"}
                onChange={(e) => void changeRole(row, e.target.value as Role)}
                className="min-h-9 w-auto px-2"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </Select>
            </Td>
            <Td>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={row.status !== "active"} onClick={() => setEditing(row)}>
                  {t("common.edit")}
                </Button>
                <Button size="sm" variant="ghost" disabled={row.id === user?.uid || row.status === "anonymized"} onClick={() => setDeleting(row)}>
                  {t("common.delete")}
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </Table>
      {loading && <Spinner />}
      {!loading && rows.length === 0 && <p className="p-6 text-center text-sm text-slate-600">{t("admin.users.empty")}</p>}

      {hasMore && !loading && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => void load(cursor)}>
            {t("admin.users.loadMore")}
          </Button>
        </div>
      )}

      <OrganizationModal
        row={editing}
        departments={departments}
        teams={teams}
        onClose={() => setEditing(null)}
        onSaved={(row) => {
          setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
          setEditing(null);
        }}
      />
      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void removeAccount()}
        title={t("admin.users.anonymizeTitle")}
        confirmLabel={t("admin.users.anonymize")}
        danger
      >
        {deleting && t("admin.users.anonymizeConfirm", { name: deleting.displayName })}
      </ConfirmModal>
    </div>
  );
}

/** Puts a user in a department and in teams. */
function OrganizationModal({
  row,
  departments,
  teams,
  onClose,
  onSaved,
}: {
  row: Row | null;
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (row: Row) => void;
}) {
  const { t } = useI18n();
  const flash = useFlash();
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<{ id: string; departmentId: string | null; teamIds: string[] } | null>(null);
  const form = row ? (edit?.id === row.id ? edit : { id: row.id, departmentId: row.departmentId, teamIds: row.teamIds ?? [] }) : null;

  async function save() {
    if (!row || !form) return;
    setBusy(true);
    try {
      await api.updateUserOrg({ uid: row.id, departmentId: form.departmentId, teamIds: form.teamIds });
      flash.success("admin.users.orgUpdated");
      onSaved({ ...row, departmentId: form.departmentId, teamIds: form.teamIds });
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={row !== null}
      onClose={onClose}
      title={t("admin.users.editOrg")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      {row && form && (
        <>
          <p className="font-semibold">{row.displayName}</p>
          <Field label={t("admin.users.department")}>
            <Select value={form.departmentId ?? ""} onChange={(e) => setEdit({ ...form, departmentId: e.target.value || null })}>
              <option value="">{t("admin.users.noDepartment")}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{t("admin.users.teams")}</legend>
            {teams.map((team) => (
              <Checkbox
                key={team.id}
                label={team.name}
                checked={form.teamIds.includes(team.id)}
                onChange={(e) => setEdit({ ...form, teamIds: e.target.checked ? [...form.teamIds, team.id] : form.teamIds.filter((id) => id !== team.id) })}
              />
            ))}
          </fieldset>
        </>
      )}
    </Modal>
  );
}
