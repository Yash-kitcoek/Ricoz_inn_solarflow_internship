export type Role = 'admin' | 'project_manager' | 'engineer' | 'contractor' | 'finance'
export const STATUSES = ['Draft','Planning','Permitting','Design','Ready for Installation','Installation in Progress','Inspection','Commissioning','Completed','On Hold'] as const
export type ProjectStatus = typeof STATUSES[number]
export interface Project { id: string; code: string; name: string; customer_name: string; project_type: 'Residential'|'Commercial'
  capacity_kw: number; contract_value: number; status: ProjectStatus; progress: number; start_date: string|null; end_date: string|null; archived: boolean; share_token?: string | null; latitude?: number | null; longitude?: number | null; commissioned_on?: string | null; warranty_panel_years?: number | null; warranty_inverter_years?: number | null }
