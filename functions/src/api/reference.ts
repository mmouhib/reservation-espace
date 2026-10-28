import { ObjectId } from "mongodb";
import {
  createDepartmentInput,
  createSiteInput,
  createSpaceInput,
  createTeamInput,
  deleteDepartmentInput,
  deleteSiteInput,
  deleteSpaceInput,
  deleteTeamInput,
  emptyInput,
  listSpacesInput,
  updateDepartmentInput,
  updateSiteInput,
  updateSpaceInput,
  updateTeamInput,
  type DepartmentSummary,
  type SiteSummary,
  type SpaceSummary,
  type TeamSummary,
} from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { departmentsCol, sitesCol, spacesCol, teamsCol, toSiteSummary, toSpaceSummary, toTeamSummary, type DepartmentDoc } from "./common";

const ADMIN_WRITE = { rateLimit: { limit: 60, windowSec: 60 } };

const notFoundSite = () => appError("not-found", "spaceNotFound", "Site not found.");
const notFoundSpace = () => appError("not-found", "spaceNotFound", "Space not found.");
const notFoundTeam = () => appError("not-found", "invalidInput", "Team not found.");
const notFoundDepartment = () => appError("not-found", "invalidInput", "Department not found.");

// ---------- Sites and spaces ----------

/** All sites, by name. Any signed-in user (the booking and visitor screens need them). */
export const listSites = secureCall({ name: "listSites", schema: emptyInput }, async (): Promise<SiteSummary[]> => {
  const docs = await (await sitesCol()).find({}).sort({ name: 1 }).toArray();
  return docs.map(toSiteSummary);
});

/** Spaces, by name, optionally of one site. Any signed-in user. */
export const listSpaces = secureCall({ name: "listSpaces", schema: listSpacesInput }, async ({ data }): Promise<SpaceSummary[]> => {
  const docs = await (await spacesCol()).find(data.siteId ? { siteId: data.siteId } : {}).sort({ name: 1 }).toArray();
  return docs.map(toSpaceSummary);
});

/** Administrator creates a site. */
export const createSite = secureCall({ name: "createSite", schema: createSiteInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const siteId = new ObjectId().toHexString();
  await (await sitesCol()).insertOne({ _id: siteId, ...data });
  return { siteId };
});

/** Administrator edits a site's details. */
export const updateSite = secureCall({ name: "updateSite", schema: updateSiteInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const { siteId, ...fields } = data;
  const result = await (await sitesCol()).updateOne({ _id: siteId }, { $set: fields });
  if (result.matchedCount === 0) throw notFoundSite();
  return { updated: true };
});

/** Administrator deletes a site. Refused while the site still has spaces. */
export const deleteSite = secureCall({ name: "deleteSite", schema: deleteSiteInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const hasSpaces = await (await spacesCol()).countDocuments({ siteId: data.siteId }, { limit: 1 });
  if (hasSpaces > 0) throw appError("failed-precondition", "invalidInput", "This site still has spaces: delete them first.");
  const result = await (await sitesCol()).deleteOne({ _id: data.siteId });
  if (result.deletedCount === 0) throw notFoundSite();
  return { deleted: true };
});

/** Administrator creates a space in a site. */
export const createSpace = secureCall({ name: "createSpace", schema: createSpaceInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  if (!(await (await sitesCol()).findOne({ _id: data.siteId }, { projection: { _id: 1 } }))) throw notFoundSite();
  const now = new Date();
  const spaceId = new ObjectId().toHexString();
  await (await spacesCol()).insertOne({ _id: spaceId, ...data, createdAt: now, updatedAt: now });
  return { spaceId };
});

/** Administrator edits a space. The creation date is kept. */
export const updateSpace = secureCall({ name: "updateSpace", schema: updateSpaceInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const { spaceId, ...fields } = data;
  if (!(await (await sitesCol()).findOne({ _id: fields.siteId }, { projection: { _id: 1 } }))) throw notFoundSite();
  const result = await (await spacesCol()).updateOne({ _id: spaceId }, { $set: { ...fields, updatedAt: new Date() } });
  if (result.matchedCount === 0) throw notFoundSpace();
  return { updated: true };
});

/** Administrator deletes a space. */
export const deleteSpace = secureCall({ name: "deleteSpace", schema: deleteSpaceInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const result = await (await spacesCol()).deleteOne({ _id: data.spaceId });
  if (result.deletedCount === 0) throw notFoundSpace();
  return { deleted: true };
});

// ---------- Departments and teams ----------

/** All departments, by name. Any signed-in user (a profile shows its department name). */
export const listDepartments = secureCall({ name: "listDepartments", schema: emptyInput }, async (): Promise<DepartmentSummary[]> => {
  const docs = await (await departmentsCol()).find({}).sort({ name: 1 }).toArray();
  return docs.map((d: DepartmentDoc) => ({ id: d._id, name: d.name }));
});

/** The teams the signed-in user is a member of. */
export const listMyTeams = secureCall({ name: "listMyTeams", schema: emptyInput }, async ({ uid }): Promise<TeamSummary[]> => {
  const docs = await (await teamsCol()).find({ memberIds: uid }).sort({ name: 1 }).toArray();
  return docs.map(toTeamSummary);
});

/** All teams with their members, by name. Administrators only. */
export const listTeams = secureCall({ name: "listTeams", schema: emptyInput, role: "admin" }, async (): Promise<TeamSummary[]> => {
  const docs = await (await teamsCol()).find({}).sort({ name: 1 }).toArray();
  return docs.map(toTeamSummary);
});

/** Administrator creates a department. */
export const createDepartment = secureCall({ name: "createDepartment", schema: createDepartmentInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const departmentId = new ObjectId().toHexString();
  await (await departmentsCol()).insertOne({ _id: departmentId, name: data.name });
  return { departmentId };
});

/** Administrator renames a department. */
export const updateDepartment = secureCall({ name: "updateDepartment", schema: updateDepartmentInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const result = await (await departmentsCol()).updateOne({ _id: data.departmentId }, { $set: { name: data.name } });
  if (result.matchedCount === 0) throw notFoundDepartment();
  return { updated: true };
});

/** Administrator deletes a department. */
export const deleteDepartment = secureCall({ name: "deleteDepartment", schema: deleteDepartmentInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const result = await (await departmentsCol()).deleteOne({ _id: data.departmentId });
  if (result.deletedCount === 0) throw notFoundDepartment();
  return { deleted: true };
});

/** Administrator creates a team. It starts with no members; members are set through updateUserOrg. */
export const createTeam = secureCall({ name: "createTeam", schema: createTeamInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const teamId = new ObjectId().toHexString();
  await (await teamsCol()).insertOne({ _id: teamId, ...data, memberIds: [] });
  return { teamId };
});

/** Administrator edits a team's name, department and managers. Members are not changed here. */
export const updateTeam = secureCall({ name: "updateTeam", schema: updateTeamInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const { teamId, ...fields } = data;
  const result = await (await teamsCol()).updateOne({ _id: teamId }, { $set: fields });
  if (result.matchedCount === 0) throw notFoundTeam();
  return { updated: true };
});

/** Administrator deletes a team. */
export const deleteTeam = secureCall({ name: "deleteTeam", schema: deleteTeamInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const result = await (await teamsCol()).deleteOne({ _id: data.teamId });
  if (result.deletedCount === 0) throw notFoundTeam();
  return { deleted: true };
});
