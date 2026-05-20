/**
 * Sentry (optional). After base install works:
 *   npm run install:analytics
 *   Set SENTRY_DSN in src/config/env.ts
 */
import React from 'react';
import { config } from '@/config/env';

export function initSentry(): void {
  if (!config.SENTRY_DSN) return;
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: config.SENTRY_DSN,
      tracesSampleRate: 0.2,
    });
  } catch {
    console.warn('[Planora] @sentry/react-native not installed — skip Sentry');
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
