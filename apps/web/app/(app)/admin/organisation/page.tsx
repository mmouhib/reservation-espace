"use client";

import { addDoc, collection, deleteDoc, doc, orderBy, query, updateDoc, where } from "firebase/firestore";
import { useMemo, useState, type FormEvent } from "react";
import { COL, type Department, type Team, type UserProfile } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Button } from "@/components/ui/Button";
import { EmptyState, Section } from "@/components/ui/Card";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection, type WithId } from "@/lib/firebase/hooks";
import { useI18n } from "@/lib/i18n/I18nProvider";

type DepartmentRow = WithId<Department>;
type TeamRow = WithId<Team>;

export default function OrganizationPage() {
  const { t } = useI18n();
  const flash = useFlash();
  const { db } = getFirebase();

  const departmentsQuery = useMemo(() => query(collection(getFirebase().db, COL.departments), orderBy("name")), []);
  const teamsQuery = useMemo(() => query(collection(getFirebase().db, COL.teams), orderBy("name")), []);
  const managersQuery = useMemo(() => query(collection(getFirebase().db, COL.users), where("role", "in", ["manager", "admin"])), []);
  const { data: departments } = useCollection<Department>(departmentsQuery);
  const { data: teams } = useCollection<Team>(teamsQuery);
  const { data: managers } = useCollection<UserProfile>(managersQuery);

  const [department, setDepartment] = useState<{ id: string | null; name: string } | null>(null);
  const [team, setTeam] = useState<{ id: string | null; name: string; departmentId: string; managerIds: string[] } | null>(null);
  const [deleting, setDeleting] = useState<{ collection: string; id: string; name: string } | null>(null);

  async function saveDepartment(e: FormEvent) {
    e.preventDefault();
    if (!department) return;
    try {
      if (department.id) await updateDoc(doc(db, COL.departments, department.id), { name: department.name.trim() });
      else await addDoc(collection(db, COL.departments), { name: department.name.trim() });
      flash.success("common.saved");
      setDepartment(null);
    } catch (err) {
      flash.error(err);
    }
  }

  async function saveTeam(e: FormEvent) {
    e.preventDefault();
    if (!team) return;
    const fields = { name: team.name.trim(), departmentId: team.departmentId, managerIds: team.managerIds };
    try {
      if (team.id) await updateDoc(doc(db, COL.teams, team.id), fields);
      else await addDoc(collection(db, COL.teams), { ...fields, memberIds: [] });
      flash.success("common.saved");
      setTeam(null);
    } catch (err) {
      flash.error(err);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteDoc(doc(db, deleting.collection, deleting.id));
      flash.success("common.deleted");
      setDeleting(null);
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <>
      <DocumentTitle titleKey="admin.organization.title" />
      <PageHeader title={t("admin.organization.title")} description={t("admin.organization.description")} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title={t("admin.organization.departments")}
          icon="building"
          actions={
            <Button size="sm" onClick={() => setDepartment({ id: null, name: "" })}>
              {t("common.add")}
            </Button>
          }
        >
          {departments.length === 0 ? (
            <EmptyState icon="building">{t("admin.organization.noDepartments")}</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {departments.map((d: DepartmentRow) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-medium">{d.name}</span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setDepartment({ id: d.id, name: d.name })}>
                      {t("common.edit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting({ collection: COL.departments, id: d.id, name: d.name })}>
                      {t("common.delete")}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title={t("admin.organization.teams")}
          icon="users"
          actions={
            <Button size="sm" onClick={() => setTeam({ id: null, name: "", departmentId: departments[0]?.id ?? "", managerIds: [] })}>
              {t("common.add")}
            </Button>
          }
        >
          {teams.length === 0 ? (
            <EmptyState icon="users">{t("admin.organization.noTeams")}</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {teams.map((tm: TeamRow) => (
                <li key={tm.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block font-medium">{tm.name}</span>
                    <span className="block text-xs text-slate-600">
                      {departments.find((d) => d.id === tm.departmentId)?.name} · {t("admin.organization.members", { count: tm.memberIds.length })}
                    </span>
                  </span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setTeam({ id: tm.id, name: tm.name, departmentId: tm.departmentId, managerIds: tm.managerIds })}>
                      {t("common.edit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting({ collection: COL.teams, id: tm.id, name: tm.name })}>
                      {t("common.delete")}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Modal open={department !== null} onClose={() => setDepartment(null)} title={department?.id ? t("admin.organization.editDepartment") : t("admin.organization.newDepartment")}>
        {department && (
          <form onSubmit={saveDepartment} className="space-y-4">
            <Field label={t("admin.organization.departmentName")}>
              <Input required maxLength={80} value={department.name} onChange={(e) => setDepartment({ ...department, name: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDepartment(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={team !== null} onClose={() => setTeam(null)} title={team?.id ? t("admin.organization.editTeam") : t("admin.organization.newTeam")}>
        {team && (
          <form onSubmit={saveTeam} className="space-y-4">
            <Field label={t("admin.organization.teamName")}>
              <Input required maxLength={80} value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} />
            </Field>
            <Field label={t("admin.organization.department")}>
              <Select required value={team.departmentId} onChange={(e) => setTeam({ ...team, departmentId: e.target.value })}>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t("admin.organization.managers")}</legend>
              <p className="mb-2 text-xs text-slate-600">{t("admin.organization.managersHint")}</p>
              {managers
                .filter((m) => m.status === "active")
                .map((m) => (
                  <Checkbox
                    key={m.id}
                    label={m.displayName}
                    checked={team.managerIds.includes(m.id)}
                    onChange={(e) => setTeam({ ...team, managerIds: e.target.checked ? [...team.managerIds, m.id] : team.managerIds.filter((id) => id !== m.id) })}
                  />
                ))}
            </fieldset>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTeam(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal open={deleting !== null} onClose={() => setDeleting(null)} onConfirm={() => void remove()} title={t("common.delete")} confirmLabel={t("common.delete")} danger>
        {deleting && t("admin.organization.confirmDelete", { name: deleting.name })}
      </ConfirmModal>
    </>
  );
}
