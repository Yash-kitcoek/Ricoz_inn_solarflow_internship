import { supabase, demoMode } from './supabase'
import { demoProjects } from '../data/demo'
import type { Project } from '../types'
export const DOC_CATS = ['CAD Layouts','Electrical Drawings','Permits','Utility Documents','Contracts','Invoices','Inspection Reports','Other Documents']
export const DOC_STATUS = ['Draft','Under Review','Approved']
export const ROLES = ['admin','project_manager','engineer','contractor','finance']
export interface Doc { id: string; project_id: string; title: string; category: string; status: string; current_version: number; path: string | null; equipment_model?: string | null }
export interface Contractor { id: string; company_name: string; contact_person: string | null; phone: string | null; specialization: string | null; active: boolean }
export interface Note { id: string; message: string; read: boolean; source: string }
export interface Person { id: string; full_name: string | null; email: string | null; role: string; approved: boolean; contractor_id: string | null; phone: string | null }
const OK = ['pdf','dwg','dxf','png','jpg','jpeg','docx','xlsx']
export const checkFile = (f: File) => { const e = f.name.split('.').pop()?.toLowerCase() ?? ''; return !OK.includes(e) ? `File type .${e} is not allowed (${OK.join(', ')}).` : f.size > 50 * 1024 * 1024 ? 'File is larger than 50 MB.' : null }
const dDocs: Doc[] = [{ id: 'x1', project_id: 'd1', title: 'Roof layout.dwg (sample record, no file)', category: 'CAD Layouts', status: 'Under Review', current_version: 2, path: null }]
const dCons: Contractor[] = [{ id: 'c1', company_name: 'BrightArc Contractors (sample)', contact_person: 'R. Kumar', phone: null, specialization: 'Residential rooftop', active: true }]
const msg = (e: { message: string } | null) => e?.message ?? null
export async function listDocs(): Promise<{ data: Doc[]; error: string | null }> {
  if (demoMode) return { data: [...dDocs], error: null }
  const [d, v] = await Promise.all([supabase!.from('documents').select('id,project_id,title,category,status,current_version,equipment_model'), supabase!.from('document_versions').select('document_id,version,storage_path')])
  const data = (d.data ?? []).map(x => ({ ...x, path: (v.data ?? []).find(y => y.document_id === x.id && y.version === x.current_version)?.storage_path ?? null })) as Doc[]
  return { data, error: msg(d.error) ?? msg(v.error) }
}
export async function createDoc(project_id: string, title: string, category: string, file: File, equipment_model?: string): Promise<string | null> {
  if (demoMode) { dDocs.push({ id: crypto.randomUUID(), project_id, title: title + ' (demo record, file not stored)', category, status: 'Draft', current_version: 1, path: null }); return null }
  const { data, error } = await supabase!.from('documents').insert({ project_id, title, category, equipment_model }).select('id').single(); if (error) return error.message
  const path = `${project_id}/${data.id}/1-${file.name}`; const up = await supabase!.storage.from('project-files').upload(path, file)
  if (up.error) { await supabase!.from('documents').delete().eq('id', data.id); return up.error.message }
  return msg((await supabase!.from('document_versions').insert({ document_id: data.id, version: 1, storage_path: path, file_name: file.name, size_bytes: file.size })).error)
}
export async function newVersion(d: Doc, file: File): Promise<string | null> {
  if (demoMode) { d.current_version++; return null }
  const v = d.current_version + 1, path = `${d.project_id}/${d.id}/${v}-${file.name}`; const up = await supabase!.storage.from('project-files').upload(path, file); if (up.error) return up.error.message
  const r = await supabase!.from('document_versions').insert({ document_id: d.id, version: v, storage_path: path, file_name: file.name, size_bytes: file.size }); if (r.error) return r.error.message
  return msg((await supabase!.from('documents').update({ current_version: v }).eq('id', d.id)).error)
}
export async function setDocStatus(id: string, status: string) { if (demoMode) { dDocs.find(x => x.id === id)!.status = status; return null } return msg((await supabase!.from('documents').update({ status }).eq('id', id)).error) }
export async function openDoc(path: string): Promise<string | null> { const r = await supabase!.storage.from('project-files').createSignedUrl(path, 60); if (r.error) return r.error.message; window.open(r.data.signedUrl, '_blank'); return null }
export async function listContractors(): Promise<{ data: Contractor[]; error: string | null }> {
  if (demoMode) return { data: [...dCons], error: null }
  const r = await supabase!.from('contractors').select('id,company_name,contact_person,phone,specialization,active').order('company_name'); return { data: (r.data ?? []) as Contractor[], error: msg(r.error) }
}
export async function addContractor(company_name: string, contact_person: string, phone: string, specialization: string) {
  if (demoMode) { dCons.push({ id: crypto.randomUUID(), company_name, contact_person, phone, specialization, active: true }); return null }
  return msg((await supabase!.from('contractors').insert({ company_name, contact_person, phone, specialization })).error)
}
export async function listNotes(derived: string[]): Promise<{ data: Note[]; error: string | null }> {
  if (demoMode) return { data: derived.map((m, i) => ({ id: 'n' + i, message: m, read: false, source: 'demo' })), error: null }
  const r = await supabase!.from('notifications').select('id,message,read,source').order('created_at', { ascending: false }).limit(100); return { data: (r.data ?? []) as Note[], error: msg(r.error) }
}
export async function markRead(id: string) { return demoMode ? null : msg((await supabase!.from('notifications').update({ read: true }).eq('id', id)).error) }
export async function listPeople(): Promise<{ data: Person[]; error: string | null }> {
  if (demoMode) return { data: [{ id: 'demo', full_name: 'Demo Admin', email: null, role: 'admin', approved: true, contractor_id: null, phone: null }], error: null }
  const r = await supabase!.from('profiles').select('id,full_name,email,role,approved,contractor_id,phone').order('email'); return { data: (r.data ?? []) as Person[], error: msg(r.error) }
}
export async function setProfile(id: string, patch: Partial<Person>) { return demoMode ? 'Demo mode: changes are not stored.' : msg((await supabase!.from('profiles').update(patch).eq('id', id)).error) }
export async function updateProject(id: string, patch: Partial<Project>): Promise<string | null> {
  if (demoMode) { Object.assign(demoProjects.find(p => p.id === id)!, patch); return null }
  return msg((await supabase!.from('projects').update(patch).eq('id', id)).error)
}
