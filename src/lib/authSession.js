// Authentication / session helpers.
//
// classifyMembership: classify the result of the active-member `team` lookup that
// gates portal entry. FAIL-CLOSED — only 'granted' admits the user. A transient
// query error is 'verify_failed' (retryable) and must NEVER be presented as
// "account not active" or cause a silent sign-out; a genuine missing/inactive
// member is 'not_active'. The `error` takes priority: if the lookup itself failed
// we cannot assert anything about membership, so we neither grant nor claim inactive.
export function classifyMembership({ error, member } = {}) {
  if (error) return { outcome: 'verify_failed' }
  if (!member) return { outcome: 'not_active' }
  return { outcome: 'granted', member }
}

// Business-safe, user-facing messages for the non-granted outcomes. verify_failed
// is deliberately retryable and does not assert the account is inactive.
export const AUTH_MESSAGES = {
  verify_failed: "We couldn't verify your account right now. Please check your connection and try again.",
  not_active: 'Your account is not active. Contact Pankaj.',
}
