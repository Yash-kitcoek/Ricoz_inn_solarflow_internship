export const money = n => 'Rs ' + Number(n || 0).toLocaleString('en-IN')
export const day = d => (d ? new Date(d).toLocaleDateString('en-IN') : '-')
export const label = s => String(s).replace(/_/g, ' ')
