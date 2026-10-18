import { uploadEvidence, type Milestone } from './api2'
import { setTaskStatus } from './api'
// Small IndexedDB queue for things captured without a connection. Stored on this device until it syncs.
export type QItem =
  | { id?: number; kind: 'evidence'; payload: { milestone: Pick<Milestone, 'id' | 'project_id'>; evKind: string; file: Blob; name: string; pos: { lat: number; lng: number } | null; takenAt: string } }
  | { id?: number; kind: 'task'; payload: { id: string; status: string } }
const open = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('solarflow-queue', 1); r.onupgradeneeded = () => r.result.createObjectStore('q', { keyPath: 'id', autoIncrement: true }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
const tx = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>) => { const db = await open(); return new Promise<T>((res, rej) => { const q = f(db.transaction('q', mode).objectStore('q')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) }) }
export const enqueue = (i: QItem) => tx('readwrite', s => s.add(i))
export const pending = () => tx<QItem[]>('readonly', s => s.getAll())
const remove = (id: number) => tx('readwrite', s => s.delete(id))
let busy = false
export async function flushQueue(): Promise<{ done: number; failed: string[] }> {
  if (busy || !navigator.onLine) return { done: 0, failed: [] }
  busy = true; let done = 0; const failed: string[] = []
  try { for (const i of await pending()) {
    const err = i.kind === 'evidence' ? await uploadEvidence(i.payload.milestone, i.payload.evKind, new File([i.payload.file], i.payload.name, { type: i.payload.file.type }), i.payload.pos, i.payload.takenAt) : await setTaskStatus(i.payload.id, i.payload.status)
    if (err) failed.push(err); else { await remove(i.id!); done++ } } } finally { busy = false }
  return { done, failed }
}
