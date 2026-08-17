// Package 0/1 document permission model — single source of truth for the frontend.
//
// These helpers MIRROR the already-live, authoritative backend contract on yav2-dev:
//   - secure-docs storage RLS  (pkg0_secure_docs_storage_rls_alignment)
//   - documents / document_requirements RLS + document_link/replace/archive RPCs
//     (pkg1_document_source_of_truth)
//
// They are UI-only: they exist to avoid showing false affordances. RLS + storage
// policies + the governed RPCs remain the real enforcement boundary — a user who
// bypasses the UI is still blocked by the database.
//
// Role vocabulary is portal_role_enum: Admin, Manager, Executive, Staff, Viewer.

export const DOC_VIEW_ROLES   = ['Admin', 'Manager', 'Executive', 'Staff', 'Viewer'] // View / Download
export const DOC_UPLOAD_ROLES = ['Admin', 'Manager', 'Executive']                    // Upload
export const DOC_MANAGE_ROLES = ['Admin', 'Manager', 'Executive']                    // Link / Replace / Archive
export const DOC_DELETE_ROLES = ['Admin', 'Manager']                                 // Physical (irreversible) delete

// Resolve the portal role from the authenticated team-member object (App loads the
// full `team` row, so `portal_role` is present). Returns null when unknown → default-deny.
export function documentRole(user) {
  return user && typeof user.portal_role === 'string' && user.portal_role ? user.portal_role : null
}

export function canViewDocument(role)             { return DOC_VIEW_ROLES.includes(role) }
export function canUploadDocument(role)           { return DOC_UPLOAD_ROLES.includes(role) }
export function canManageDocument(role)           { return DOC_MANAGE_ROLES.includes(role) } // archive / link / replace
export function canPhysicallyDeleteDocument(role) { return DOC_DELETE_ROLES.includes(role) }
