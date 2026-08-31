// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://8dbadd8f645df9199e5c933591d53c78@o4511589903499264.ingest.de.sentry.io/4511589905662032",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Sample a fraction of traces to control volume/cost under real traffic.
  tracesSampleRate: 0.1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Sample sessions lightly, but always capture replay around an actual
  // error — that's the useful signal for debugging a live crash.
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Do not send IP addresses, emails, or other user PII to Sentry.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
