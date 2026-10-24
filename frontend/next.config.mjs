// The browser only talks to this Next.js server. /api/* is forwarded to the Express backend,
// so the login cookie stays same-origin and no CORS setup is needed.
const backend = process.env.BACKEND_URL || 'http://localhost:4000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Produce a self-contained build for Docker / VPS deployments
  output: 'standalone',

  // Proxy API requests to the Express backend
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }]
  },
}

export default nextConfig
