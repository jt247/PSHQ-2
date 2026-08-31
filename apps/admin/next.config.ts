import type { NextConfig } from "next";

// Internal-only tool behind auth — a stricter CSP than the public site isn't
// needed here, but the baseline security headers still matter since this is
// served over the public internet on its own domain.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript source (no build step) — Next
  // only transpiles files inside the app by default, so anything imported
  // from these needs to be explicitly opted in.
  transpilePackages: ['@pshq/api-client', '@pshq/database', '@pshq/ui'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
};

export default nextConfig;
