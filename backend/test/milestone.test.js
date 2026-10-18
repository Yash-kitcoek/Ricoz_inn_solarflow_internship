import test from 'node:test'
import assert from 'node:assert/strict'
import { checkTransition, missingEvidence } from '../src/services/milestoneRules.js'
import { looksLikeImage } from '../src/utils/image.js'
const geo = kind => ({ kind, lat: 18.5, lng: 73.8 })
const base = over => ({ status: 'awaiting_evidence', requiredEvidence: ['panels', 'inverter'], evidence: [geo('panels'), geo('inverter')], invoice: { number: 'INV-1' }, ...over })
test('blocks verification when a required photo has no location', () => {
  const m = base({ evidence: [geo('panels'), { kind: 'inverter' }] }); assert.deepEqual(missingEvidence(m), ['inverter'])
  const r = checkTransition({ milestone: m, to: 'pending_verification', role: 'contractor' }); assert.equal(r.ok, false); assert.equal(r.status, 409) })
test('blocks verification without an invoice', () => assert.equal(checkTransition({ milestone: base({ invoice: null }), to: 'pending_verification', role: 'contractor' }).ok, false))
test('allows verification once evidence and invoice exist', () => assert.equal(checkTransition({ milestone: base(), to: 'pending_verification', role: 'contractor' }).ok, true))
test('a finance user cannot submit evidence', () => assert.equal(checkTransition({ milestone: base(), to: 'pending_verification', role: 'finance' }).status, 403))
test('the verifier cannot approve the payment', () => {
  const m = { status: 'pending_approval', verifiedBy: 'u1' }
  assert.equal(checkTransition({ milestone: m, to: 'approved_for_payment', role: 'finance', userId: 'u1' }).ok, false)
  assert.equal(checkTransition({ milestone: m, to: 'approved_for_payment', role: 'finance', userId: 'u2' }).ok, true) })
test('cannot jump straight to paid or skip steps', () => { assert.equal(checkTransition({ milestone: { status: 'pending_approval' }, to: 'paid', role: 'admin' }).ok, false); assert.equal(checkTransition({ milestone: { status: 'not_due' }, to: 'pending_approval', role: 'admin' }).ok, false) })
test('a dispute needs a reason', () => {
  assert.equal(checkTransition({ milestone: { status: 'pending_approval' }, to: 'disputed', role: 'finance', notes: '' }).ok, false)
  assert.equal(checkTransition({ milestone: { status: 'pending_approval' }, to: 'disputed', role: 'finance', notes: 'Photos unclear' }).ok, true) })
test('recognises real image bytes and rejects other files', () => {
  assert.equal(looksLikeImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), true)
  assert.equal(looksLikeImage(Buffer.from('<?php echo 1; ?> not an image')), false) })
