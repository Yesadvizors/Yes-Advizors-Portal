import { supabase } from '../supabase'

/**
 * P2.1 READ-ONLY normalized Client Master reads.
 *
 * SCOPE (hard): read-only. This module contains NO insert/update/upsert/delete and
 * NO .rpc() call — there are no D2b mutation wrappers here (removed per P2.1 ruling).
 *
 * Relational key is ALWAYS clients.id (uuid) — passed in as `clientId`. The legacy
 * clients.client_id (YA-code) is never used as a key. gst_registration_details has
 * no client_id; it is keyed by registration_id.
 *
 * Column projections are verified against frozen migration 0015. NO Aadhaar column
 * (aadhaar_*) is ever selected. RLS (FORCE, TO authenticated, is_active_user() AND
 * is_admin_or_manager()) gates the rows the server returns.
 */

// --- verified projections (frozen 0015) ------------------------------------
const PERSONS_COLS =
  'id, person_type, full_name, designation, pan, din, mobile, email, nationality, is_primary_contact, appointment_date, cessation_date, is_active, row_version'
const IDENTIFIERS_COLS =
  'id, id_type, id_value, issued_on, status, is_active, row_version'
const CONTACTS_COLS =
  'id, contact_type, person_name, designation, email, phone, is_primary, linked_person_id, is_active, row_version'
const ADDRESSES_COLS =
  'id, address_type, line1, line2, city, state, country, pincode, is_primary, effective_from, effective_to, is_active, row_version'
const REGISTRATIONS_COLS =
  'id, reg_type, jurisdiction, reg_number, status, effective_from, effective_to, registered_on, is_active, row_version'
const GST_COLS =
  'registration_id, gstin, state_code, filing_frequency, composition, registration_date, cancellation_date, row_version'

// --- read functions (each independent; return the PostgREST { data, error }) ---
export function readPersons(clientId) {
  return supabase.from('client_persons').select(PERSONS_COLS)
    .eq('client_id', clientId).order('full_name', { ascending: true })
}

export function readIdentifiers(clientId) {
  return supabase.from('client_identifiers').select(IDENTIFIERS_COLS)
    .eq('client_id', clientId).order('id_type', { ascending: true })
}

export function readContacts(clientId) {
  return supabase.from('client_contacts').select(CONTACTS_COLS)
    .eq('client_id', clientId).order('contact_type', { ascending: true })
}

export function readAddresses(clientId) {
  return supabase.from('client_addresses').select(ADDRESSES_COLS)
    .eq('client_id', clientId).order('address_type', { ascending: true })
}

export function readRegistrations(clientId) {
  return supabase.from('client_registrations').select(REGISTRATIONS_COLS)
    .eq('client_id', clientId).order('reg_type', { ascending: true })
}

// gst_registration_details has NO client_id — key strictly by registration_id.
export function readGstDetails(registrationIds) {
  if (!registrationIds || registrationIds.length === 0) {
    return Promise.resolve({ data: [], error: null })
  }
  return supabase.from('gst_registration_details').select(GST_COLS)
    .in('registration_id', registrationIds)
}
