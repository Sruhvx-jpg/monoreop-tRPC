/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/analytics/:path*",
        destination: "http://localhost:4000/api/analytics/:path*",
      },
    ];
  },
};

export default nextConfig;
