import { Platform } from 'react-native';
import { getApiErrorMessage } from '@/utils/apiError';
import { config } from '@/config/env';
import i18n, { isRTLLanguage } from '@/i18n';

const appPackage = require('../../package.json') as { version?: string };

export type AnalyticsPropertyValue = string | number | boolean;

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue | undefined>;

export function getAppVersion(): string {
  return appPackage.version || '1.0.4';
}

export function getBuildNumber(): string {
  return config.APP_BUILD_NUMBER;
}

export function maskProjectKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return '***';
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
}

export function buildGlobalProperties(plan: 'free' | 'premium' = 'free'): AnalyticsProperties {
  const language = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  return {
    platform: Platform.OS,
    language,
    plan,
    appVersion: getAppVersion(),
    buildNumber: getBuildNumber(),
    isRTL: isRTLLanguage(i18n.language),
  };
}

export function sanitizeProperties(
  properties?: Record<string, AnalyticsPropertyValue | undefined>
): AnalyticsProperties {
  if (!properties) return {};
  const clean: AnalyticsProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) clean[key] = value;
  }
  return clean;
}

export function extractFailureProps(error: unknown): AnalyticsProperties {
  const reason = getApiErrorMessage(error);
  const axiosError = error as {
    response?: { status?: number; data?: { provider?: string; code?: string } };
  };
  const statusCode = axiosError.response?.status;
  const provider = axiosError.response?.data?.provider;
  const props: AnalyticsProperties = { reason };
  if (statusCode != null) props.statusCode = statusCode;
  if (provider) props.provider = provider;
  return props;
}
