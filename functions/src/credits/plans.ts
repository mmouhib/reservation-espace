import { createPlanInput, deletePlanInput, emptyInput, updatePlanInput, type Plan, type PlanSummary } from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import * as credits from "../lib/credits";

function toSummary(plan: Plan & { _id: string }): PlanSummary {
  return {
    id: plan._id,
    name: plan.name,
    description: plan.description,
    kind: plan.kind,
    credits: plan.credits,
    priceCents: plan.priceCents,
    active: plan.active,
  };
}

/** The active plans every member can buy. */
export const listPlans = secureCall({ name: "listPlans", schema: emptyInput }, async () => {
  const plans = await credits.listPlans(true);
  return plans.map(toSummary);
});

/** Admin-only: every plan, including hidden ones, for the management screen. */
export const listAllPlans = secureCall({ name: "listAllPlans", schema: emptyInput, role: "admin" }, async () => {
  const plans = await credits.listPlans(false);
  return plans.map(toSummary);
});

export const createPlan = secureCall({ name: "createPlan", schema: createPlanInput, role: "admin" }, async ({ uid, data }) => {
  const plan: Plan = { name: data.name, description: data.description, kind: data.kind, credits: data.credits, priceCents: data.priceCents, active: data.active };
  const planId = await credits.createPlan(plan);
  await writeAudit({ actorId: uid, actorRole: "admin", action: "plan.created", targetType: "plan", targetId: planId });
  return { planId };
});

export const updatePlan = secureCall({ name: "updatePlan", schema: updatePlanInput, role: "admin" }, async ({ uid, data }) => {
  const plan: Plan = { name: data.name, description: data.description, kind: data.kind, credits: data.credits, priceCents: data.priceCents, active: data.active };
  await credits.updatePlan(data.planId, plan);
  await writeAudit({ actorId: uid, actorRole: "admin", action: "plan.updated", targetType: "plan", targetId: data.planId });
  return { updated: true };
});

export const deletePlan = secureCall({ name: "deletePlan", schema: deletePlanInput, role: "admin" }, async ({ uid, data }) => {
  await credits.deletePlan(data.planId);
  await writeAudit({ actorId: uid, actorRole: "admin", action: "plan.deleted", targetType: "plan", targetId: data.planId });
  return { deleted: true };
});
