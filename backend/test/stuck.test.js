import test from 'node:test'
import assert from 'node:assert/strict'
import { diagnose, scorecard } from '../src/services/stuck.js'
const ago = d => new Date(Date.now() - d * 864e5)
test('flags an authority stage that has waited too long', () => { const d = diagnose('Under Review', ago(26)); assert.equal(d.late, true); assert.equal(d.owner, 'Authority'); assert.equal(d.days, 26) })
test('does not flag a recent stage', () => assert.equal(diagnose('Submitted', ago(3)).late, false))
test('a connected application is never late', () => assert.equal(diagnose('Connected to Grid', ago(400)).late, false))
test('scorecard averages completed authority stages per utility', () => {
  const apps = [{ utility: 'A', history: [{ status: 'Submitted', at: ago(40) }, { status: 'Under Review', at: ago(20) }, { status: 'Connected to Grid', at: ago(0) }] }, { utility: 'A', history: [{ status: 'Submitted', at: ago(10) }, { status: 'Approved', at: ago(0) }] }]
  const s = scorecard(apps); assert.equal(s.length, 1); assert.equal(s[0].applications, 2); assert.equal(s[0].avgDays, 25) })
test('scorecard ignores applications with no completed authority stage', () => assert.deepEqual(scorecard([{ utility: 'B', history: [{ status: 'Not Started', at: ago(5) }] }]), []))
