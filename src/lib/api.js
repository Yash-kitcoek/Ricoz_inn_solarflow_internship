// Standalone Client-side API Store for SolarFlow OS
// Provides instant mock data and persistent localStorage state without requiring any backend server.

const DEFAULT_PROJECTS = [
  {
    _id: 'prj-101',
    code: 'PRJ-101',
    name: 'Greenfield Commercial Solar Park',
    customerName: 'Apex Industrial Corp',
    type: 'Commercial',
    capacityKw: 250,
    contractValue: 9800000,
    status: 'Installation in Progress',
    progress: 68,
    startDate: '2026-01-15',
    endDate: '2026-06-30',
    archived: false,
    activity: [
      { _id: 'act-1', actorName: 'Admin', action: 'Approved milestone: Module Mounting Structure', at: new Date(Date.now() - 3600000 * 2).toISOString(), detail: 'Verified 450 panels mounted' },
      { _id: 'act-2', actorName: 'SunSpark EPC', action: 'Submitted invoice INV-2026-104', at: new Date(Date.now() - 3600000 * 24).toISOString(), detail: 'Amount: Rs 3,50,000' }
    ]
  },
  {
    _id: 'prj-102',
    code: 'PRJ-102',
    name: 'Shree Sai Rooftop 15kW',
    customerName: 'Shree Sai Residency',
    type: 'Residential',
    capacityKw: 15,
    contractValue: 750000,
    status: 'Permitting',
    progress: 35,
    startDate: '2026-02-01',
    endDate: '2026-04-15',
    archived: false,
    activity: [
      { _id: 'act-3', actorName: 'Admin', action: 'Discom sanction application filed', at: new Date(Date.now() - 3600000 * 12).toISOString(), detail: 'Awaiting DISCOM inspection' }
    ]
  },
  {
    _id: 'prj-103',
    code: 'PRJ-103',
    name: 'Zenith Tech Park Microgrid',
    customerName: 'Zenith Software Campus',
    type: 'Commercial',
    capacityKw: 500,
    contractValue: 18500000,
    status: 'Ready for Installation',
    progress: 50,
    startDate: '2026-01-05',
    endDate: '2026-08-30',
    archived: false,
    activity: [
      { _id: 'act-4', actorName: 'Admin', action: 'Permit item approved', at: new Date(Date.now() - 3600000 * 48).toISOString(), detail: 'CEIG Electrical Inspectorate Clearance' }
    ]
  },
  {
    _id: 'prj-104',
    code: 'PRJ-104',
    name: 'Heritage Villa Solar Net-Meter',
    customerName: 'Dr. Anand Kulkarni',
    type: 'Residential',
    capacityKw: 8.5,
    contractValue: 420000,
    status: 'Commissioning',
    progress: 92,
    startDate: '2025-12-10',
    endDate: '2026-03-15',
    archived: false,
    activity: [
      { _id: 'act-5', actorName: 'Admin', action: 'Bi-directional net meter installed', at: new Date(Date.now() - 3600000 * 6).toISOString(), detail: 'Grid sync verified' }
    ]
  },
  {
    _id: 'prj-105',
    code: 'PRJ-105',
    name: 'Modern Agro Cold Storage 80kW',
    customerName: 'Kisan Agro Foods',
    type: 'Commercial',
    capacityKw: 80,
    contractValue: 3600000,
    status: 'Inspection',
    progress: 80,
    startDate: '2026-01-20',
    endDate: '2026-05-15',
    archived: false,
    activity: []
  }
]

const DEFAULT_CONTRACTORS = [
  { _id: 'c-1', companyName: 'SunSpark EPC Solutions', contactPerson: 'Vikram Joshi', phone: '+91 98230 11223', specialization: 'Heavy Structural & Civil EPC', active: true },
  { _id: 'c-2', companyName: 'VoltEdge Electricals', contactPerson: 'Sunita Rao', phone: '+91 98450 33445', specialization: 'Inverters, Transformers & HT Cabling', active: true },
  { _id: 'c-3', companyName: 'Solaria Rooftop Specialists', contactPerson: 'Ramesh Patel', phone: '+91 99090 55667', specialization: 'Residential & Light Commercial', active: true }
]

const DEFAULT_PERMITS = [
  { _id: 'pm-1', project: { _id: 'prj-101', code: 'PRJ-101', name: 'Greenfield Commercial Solar Park' }, title: 'CEIG Electrical Inspectorate Approval', dueDate: '2026-11-20', status: 'Approved', reason: '', overdue: false },
  { _id: 'pm-2', project: { _id: 'prj-102', code: 'PRJ-102', name: 'Shree Sai Rooftop 15kW' }, title: 'DISCOM Feasibility & Sanction Letter', dueDate: '2026-10-15', status: 'Blocked', reason: 'Awaiting revised single-line diagram from client', overdue: true },
  { _id: 'pm-3', project: { _id: 'prj-103', code: 'PRJ-103', name: 'Zenith Tech Park Microgrid' }, title: 'Municipal Structural Safety Certificate', dueDate: '2026-11-05', status: 'Approved', reason: '', overdue: false },
  { _id: 'pm-4', project: { _id: 'prj-104', code: 'PRJ-104', name: 'Heritage Villa Solar Net-Meter' }, title: 'Local Authority NOC & Net Meter Sanction', dueDate: '2026-10-30', status: 'Approved', reason: '', overdue: false }
]

const DEFAULT_NET_METERING = [
  {
    _id: 'nm-1',
    project: { _id: 'prj-101', code: 'PRJ-101', name: 'Greenfield Commercial Solar Park' },
    utility: 'MSEDCL (Maharashtra State Electricity)',
    status: 'Under Review',
    diagnosis: { owner: 'Executive Engineer MSEDCL', days: 16, late: true, action: 'Escalate to Chief Engineer for grid connectivity sanction' }
  },
  {
    _id: 'nm-2',
    project: { _id: 'prj-102', code: 'PRJ-102', name: 'Shree Sai Rooftop 15kW' },
    utility: 'Tata Power DDL',
    status: 'Documents Required',
    diagnosis: { owner: 'Project Manager', days: 7, late: false, action: 'Resubmit certified load calculation sheet' }
  },
  {
    _id: 'nm-3',
    project: { _id: 'prj-104', code: 'PRJ-104', name: 'Heritage Villa Solar Net-Meter' },
    utility: 'Adani Electricity',
    status: 'Connected to Grid',
    diagnosis: { owner: 'Completed', days: 0, late: false, action: 'Application successfully completed' }
  }
]

const DEFAULT_SCORECARD = [
  { utility: 'MSEDCL', applications: 5, avgDays: 19 },
  { utility: 'Tata Power DDL', applications: 4, avgDays: 11 },
  { utility: 'Adani Electricity', applications: 3, avgDays: 8 }
]

const DEFAULT_MILESTONES = [
  {
    id: 'ms-1',
    project: { _id: 'prj-101', code: 'PRJ-101', name: 'Greenfield Commercial Solar Park' },
    contractor: { _id: 'c-1', companyName: 'SunSpark EPC Solutions' },
    description: 'Foundation & Mounting Structures Fabrication',
    amount: 850000,
    dueDate: '2026-11-10',
    status: 'approved_for_payment',
    requiredEvidence: ['structure_photo', 'civil_foundation'],
    missingEvidence: [],
    evidence: [{ id: 'ev-1', kind: 'structure_photo', hasLocation: true }],
    invoice: { number: 'INV-2026-104', date: '2026-10-20' },
    payment: null,
    approvalNotes: 'Foundation strength certified by structural lead'
  },
  {
    id: 'ms-2',
    project: { _id: 'prj-102', code: 'PRJ-102', name: 'Shree Sai Rooftop 15kW' },
    contractor: { _id: 'c-3', companyName: 'Solaria Rooftop Specialists' },
    description: 'Solar PV Array Mounting & DC Cabling',
    amount: 195000,
    dueDate: '2026-11-25',
    status: 'awaiting_evidence',
    requiredEvidence: ['pv_array', 'inverter_connection'],
    missingEvidence: ['inverter_connection'],
    evidence: [{ id: 'ev-2', kind: 'pv_array', hasLocation: true }],
    invoice: null,
    payment: null
  },
  {
    id: 'ms-3',
    project: { _id: 'prj-104', code: 'PRJ-104', name: 'Heritage Villa Solar Net-Meter' },
    contractor: { _id: 'c-2', companyName: 'VoltEdge Electricals' },
    description: 'Inverter Testing & Grid Synchronization',
    amount: 145000,
    dueDate: '2026-10-18',
    status: 'paid',
    requiredEvidence: ['grid_sync_meter'],
    missingEvidence: [],
    evidence: [{ id: 'ev-3', kind: 'grid_sync_meter', hasLocation: true }],
    invoice: { number: 'INV-2026-089', date: '2026-10-15' },
    payment: { paidOn: '2026-10-19', reference: 'HDFC-NEFT-994821038' }
  }
]

const DEFAULT_USERS = [
  { id: 'u-1', name: 'Admin', email: 'admin@example.com', approved: true, role: 'admin', contractor: null },
  { id: 'u-2', name: 'Pooja Deshmukh', email: 'pooja.pm@solarflow.io', approved: true, role: 'project_manager', contractor: null },
  { id: 'u-3', name: 'Siddharth Varma', email: 'siddharth@volt-edge.com', approved: true, role: 'contractor', contractor: 'c-2' },
  { id: 'u-4', name: 'Meera Nair', email: 'meera.finance@solarflow.io', approved: true, role: 'finance', contractor: null }
]

function getStore(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(`solarflow_${key}`)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setStore(key, value) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`solarflow_${key}`, JSON.stringify(value))
  } catch {
    // Ignore localStorage errors
  }
}

// Standalone in-browser API router & controller
export async function api(path, { method = 'GET', body, form } = {}) {
  const [cleanPath, queryString] = path.split('?')
  const params = new URLSearchParams(queryString || '')

  // 1. Dashboard
  if (cleanPath === '/dashboard') {
    const projects = getStore('projects', DEFAULT_PROJECTS).filter(p => !p.archived)
    const permits = getStore('permits', DEFAULT_PERMITS)
    const netMetering = getStore('net_metering', DEFAULT_NET_METERING)
    const milestones = getStore('milestones', DEFAULT_MILESTONES)

    const stuckApplications = netMetering.filter(a => a.diagnosis?.late).map(a => ({
      id: a._id,
      project: a.project,
      utility: a.utility,
      status: a.status,
      owner: a.diagnosis.owner,
      days: a.diagnosis.days,
      action: a.diagnosis.action
    }))

    const unpaidMilestoneAmount = milestones
      .filter(m => m.status !== 'paid')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0)

    return {
      totalProjects: projects.length,
      activeInstallations: projects.filter(p => p.status === 'Installation in Progress' || p.status === 'Ready for Installation').length,
      openPermitItems: permits.filter(p => p.status !== 'Approved').length,
      overduePermitItems: permits.filter(p => p.overdue).length,
      pendingNetMetering: netMetering.filter(n => n.status !== 'Connected to Grid').length,
      unpaidMilestoneAmount,
      stuckApplications
    }
  }

  // 2. Projects list & create
  if (cleanPath === '/projects' && method === 'GET') {
    let projects = getStore('projects', DEFAULT_PROJECTS).filter(p => !p.archived)
    const q = params.get('q')?.toLowerCase()
    const status = params.get('status')
    if (q) projects = projects.filter(p => p.name.toLowerCase().includes(q) || p.customerName.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
    if (status) projects = projects.filter(p => p.status === status)
    return { projects }
  }

  if (cleanPath === '/projects' && method === 'POST') {
    const projects = getStore('projects', DEFAULT_PROJECTS)
    const newId = 'prj-' + (Date.now() % 10000)
    const newProject = {
      _id: newId,
      code: `PRJ-${String(projects.length + 101)}`,
      name: body.name || 'New Solar Project',
      customerName: body.customerName || 'Customer',
      type: body.type || 'Commercial',
      capacityKw: Number(body.capacityKw) || 10,
      contractValue: Number(body.contractValue) || 500000,
      status: 'Draft',
      progress: 5,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      archived: false,
      activity: [{ _id: 'act-' + Date.now(), actorName: 'Admin', action: 'Created project', at: new Date().toISOString(), detail: 'Draft created' }]
    }
    const updated = [newProject, ...projects]
    setStore('projects', updated)
    return { project: newProject }
  }

  // 3. Project Detail & Patch
  if (cleanPath.startsWith('/projects/') && !cleanPath.includes('/permits')) {
    const id = cleanPath.split('/')[2]
    const projects = getStore('projects', DEFAULT_PROJECTS)
    const pIndex = projects.findIndex(p => p._id === id)
    const project = pIndex >= 0 ? projects[pIndex] : projects[0]

    if (method === 'PATCH') {
      const updatedProject = { ...project, ...body }
      if (body.status && body.status !== project.status) {
        updatedProject.activity = [
          { _id: 'act-' + Date.now(), actorName: 'Admin', action: `Status changed to ${body.status}`, at: new Date().toISOString() },
          ...(project.activity || [])
        ]
      }
      if (pIndex >= 0) projects[pIndex] = updatedProject
      setStore('projects', projects)
      return { project: updatedProject }
    }

    const permits = getStore('permits', DEFAULT_PERMITS).filter(x => x.project?._id === id || x.project?.code === project?.code)
    const netMetering = getStore('net_metering', DEFAULT_NET_METERING).filter(x => x.project?._id === id || x.project?.code === project?.code)
    const milestones = getStore('milestones', DEFAULT_MILESTONES).filter(x => x.project?._id === id || x.project?.code === project?.code)

    return {
      project,
      counts: { permits: permits.length, netMetering: netMetering.length, milestones: milestones.length },
      activity: project?.activity || []
    }
  }

  // 4. Permits
  if (cleanPath === '/permits' && method === 'GET') {
    return { items: getStore('permits', DEFAULT_PERMITS) }
  }

  if (cleanPath === '/permits' && method === 'POST') {
    const permits = getStore('permits', DEFAULT_PERMITS)
    const projects = getStore('projects', DEFAULT_PROJECTS)
    const prj = projects.find(p => p._id === body.project) || projects[0]
    const newItem = {
      _id: 'pm-' + Date.now(),
      project: { _id: prj._id, code: prj.code, name: prj.name },
      title: body.title,
      dueDate: body.dueDate || null,
      status: 'Not Started',
      reason: '',
      overdue: false
    }
    const updated = [newItem, ...permits]
    setStore('permits', updated)
    return { item: newItem }
  }

  if (cleanPath.startsWith('/permits/') && method === 'PATCH') {
    const id = cleanPath.split('/')[2]
    const permits = getStore('permits', DEFAULT_PERMITS)
    const idx = permits.findIndex(p => p._id === id)
    if (idx >= 0) {
      permits[idx] = { ...permits[idx], ...body }
      setStore('permits', permits)
    }
    return { ok: true }
  }

  // 5. Net Metering
  if (cleanPath === '/net-metering' && method === 'GET') {
    return {
      applications: getStore('net_metering', DEFAULT_NET_METERING),
      scorecard: DEFAULT_SCORECARD
    }
  }

  if (cleanPath === '/net-metering' && method === 'POST') {
    const apps = getStore('net_metering', DEFAULT_NET_METERING)
    const projects = getStore('projects', DEFAULT_PROJECTS)
    const prj = projects.find(p => p._id === body.project) || projects[0]
    const newApp = {
      _id: 'nm-' + Date.now(),
      project: { _id: prj._id, code: prj.code, name: prj.name },
      utility: body.utility || 'State Discom',
      status: 'Documents Required',
      diagnosis: { owner: 'Project Manager', days: 1, late: false, action: 'Upload initial application dossier' }
    }
    const updated = [newApp, ...apps]
    setStore('net_metering', updated)
    return { application: newApp }
  }

  if (cleanPath.startsWith('/net-metering/') && cleanPath.endsWith('/status')) {
    const id = cleanPath.split('/')[2]
    const apps = getStore('net_metering', DEFAULT_NET_METERING)
    const idx = apps.findIndex(a => a._id === id)
    if (idx >= 0) {
      apps[idx].status = body.status
      if (body.status === 'Connected to Grid') {
        apps[idx].diagnosis = { owner: 'Completed', days: 0, late: false, action: 'Grid connected' }
      }
      setStore('net_metering', apps)
    }
    return { ok: true }
  }

  // 6. Contractors
  if (cleanPath === '/contractors' && method === 'GET') {
    return { contractors: getStore('contractors', DEFAULT_CONTRACTORS) }
  }

  if (cleanPath === '/contractors' && method === 'POST') {
    const contractors = getStore('contractors', DEFAULT_CONTRACTORS)
    const newContractor = {
      _id: 'c-' + Date.now(),
      companyName: body.companyName,
      contactPerson: body.contactPerson || '',
      phone: body.phone || '',
      specialization: body.specialization || 'Solar EPC',
      active: true
    }
    const updated = [...contractors, newContractor]
    setStore('contractors', updated)
    return { contractor: newContractor }
  }

  // 7. Milestones & Payments
  if (cleanPath === '/milestones' && method === 'GET') {
    return { milestones: getStore('milestones', DEFAULT_MILESTONES) }
  }

  if (cleanPath === '/milestones' && method === 'POST') {
    const milestones = getStore('milestones', DEFAULT_MILESTONES)
    const projects = getStore('projects', DEFAULT_PROJECTS)
    const contractors = getStore('contractors', DEFAULT_CONTRACTORS)
    const prj = projects.find(p => p._id === body.project) || projects[0]
    const con = contractors.find(c => c._id === body.contractor) || contractors[0]
    const newMs = {
      id: 'ms-' + Date.now(),
      project: { _id: prj._id, code: prj.code, name: prj.name },
      contractor: { _id: con._id, companyName: con.companyName },
      description: body.description,
      amount: Number(body.amount) || 100000,
      dueDate: body.dueDate || null,
      status: 'awaiting_evidence',
      requiredEvidence: ['installation_photo', 'site_clearance'],
      missingEvidence: ['installation_photo'],
      evidence: [],
      invoice: null,
      payment: null
    }
    const updated = [newMs, ...milestones]
    setStore('milestones', updated)
    return { milestone: newMs }
  }

  if (cleanPath.startsWith('/milestones/') && cleanPath.endsWith('/transition')) {
    const id = cleanPath.split('/')[2]
    const milestones = getStore('milestones', DEFAULT_MILESTONES)
    const idx = milestones.findIndex(m => m.id === id)
    if (idx >= 0) {
      milestones[idx].status = body.to
      if (body.notes) milestones[idx].approvalNotes = body.notes
      setStore('milestones', milestones)
    }
    return { ok: true }
  }

  if (cleanPath.startsWith('/milestones/') && cleanPath.endsWith('/invoice')) {
    const id = cleanPath.split('/')[2]
    const milestones = getStore('milestones', DEFAULT_MILESTONES)
    const idx = milestones.findIndex(m => m.id === id)
    if (idx >= 0) {
      milestones[idx].invoice = { number: body.number, date: body.date || new Date().toISOString() }
      setStore('milestones', milestones)
    }
    return { ok: true }
  }

  if (cleanPath.startsWith('/milestones/') && cleanPath.endsWith('/pay')) {
    const id = cleanPath.split('/')[2]
    const milestones = getStore('milestones', DEFAULT_MILESTONES)
    const idx = milestones.findIndex(m => m.id === id)
    if (idx >= 0) {
      milestones[idx].status = 'paid'
      milestones[idx].payment = { paidOn: new Date().toISOString().slice(0, 10), reference: body.reference }
      setStore('milestones', milestones)
    }
    return { ok: true }
  }

  if (cleanPath.startsWith('/milestones/') && cleanPath.endsWith('/evidence')) {
    const id = cleanPath.split('/')[2]
    const milestones = getStore('milestones', DEFAULT_MILESTONES)
    const idx = milestones.findIndex(m => m.id === id)
    if (idx >= 0) {
      const kind = form ? form.get('kind') : 'site_photo'
      milestones[idx].evidence.push({ id: 'ev-' + Date.now(), kind, hasLocation: true })
      milestones[idx].missingEvidence = milestones[idx].missingEvidence.filter(k => k !== kind)
      setStore('milestones', milestones)
    }
    return { ok: true }
  }

  // 8. Users & Roles (Settings)
  if (cleanPath === '/users' && method === 'GET') {
    return { users: getStore('users', DEFAULT_USERS) }
  }

  if (cleanPath.startsWith('/users/') && method === 'PATCH') {
    const id = cleanPath.split('/')[2]
    const users = getStore('users', DEFAULT_USERS)
    const idx = users.findIndex(u => u.id === id)
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...body }
      setStore('users', users)
    }
    return { ok: true }
  }

  // 9. Auth
  if (cleanPath === '/auth/me') {
    return { user: { id: 'admin', name: 'Admin', email: 'admin@example.com', role: 'admin', approved: true } }
  }

  return { ok: true }
}
