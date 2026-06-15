// Error tracking + monitoring
// To enable Sentry: npm install @sentry/nextjs, add SENTRY_DSN env var, run `npx @sentry/wizard`

interface ErrorContext {
  user?: { id?: string; email?: string };
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
}

export function captureError(error: Error | unknown, context?: ErrorContext) {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!SENTRY_DSN) {
    // No Sentry — log locally
    if (typeof window !== 'undefined') {
      console.error('[ZOLO Error]', error, context);
    }
    return;
  }

  // Sentry available — would send here
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.captureException(error, { contexts: { ...context } });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!SENTRY_DSN) {
    if (typeof window !== 'undefined') console.log(`[ZOLO ${level.toUpperCase()}]`, message);
    return;
  }
  // Sentry.captureMessage(message, level);
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  // For analytics — Plausible, GA, PostHog etc.
  if (typeof window === 'undefined') return;
  // Send to your analytics provider
  if (process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) {
    // Plausible integration
    const plausible = (window as unknown as { plausible?: (name: string, opts?: { props: Record<string, unknown> }) => void }).plausible;
    plausible?.(eventName, { props: properties || {} });
  }
}
