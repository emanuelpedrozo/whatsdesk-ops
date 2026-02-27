/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: process.env.NEXT_BASE_PATH ?? '',
};

export default nextConfig;
