/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8082/api/v1/:path*',
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:8082/auth/:path*',
      },
    ]
  },
}

module.exports = nextConfig
