/**
 * Sentry (optional). After base install works:
 *   npm run install:analytics
 *   Set SENTRY_DSN in src/config/env.ts
 *
 * Captures JS crashes (Sentry.wrap), navigation crashes (error boundary),
 * and API failures (see apiClient). PII is scrubbed in beforeSend.
 */
import React from 'react';
import { config } from '@/config/env';
import { logger } from '@/utils/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentryRef: any = null;

const SENSITIVE_KEYS = [
  'password',
  'newpassword',
  'currentpassword',
  'otp',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'apikey',
];

function isSensitive(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z]/g, '');
  return SENSITIVE_KEYS.some((s) => k.includes(s));
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitive(k) ? '[REDACTED]' : scrub(v, depth + 1);
    }
    return out;
  }
  return value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function beforeSend(event: any): any {
  try {
    if (event?.request?.headers) event.request.headers = scrub(event.request.headers);
    if (event?.request?.data) event.request.data = scrub(event.request.data);
    if (event?.extra) event.extra = scrub(event.extra);
    if (event?.contexts) event.contexts = scrub(event.contexts);
  } catch {
    /* never break reporting */
  }
  return event;
}

export function initSentry(): void {
  if (!config.SENTRY_DSN) return;
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: config.SENTRY_DSN,
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
      beforeSend,
    });
    SentryRef = Sentry;
  } catch {
    logger.warn('[Planora] @sentry/react-native not installed — skip Sentry');
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!SentryRef) return;
  try {
    if (context) {
      SentryRef.withScope?.((scope: { setContext: (k: string, v: unknown) => void }) => {
        scope.setContext('details', scrub(context));
        SentryRef.captureException?.(error);
      });
    } else {
      SentryRef.captureException?.(error);
    }
  } catch {
    /* no-op */
  }
}

export function wrapApp(AppComponent: React.ComponentType) {
  if (!config.SENTRY_DSN) return AppComponent;
  try {
    const Sentry = require('@sentry/react-native');
    return Sentry.wrap(AppComponent);
  } catch {
    return AppComponent;
  }
}
