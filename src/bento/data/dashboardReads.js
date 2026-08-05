/**
 * Approved Bento Dashboard — READ-ONLY data service (V2 dev).
 * ----------------------------------------------------------------------------
 * Reuses the EXACT safe read patterns already used by the legacy firm dashboard
 * (src/components/Dashboard.jsx): the authenticated shared Supabase client + RLS,
 * SELECT only. NO writes, NO rpc, NO schema/auth changes. Role/capability limits
 * are enforced server-side by RLS on these same reads.
 *
 * Fails closed: if ANY core read errors, we throw a generic error (the caller
 * shows a business-safe message and never a firm-of-zeros) — mirroring the legacy
 * dashboard's "a data outage must not look like a firm with nothing due" rule.
 */
import { supabase } from '../../supabase'

export async function fetchDashboardData() {
  const [t, c, cm, tm] = await Promise.all([
    supabase.from('tasks').select('id,task_name,status,due_date,assigned_to,client_name,next_followup_date'),
    supabase.from('clients').select('client_id,status,is_draft,is_test_client'),
    supabase.from('v_firm_dashboard').select('category,total,completed,overdue,pending,due_in_7_days'),
    supabase.from('team').select('id,name,role').eq('is_active', true).order('name'),
  ])
  const firstError = [t, c, cm, tm].map(r => r.error).find(Boolean)
  if (firstError) {
    // Raw error stays in the console only; callers surface a safe message.
    console.error('[BentoDashboard] read failed:', firstError)
    throw new Error('DASHBOARD_READ_FAILED')
  }
  return {
    tasks: t.data || [],
    clients: c.data || [],
    firm: cm.data || [],
    team: tm.data || [],
  }
}
