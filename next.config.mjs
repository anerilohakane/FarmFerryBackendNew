/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ['jsonwebtoken', 'bcryptjs'],

};

export default nextConfig;
