import axios from 'axios';

export type ApiErrorBody = {
  success?: boolean;
  error?: string;
  message?: string;
  code?: string;
  field?: string;
};

export function getApiErrorBody(error: unknown): ApiErrorBody | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.data as ApiErrorBody | undefined;
  }
  return undefined;
}

export function getApiErrorCode(error: unknown): string | undefined {
  return getApiErrorBody(error)?.code;
}

export function getApiErrorMessage(error: unknown): string {
  const body = getApiErrorBody(error);
  if (body?.message) return String(body.message);
  if (body?.error) return String(body.error);

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Connection error. Please check your internet connection and try again.';
    }
    return error.message || 'Request failed';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function isEmailExistsError(error: unknown): boolean {
  return getApiErrorCode(error) === 'EMAIL_EXISTS';
}

export function isInvalidCredentialsError(error: unknown): boolean {
  return getApiErrorCode(error) === 'INVALID_CREDENTIALS';
}
