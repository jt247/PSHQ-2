import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Content Security Policy. Was Report-Only during the initial security
// pass; flipped to enforcing ahead of paid-traffic launch.
const csp = [
  "default-src 'self'",
  // Next.js inline runtime + PostHog snippet need unsafe-inline; Next dev needs unsafe-eval
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://eu.i.posthog.com https://eu-assets.i.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://eu.i.posthog.com https://eu-assets.i.posthog.com https://*.sentry.io https://*.r2.cloudflarestorage.com https://*.r2.dev",
  // Chrome's built-in PDF viewer spawns a blob: worker to render the file.
  // Without worker-src set, that falls back to script-src, which doesn't
  // allow blob: — the worker gets silently blocked (visible in devtools,
  // invisible to a real user since the viewer still renders, just without
  // whatever that worker was doing). Only affects /content/[slug]/read.
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: csp },
]

// /api/view serves a PDF meant to be embedded in our own reader page's
// iframe. The site-wide X-Frame-Options: DENY and frame-ancestors 'none'
// above exist to stop OTHER sites from framing us, but they make no
// exception for framing ourselves — so without this override, our own
// iframe got blocked by our own headers (confirmed locally:
// net::ERR_BLOCKED_BY_RESPONSE). Only same-origin framing is allowed here,
// and only for this one route; every other route keeps the strict default.
const viewFrameCsp = csp.replace("frame-ancestors 'none'", "frame-ancestors 'self'")
const viewHeaders = securityHeaders.map(h =>
  h.key === 'X-Frame-Options' ? { key: h.key, value: 'SAMEORIGIN' } :
  h.key === 'Content-Security-Policy' ? { key: h.key, value: viewFrameCsp } :
  h
)

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript source (no build step) — Next
  // only transpiles files inside the app by default, so anything imported
  // from these needs to be explicitly opted in.
  transpilePackages: ['@pshq/api-client', '@pshq/database', '@pshq/ui'],
  experimental: {
    serverActions: {
      // Server Actions default to a 1MB request body. The support ticket
      // reply form accepts images up to 5MB, so any attachment over 1MB was
      // rejected by the framework before the action ever ran — the request
      // failed outright and the user was thrown to the application error
      // page. Phone photos are routinely 2MB to 5MB, so this hit almost
      // every real attachment. Kept slightly above the 5MB app-level check
      // so that check is what rejects oversized files, with a readable
      // message, rather than the transport layer.
      bodySizeLimit: '6mb',
    },
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      { source: '/api/view/:contentId*', headers: viewHeaders },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "productslicehq",

  project: "javascript-nextjs",

  // Always silent — without SENTRY_AUTH_TOKEN set in Vercel, the plugin
  // skips source map upload and would otherwise print a loud warning on
  // every build that reads like a build error. Error capture itself still
  // works fine without this token; it only affects de-minified stack
  // traces in the Sentry dashboard.
  silent: true,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
