/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  images: { unoptimized: true },
  async rewrites() {
    return [
      { source: '/provider', destination: '/provider/index.html' },
      { source: '/provider/', destination: '/provider/index.html' },
      { source: '/qi', destination: '/qi/index.html' },
      { source: '/qi/', destination: '/qi/index.html' },
    ];
  },
};
module.exports = nextConfig;
