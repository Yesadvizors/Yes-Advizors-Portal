/**
 * ModulePlaceholder — honest Bento shell for sidebar entries whose backend module
 * does not exist yet (Templates, Knowledge Hub, Settings). PRESENTATIONAL.
 * ----------------------------------------------------------------------------
 * Shows a polished header + a clear "coming later" section. Nothing here is
 * interactive and NO functionality is faked. For Settings it additionally renders
 * a READ-ONLY profile derived entirely from the already-signed-in user object —
 * no new read, no writable settings.
 */
import { ModuleHeader, SectionCard } from './primitives'

function Field({ label, value }) {
  return (
    <div className="b-drawer-fld">
      <div className="b-drawer-fld-k">{label}</div>
      <div className="b-drawer-fld-v">{value == null || value === '' ? '—' : value}</div>
    </div>
  )
}

export default function ModulePlaceholder({ title, subtitle, message, profile }) {
  return (
    <div className="b-mod">
      <ModuleHeader title={title} subtitle={subtitle} />

      {profile && (
        <SectionCard title="Your profile" subtitle="Read-only — from your signed-in account">
          <div className="b-drawer-grid">
            <Field label="Name" value={profile.name} />
            <Field label="Email" value={profile.email} />
            <Field label="Role" value={profile.role || (profile.is_admin ? 'Administrator' : 'Staff')} />
            <Field label="Access level" value={profile.is_admin ? 'Admin' : 'Standard'} />
          </div>
        </SectionCard>
      )}

      <SectionCard title={`${title} — coming in a later phase`}>
        <div className="b-mod-placeholder">
          <div className="b-mod-placeholder-title">{message}</div>
          <div className="b-mod-placeholder-copy">
            This is part of the approved shell and will be connected in a later phase. No functionality is
            implemented here yet, so nothing on this screen is interactive.
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
