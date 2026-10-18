import type { Project } from '../types'
import type { Doc } from './api3'
import type { NmApp, Milestone } from './api2'
export interface Ctx { project: Project; docs: Doc[]; nm: NmApp[]; ms: Milestone[] }
export interface Item { key: string; title: string; auto?: (c: Ctx) => boolean }
// SAMPLE template. Replace these items with your scheme's current official checklist before relying on the result.
export const SCHEME = 'Generic rooftop subsidy claim (sample template)'
export const ITEMS: Item[] = [
  { key: 'installed', title: 'Installation completed and commissioned', auto: c => ['Commissioning', 'Completed'].includes(c.project.status) },
  { key: 'grid', title: 'Net-metering application connected to grid', auto: c => c.nm.some(a => a.status === 'Connected to Grid') },
  { key: 'sld', title: 'Approved electrical drawing or single-line diagram on file', auto: c => c.docs.some(d => d.category === 'Electrical Drawings' && d.status === 'Approved') },
  { key: 'insp', title: 'Inspection report on file', auto: c => c.docs.some(d => d.category === 'Inspection Reports') },
  { key: 'photos', title: 'Installation photos with a recorded location', auto: c => c.ms.some(m => m.evidence.some(e => e.geo)) },
  { key: 'invoice', title: 'Final invoice on file', auto: c => c.docs.some(d => d.category === 'Invoices') },
  { key: 'id', title: 'Customer identity and consent documents collected' }, { key: 'bank', title: 'Customer bank details for the subsidy credit collected' }, { key: 'sig', title: 'Customer signed the completion certificate' }]
