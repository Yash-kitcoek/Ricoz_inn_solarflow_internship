// npm run seed          creates the first admin from ADMIN_* in .env
// npm run seed:demo     also creates sample projects, permits, applications and a milestone
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import User from './models/User.js'
import Project from './models/Project.js'
import Contractor from './models/Contractor.js'
import PermitItem from './models/PermitItem.js'
import NetMeteringApp from './models/NetMeteringApp.js'
import Milestone from './models/Milestone.js'
import { nextSeq } from './models/Counter.js'
if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 8) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in .env first'); process.exit(1) }
await connectDb()
let admin = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() })
if (!admin) admin = await User.create({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12), role: 'admin', approved: true })
else { admin.role = 'admin'; admin.approved = true; await admin.save() }
console.log('Admin ready:', admin.email)
if (process.argv.includes('--demo') && !(await Project.countDocuments())) {
  const ago = d => new Date(Date.now() - d * 864e5), c = await Contractor.create({ companyName: 'BrightArc Contractors (sample)', contactPerson: 'R. Kumar', specialization: 'Residential rooftop' })
  const mk = async (name, customerName, type, capacityKw, status, progress, contractValue) => Project.create({ code: `SF-${await nextSeq('project')}`, name, customerName, type, capacityKw, status, progress, contractValue })
  const a = await mk('Sharma Residence', 'Anita Sharma', 'Residential', 6, 'Installation in Progress', 62, 850000), b = await mk('Textile Mill Rooftop', 'Patil Industries', 'Commercial', 250, 'Permitting', 25, 14500000)
  await PermitItem.create([{ project: b._id, title: 'Municipal building permit', status: 'Submitted', dueDate: ago(-12) }, { project: b._id, title: 'Fire NOC', status: 'In Progress', dueDate: ago(3) }])
  await NetMeteringApp.create({ project: a._id, utility: 'Sample Utility', status: 'Under Review', statusChangedAt: ago(26), history: [{ status: 'Submitted', at: ago(40) }, { status: 'Under Review', at: ago(26) }] })
  await Milestone.create({ project: a._id, contractor: c._id, description: 'Panel installation', amount: 212000, status: 'awaiting_evidence', requiredEvidence: ['panels', 'inverter'] })
  console.log('Demo data created')
}
await mongoose.disconnect()
