// The browser only talks to this Next.js server. /api/* is forwarded to the Express backend,
// so the login cookie stays same-origin and no CORS setup is needed.
const backend = process.env.BACKEND_URL || 'http://localhost:4000'
export default { reactStrictMode: true, poweredByHeader: false, async rewrites() { return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }] } }
