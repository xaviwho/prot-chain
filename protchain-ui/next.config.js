/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BIOAPI_URL: process.env.BIOAPI_URL || 'http://localhost:80',
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:80/api/v1/:path*',
      },
      {
        source: '/api/pdb/:path*',
        destination: 'http://localhost:80/api/v1/pdb/:path*',
      },
    ]
  },
}

module.exports = nextConfig
