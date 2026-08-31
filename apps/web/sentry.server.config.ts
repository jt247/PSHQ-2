// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://8dbadd8f645df9199e5c933591d53c78@o4511589903499264.ingest.de.sentry.io/4511589905662032",

  // Sample a fraction of traces to control volume/cost under real traffic.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Do not send IP addresses, emails, or other user PII to Sentry.
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
});
