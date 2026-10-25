import test from 'node:test'
import assert from 'node:assert/strict'

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/solarflow-test'
process.env.JWT_SECRET = 'test-secret-that-is-long-enough'
const { authenticate } = await import('../src/middleware/auth.js')

async function authError(req) {
  return new Promise(resolve => authenticate(req, {}, resolve))
}

test('rejects requests without a session instead of assigning a default administrator', async () => {
  const error = await authError({ headers: {}, cookies: {} })
  assert.equal(error.status, 401)
  assert.equal(error.message, 'Sign in is required')
})

test('rejects invalid sessions without falling back to administrator access', async () => {
  const error = await authError({ headers: { authorization: 'Bearer invalid' }, cookies: {} })
  assert.equal(error.status, 401)
  assert.equal(error.message, 'Your session is invalid or expired')
})
