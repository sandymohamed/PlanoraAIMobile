import { Platform } from 'react-native';

/**
 * Your PC's LAN IPv4 (same Wi‑Fi as the phone). Run `ipconfig` on Windows to find it.
 * Android emulator uses 10.0.2.2 instead — set USE_ANDROID_EMULATOR=true when using emulator.
 */
const DEV_MACHINE_IP = '192.168.1.14';
const API_PORT = 3001;
const USE_ANDROID_EMULATOR = false;

function getDevApiHost(): string {
  if (Platform.OS === 'android') {
    return USE_ANDROID_EMULATOR ? '10.0.2.2' : DEV_MACHINE_IP;
  }
  return 'localhost';
}

const devBase = `http://${getDevApiHost()}:${API_PORT}`;

export const config = {
  API_BASE_URL: __DEV__
    ? `${devBase}/api/v1`
    : process.env.API_BASE_URL || `${devBase}/api/v1`,
  API_ROOT_URL: __DEV__ ? devBase : process.env.API_ROOT_URL || devBase,
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY || '',
  POSTHOG_HOST: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
  APP_NAME: 'Planora AI',
};

if (__DEV__) {
  console.log('[Planora] API_BASE_URL =', config.API_BASE_URL);
}
