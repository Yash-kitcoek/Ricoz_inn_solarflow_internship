export const validate = (schema, where = 'body') => (req, res, next) => { const r = schema.safeParse(req[where]); if (!r.success) return next(r.error); req[where] = r.data; next() }
