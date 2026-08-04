/* Shared, dependency-free Dashboard markup for the 4 visual-concept samples.
   ONE source of truth → every concept renders IDENTICAL content; only the theme
   tokens (colour/type/treatment) differ. No framework, no build, no network. */
(function () {
  const I = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    tasks: '<path d="M9 5h11"/><path d="M9 12h11"/><path d="M9 19h11"/><path d="m3.5 5 1 1 2-2"/><path d="m3.5 12 1 1 2-2"/><circle cx="4.5" cy="19" r="1.2"/>',
    clients: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    client360: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    compliance: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 15 2 2 4-4"/>',
    documents: '<path d="M14 3v5h5"/><path d="M18 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l6 6v10a2 2 0 0 1-2 2Z"/><path d="M9 13h6"/><path d="M9 17h4"/>',
    team: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    usage: '<path d="M3 3v18h18"/><path d="m7 14 3-4 3 3 4-6"/>',
    audit: '<path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z"/><path d="m9 12 2 2 4-4"/>',
    alert: '<path d="M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  }
  const svg = (k, s) => `<svg viewBox="0 0 24 24" width="${s||18}" height="${s||18}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`

  const NAV = [
    ['Workspace', [['dashboard','Dashboard',true],['tasks','Tasks']]],
    ['Clients', [['building','Client Master'],['client360','Client 360'],['clients','Onboarding']]],
    ['Compliance', [['compliance','Compliance'],['documents','Documents']]],
    ['Firm', [['team','Team'],['usage','API Usage'],['audit','Audit Log']]],
  ]
  const KPI = [
    ['alert','Overdue filings','7','across 5 clients','down','2 vs last wk','danger'],
    ['clock','Due in 7 days','14','GST · TDS · ROC','up','3 vs last wk','warning'],
    ['inbox','Open tasks','38','12 unassigned','', '','info'],
    ['clients','Active clients','126','4 onboarding','', '','accent'],
  ]
  const DEADLINES = [
    ['Arunodaya Textiles Pvt Ltd','GSTR-3B — Sep','Today','overdue','RK'],
    ['Meghna Foods LLP','TDS 26Q — Q2','Tomorrow','due','PN'],
    ['Sri Balaji Traders','GSTR-1 — Sep','in 2 days','due','AS'],
    ['Nexa Digital India','ROC AOC-4','in 4 days','due','RK'],
    ['Kaveri Constructions','Advance Tax — Q2','in 6 days','due','PN'],
    ['Zenith Pharma','GSTR-3B — Sep','in 7 days','due','AS'],
  ]
  const WORK = [
    ['Rahul Kapoor','RK',14,3,82],['Priya Nair','PN',11,1,64],
    ['Ananya Shah','AS',9,2,58],['Vikram Rao','VR',4,0,26],
  ]
  const ATTN = [
    ['danger','alert','3 filings overdue for Arunodaya Textiles','Earliest overdue 4 days · GSTR-3B, GSTR-1'],
    ['warning','clock','Kaveri Constructions missing PAN verification','Blocks onboarding step 3 of 5'],
    ['info','inbox','Nexa Digital renewal due next month','Engagement letter expires 30 Sep'],
  ]

  const nav = NAV.map(([g, items]) => `
    <div class="s-navgroup">${g}</div>
    ${items.map(([ic, label, active]) => `
      <button class="s-navitem${active ? ' is-active' : ''}"${active ? ' aria-current="page"' : ''}>
        <span class="s-navico">${svg(ic)}</span><span class="s-navlabel">${label}</span>
      </button>`).join('')}`).join('')

  const kpis = KPI.map(([ic, label, val, foot, dir, delta, tone]) => `
    <div class="s-kpi s-accent-${tone}">
      <div class="s-kpi-top"><span class="s-kpi-label">${label}</span><span class="s-kpi-ico">${svg(ic)}</span></div>
      <div class="s-kpi-val">${val}</div>
      <div class="s-kpi-foot">${dir ? `<span class="s-trend is-${dir}">${dir === 'up' ? '▲' : '▼'} ${delta}</span>` : ''}${foot}</div>
    </div>`).join('')

  const deadlines = DEADLINES.map(([c, t, due, st, o]) => `
    <tr>
      <td><div class="s-cell-primary">${c}</div><div class="s-cell-sub">${t}</div></td>
      <td><span class="s-badge is-${st}"><span class="s-dot"></span>${due}</span></td>
      <td class="s-right s-mono">${o}</td>
    </tr>`).join('')

  const work = WORK.map(([n, ini, open, od, load]) => `
    <tr>
      <td><span class="s-avatar sm">${ini}</span> <span class="s-cell-primary">${n}</span></td>
      <td class="s-right s-mono">${open}</td>
      <td class="s-right">${od > 0 ? `<span class="s-badge is-overdue">${od}</span>` : `<span class="s-muted s-mono">0</span>`}</td>
      <td><div class="s-bar"><span style="width:${load}%"></span></div><div class="s-cell-sub">${load}%</div></td>
    </tr>`).join('')

  const attn = ATTN.map(([tone, ic, title, meta]) => `
    <button class="s-attn">
      <span class="s-attn-ico is-${tone}">${svg(ic, 16)}</span>
      <span class="s-attn-body"><span class="s-attn-title">${title}</span><span class="s-attn-meta">${meta}</span></span>
    </button>`).join('')

  const html = `
  <div class="s-shell">
    <aside class="s-sidebar">
      <div class="s-brand"><span class="s-brand-mark">YA</span><span class="s-brand-text"><span class="s-brand-name">Yes Advizors</span><span class="s-brand-sub">TEAM PORTAL</span></span></div>
      <nav class="s-nav">${nav}</nav>
    </aside>
    <div class="s-main">
      <header class="s-header">
        <div class="s-header-title">Dashboard</div>
        <div class="s-search">${svg('search', 16)}<input placeholder="Search clients, tasks…" aria-label="Search"></div>
        <span class="s-fy">FY 2025–26</span>
        <button class="s-icon-btn" aria-label="Notifications">${svg('bell', 17)}</button>
        <span class="s-user"><span class="s-avatar">PN</span><span class="s-user-name">Priya Nair</span></span>
      </header>
      <main class="s-content">
        <div class="s-pagehead">
          <div><h1>Good morning, Priya</h1><p class="s-sub">Here’s what needs attention across the firm · FY 2025–26</p></div>
          <div class="s-actions"><button class="s-btn ghost">View all deadlines</button><button class="s-btn primary">${svg('plus', 15)} New task</button></div>
        </div>
        <div class="s-kpis">${kpis}</div>
        <div class="s-grid">
          <div class="s-col">
            <section class="s-card">
              <div class="s-card-head"><span class="s-card-title">Upcoming deadlines</span><button class="s-btn ghost sm">All</button></div>
              <table class="s-table"><thead><tr><th>Client</th><th>Due</th><th class="s-right">Owner</th></tr></thead><tbody>${deadlines}</tbody></table>
            </section>
            <section class="s-card">
              <div class="s-card-head"><span class="s-card-title">Team workload</span></div>
              <table class="s-table"><thead><tr><th>Member</th><th class="s-right">Open</th><th class="s-right">Overdue</th><th>Capacity</th></tr></thead><tbody>${work}</tbody></table>
            </section>
          </div>
          <aside class="s-col">
            <section class="s-card">
              <div class="s-card-head"><span class="s-card-title">Needs attention</span></div>
              <div class="s-attn-list">${attn}</div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  </div>`

  document.getElementById('app').innerHTML = html
})();
