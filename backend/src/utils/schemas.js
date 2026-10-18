import { z } from 'zod'
export const oid = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')
export const idParams = z.object({ id: oid })
