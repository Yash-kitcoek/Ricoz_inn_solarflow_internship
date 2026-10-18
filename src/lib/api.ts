import { supabase, demoMode } from './supabase'
import { demoProjects } from '../data/demo'
import type { Project } from '../types'
export type Result<T> = { data: T | null; error: string | null }
export async function listProjects(): Promise<Result<Project[]>> {
  if (demoMode) return { data: demoProjects.filter(p => !p.archived), error: null }
  const { data, error } = await supabase!.from('projects').select('*').eq('archived', false).order('updated_at', { ascending: false })
  return { data: data as Project[] | null, error: error?.message ?? null }
}
export async function createProject(p: Omit<Project,'id'|'code'|'archived'>): Promise<Result<Project>> {
  if (demoMode) { const n = { ...p, id: crypto.randomUUID(), code: 'SF-' + (1001 + demoProjects.length), archived: false }; demoProjects.push(n); return { data: n, error: null } }
  const { data, error } = await supabase!.from('projects').insert(p).select().single()
  return { data: data as Project | null, error: error?.message ?? null }
}

// ---- Permits and tasks ----
export const PERMIT_STATUSES = ['Not Started','In Progress','Submitted','Approved','Rejected','Blocked']
export const TASK_STATUSES = ['To Do','In Progress','Blocked','Completed']
export interface PermitItem { id: string; project_id: string; title: string; due_date: string|null; status: string; rejection_reason: string|null }
export interface Task { id: string; project_id: string; title: string; due_date: string|null; status: string }
const day = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const demoPermits: PermitItem[] = [
  { id:'p1', project_id:'d2', title:'Municipal building permit', due_date:day(12), status:'Submitted', rejection_reason:null },
  { id:'p2', project_id:'d2', title:'Fire NOC', due_date:day(-3), status:'In Progress', rejection_reason:null }]
const demoTasks: Task[] = [
  { id:'t1', project_id:'d1', title:'Mounting structure inspection', due_date:day(-2), status:'In Progress' },
  { id:'t2', project_id:'d3', title:'Inspection prep', due_date:day(3), status:'To Do' }]
export async function listPermitItems(): Promise<Result<PermitItem[]>> {
  if (demoMode) return { data: [...demoPermits], error: null }
  const { data, error } = await supabase!.from('permit_checklist_items').select('id,project_id,title,due_date,status,rejection_reason').order('due_date')
  return { data: data as PermitItem[] | null, error: error?.message ?? null }
}
export async function addPermitItem(projectId: string, title: string, due: string|null): Promise<string|null> {
  if (demoMode) { demoPermits.push({ id: crypto.randomUUID(), project_id: projectId, title, due_date: due, status:'Not Started', rejection_reason:null }); return null }
  let { data: permit } = await supabase!.from('permits').select('id').eq('project_id', projectId).limit(1).maybeSingle()
  if (!permit) { const r = await supabase!.from('permits').insert({ project_id: projectId }).select('id').single(); if (r.error) return r.error.message; permit = r.data }
  const { error } = await supabase!.from('permit_checklist_items').insert({ permit_id: permit!.id, project_id: projectId, title, due_date: due })
  return error?.message ?? null
}
export async function setPermitStatus(id: string, status: string, reason?: string): Promise<string|null> {
  if (demoMode) { const i = demoPermits.find(x => x.id === id)!; i.status = status; i.rejection_reason = status === 'Rejected' ? reason ?? null : null; return null }
  const patch: Record<string, unknown> = { status, rejection_reason: status === 'Rejected' ? reason : null }
  if (status === 'Submitted') patch.submitted_on = day(0)
  if (status === 'Approved') patch.approved_on = day(0)
  if (status === 'Blocked') patch.comments = reason
  const { error } = await supabase!.from('permit_checklist_items').update(patch).eq('id', id)
  return error?.message ?? null
}
export async function listTasks(): Promise<Result<Task[]>> {
  if (demoMode) return { data: [...demoTasks], error: null }
  const { data, error } = await supabase!.from('tasks').select('id,project_id,title,due_date,status').order('due_date')
  return { data: data as Task[] | null, error: error?.message ?? null }
}
export async function addTask(projectId: string, title: string, due: string|null): Promise<string|null> {
  if (demoMode) { demoTasks.push({ id: crypto.randomUUID(), project_id: projectId, title, due_date: due, status:'To Do' }); return null }
  const { error } = await supabase!.from('tasks').insert({ project_id: projectId, title, due_date: due })
  return error?.message ?? null
}
export async function setTaskStatus(id: string, status: string): Promise<string|null> {
  if (demoMode) { demoTasks.find(x => x.id === id)!.status = status; return null }
  const { error } = await supabase!.from('tasks').update({ status }).eq('id', id)
  return error?.message ?? null
}
