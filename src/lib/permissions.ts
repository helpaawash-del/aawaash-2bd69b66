/**
 * Field-level role permission map.
 * Page-level guards live in RoleGuard; this table decides which
 * individual fields a role may VIEW or EDIT on admin manage pages.
 *
 * Keys are stable strings referenced by <ProtectedField/> in forms.
 */

export type Role = "super_admin" | "team_leader" | "member" | "guest";

export type FieldKey =
  // Project
  | "project.identity"
  | "project.pricing"
  | "project.inventory_counters"
  | "project.media"
  | "project.3d_model"
  | "project.seo"
  | "project.danger" // archive/delete/duplicate
  // Team leader manage
  | "team_leader.profile"
  | "team_leader.password_reset"
  | "team_leader.team_assignment"
  | "team_leader.commission_slab"
  // Member manage
  | "member.profile"
  | "member.password_reset"
  | "member.team_switch"
  | "member.commission_override";

type Perm = { view: Role[]; edit: Role[] };

const MATRIX: Record<FieldKey, Perm> = {
  "project.identity":            { view: ["super_admin"], edit: ["super_admin"] },
  "project.pricing":             { view: ["super_admin"], edit: ["super_admin"] },
  "project.inventory_counters":  { view: ["super_admin"], edit: ["super_admin"] },
  "project.media":               { view: ["super_admin"], edit: ["super_admin"] },
  "project.3d_model":            { view: ["super_admin"], edit: ["super_admin"] },
  "project.seo":                 { view: ["super_admin"], edit: ["super_admin"] },
  "project.danger":              { view: ["super_admin"], edit: ["super_admin"] },

  "team_leader.profile":         { view: ["super_admin"], edit: ["super_admin"] },
  "team_leader.password_reset":  { view: ["super_admin"], edit: ["super_admin"] },
  "team_leader.team_assignment": { view: ["super_admin"], edit: ["super_admin"] },
  "team_leader.commission_slab": { view: ["super_admin"], edit: ["super_admin"] },

  "member.profile":              { view: ["super_admin", "team_leader"], edit: ["super_admin"] },
  "member.password_reset":       { view: ["super_admin"], edit: ["super_admin"] },
  "member.team_switch":          { view: ["super_admin"], edit: ["super_admin"] },
  "member.commission_override":  { view: ["super_admin"], edit: ["super_admin"] },
};

export function canView(role: Role | undefined | null, key: FieldKey): boolean {
  return !!role && MATRIX[key].view.includes(role);
}
export function canEdit(role: Role | undefined | null, key: FieldKey): boolean {
  return !!role && MATRIX[key].edit.includes(role);
}
